/**
 * Testhjelper: starter en ekte, lokal Redis og en liten HTTP-oversetter som
 * tar imot Upstash' REST-format (POST / med kommandoen som JSON-liste) og
 * sender kommandoen videre til Redis. Slik testes appens Lua-skript og
 * atomisitet mot ekte Redis – uten nettilgang til Upstash.
 *
 * Krever at `redis-server` er installert. Testene hoppes over ellers.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import http from "node:http";
import net from "node:net";

export const harRedis = spawnSync("redis-server", ["--version"]).status === 0;

function ledigPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

// ── Minimal RESP-klient ──────────────────────────────────────────────────

function kod(args: string[]): string {
  return `*${args.length}\r\n${args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join("")}`;
}

class RedisFeil extends Error {}

function tolk(buf: Buffer, i: number): [unknown, number] | null {
  if (i >= buf.length) return null;
  const type = String.fromCharCode(buf[i]);
  const slutt = buf.indexOf("\r\n", i);
  if (slutt < 0) return null;
  const linje = buf.subarray(i + 1, slutt).toString();
  const neste = slutt + 2;
  if (type === "+") return [linje, neste];
  if (type === "-") return [new RedisFeil(linje), neste];
  if (type === ":") return [Number(linje), neste];
  if (type === "$") {
    const len = Number(linje);
    if (len < 0) return [null, neste];
    if (buf.length < neste + len + 2) return null;
    return [buf.subarray(neste, neste + len).toString(), neste + len + 2];
  }
  if (type === "*") {
    const n = Number(linje);
    if (n < 0) return [null, neste];
    const ut: unknown[] = [];
    let pos = neste;
    for (let k = 0; k < n; k++) {
      const r = tolk(buf, pos);
      if (!r) return null;
      ut.push(r[0]);
      pos = r[1];
    }
    return [ut, pos];
  }
  throw new Error(`Ukjent RESP-type ${type}`);
}

export function redisKommando(port: number, args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(port, "127.0.0.1");
    let data = Buffer.alloc(0);
    sock.on("connect", () => sock.write(kod(args)));
    sock.on("data", (d) => {
      data = Buffer.concat([data, d]);
      const r = tolk(data, 0);
      if (r) {
        sock.end();
        resolve(r[0]);
      }
    });
    sock.on("error", reject);
  });
}

// ── Redis + Upstash-lik REST-oversetter ──────────────────────────────────

export interface TestRedis {
  port: number;
  url: string;
  token: string;
  /** Stopper bare oversetteren – som om Upstash er nede. */
  stoppRest(): Promise<void>;
  stopp(): Promise<void>;
}

export async function startRedisMedUpstashRest(): Promise<TestRedis> {
  const port = await ledigPort();
  const redis: ChildProcess = spawn("redis-server", ["--port", String(port), "--save", "", "--appendonly", "no"], {
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await redisKommando(port, ["PING"])) === "PONG") break;
    } catch {
      /* ikke klar ennå */
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  const token = "test-token";
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      res.setHeader("content-type", "application/json");
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "WRONGPASS invalid token" }));
        return;
      }
      try {
        const svar = await redisKommando(port, (JSON.parse(body) as unknown[]).map(String));
        if (svar instanceof RedisFeil) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: svar.message }));
        } else {
          res.end(JSON.stringify({ result: svar }));
        }
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const restPort = (server.address() as net.AddressInfo).port;

  let restStoppet = false;
  const stoppRest = () =>
    restStoppet
      ? Promise.resolve()
      : new Promise<void>((r) => {
          restStoppet = true;
          server.closeAllConnections();
          server.close(() => r());
        });

  return {
    port,
    url: `http://127.0.0.1:${restPort}`,
    token,
    stoppRest,
    async stopp() {
      await stoppRest();
      redis.kill();
    },
  };
}
