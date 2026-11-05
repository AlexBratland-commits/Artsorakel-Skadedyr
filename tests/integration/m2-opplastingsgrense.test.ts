/**
 * M2 (revisjon): størrelsesgrensen hvilte bare på Content-Length. Uten
 * headeren (chunked) eller med feil verdi ble hele forespørselen lest inn.
 * Nå telles bytene mens de leses, og lesingen stopper ved grensen.
 * Feilet på main 11c1442 og består etter rettelsen.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAi } from "../helpers/fake-ai";
import { BASE, jpeg, jsonRequest } from "../helpers/requests";

async function ruter() {
  vi.resetModules();
  return {
    analyze: (await import("@/app/api/analyze/route")).POST,
    chat: (await import("@/app/api/ask-about-findings/route")).POST,
    assistent: (await import("@/app/api/assistent/route")).POST,
  };
}

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const MB = 1024 * 1024;

/** Strøm som teller hvor mye som faktisk blir lest. */
function strom(bytes: Uint8Array, bit = 256 * 1024) {
  const lest = { bytes: 0 };
  let pos = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      if (pos >= bytes.length) return c.close();
      const del = bytes.subarray(pos, pos + bit);
      pos += del.length;
      lest.bytes += del.length;
      c.enqueue(del);
    },
  });
  return { body, lest };
}

/** Multipart-skjema med bilde (+ evt. fyll), som rå bytes. */
async function multipart(bilde: Buffer, fyll = 0) {
  const fd = new FormData();
  fd.append("image", new Blob([new Uint8Array(bilde)], { type: "image/jpeg" }), "bilde.jpg");
  fd.append("type", "dyr");
  if (fyll) fd.append("notesAnimal", "x".repeat(fyll));
  const r = new Request(BASE, { method: "POST", body: fd });
  return { bytes: new Uint8Array(await r.arrayBuffer()), type: r.headers.get("content-type")! };
}

function forespørsel(path: string, body: ReadableStream<Uint8Array>, headers: Record<string, string>) {
  return new NextRequest(`${BASE}${path}`, {
    method: "POST",
    body,
    headers: { "x-forwarded-for": "203.0.113.30", ...headers },
    duplex: "half",
  });
}

describe("M2: analyse – grensen gjelder uansett Content-Length", () => {
  it("for stor forespørsel uten Content-Length avvises med 413, uten å lese alt og uten AI-kall", async () => {
    const ai = installFakeAi();
    const { analyze } = await ruter();
    const { bytes, type } = await multipart(await jpeg(1), 20 * MB);
    const { body, lest } = strom(bytes);
    const res = await analyze(forespørsel("/api/analyze", body, { "content-type": type }));
    expect(res.status).toBe(413);
    expect(lest.bytes).toBeLessThan(bytes.length);
    expect(lest.bytes).toBeLessThanOrEqual(16 * MB + 512 * 1024);
    expect(ai.calls).toHaveLength(0);
  });

  it("for stor forespørsel med for lav Content-Length avvises med 413", async () => {
    const ai = installFakeAi();
    const { analyze } = await ruter();
    const { bytes, type } = await multipart(await jpeg(2), 20 * MB);
    const { body, lest } = strom(bytes);
    const res = await analyze(forespørsel("/api/analyze", body, { "content-type": type, "content-length": "1000" }));
    expect(res.status).toBe(413);
    expect(lest.bytes).toBeLessThan(bytes.length);
    expect(ai.calls).toHaveLength(0);
  });

  it("for stor forespørsel med riktig Content-Length avvises før noe leses (som før)", async () => {
    installFakeAi();
    const { analyze } = await ruter();
    const { bytes, type } = await multipart(await jpeg(3), 20 * MB);
    const { body, lest } = strom(bytes);
    const res = await analyze(forespørsel("/api/analyze", body, { "content-type": type, "content-length": String(bytes.length) }));
    expect(res.status).toBe(413);
    expect(lest.bytes).toBeLessThanOrEqual(256 * 1024); // strømmen henter én bit av seg selv
  });

  it("vanlig bilde uten Content-Length virker som før", async () => {
    const ai = installFakeAi();
    const { analyze } = await ruter();
    const { bytes, type } = await multipart(await jpeg(4));
    const res = await analyze(forespørsel("/api/analyze", strom(bytes).body, { "content-type": type }));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Husmus");
    expect(ai.calls.length).toBeGreaterThan(0);
  });

  it("vanlig bilde med for høy Content-Length virker (grensen gjelder faktisk innhold)", async () => {
    installFakeAi();
    const { analyze } = await ruter();
    const { bytes, type } = await multipart(await jpeg(5));
    const res = await analyze(forespørsel("/api/analyze", strom(bytes).body, { "content-type": type, "content-length": String(bytes.length + 10) }));
    expect([200, 400]).toContain(res.status);
  });
});

describe("M2: chat – JSON-grensen gjelder uansett Content-Length", () => {
  for (const [navn, path, rute] of [
    ["funn-chat", "/api/ask-about-findings", "chat"],
    ["Spør Artsorakel", "/api/assistent", "assistent"],
  ] as const) {
    it(`${navn}: for stor JSON uten Content-Length avvises, uten AI-kall`, async () => {
      const ai = installFakeAi();
      const r = await ruter();
      const json = new TextEncoder().encode(JSON.stringify({ messages: [{ role: "user", content: "x".repeat(200 * 1024) }] }));
      const { body, lest } = strom(json, 16 * 1024);
      const res = await r[rute](forespørsel(path, body, { "content-type": "application/json" }));
      expect(res.status).toBe(400);
      expect(lest.bytes).toBeLessThan(json.length);
      expect(ai.calls).toHaveLength(0);
    });
  }

  it("vanlig chat uten Content-Length virker", async () => {
    installFakeAi();
    const r = await ruter();
    const json = new TextEncoder().encode(JSON.stringify({ messages: [{ role: "user", content: "Jeg har mus på kjøkkenet" }] }));
    const res = await r.assistent(forespørsel("/api/assistent", strom(json).body, { "content-type": "application/json" }));
    expect(res.status).toBe(200);
  });

  it("vanlig chat med Content-Length virker som før", async () => {
    installFakeAi();
    const r = await ruter();
    const res = await r.assistent(jsonRequest("/api/assistent", { messages: [{ role: "user", content: "Jeg har mus på kjøkkenet" }] }));
    expect(res.status).toBe(200);
  });
});
