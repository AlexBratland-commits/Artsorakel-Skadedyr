import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BASE } from "../helpers/requests";

async function load() {
  vi.resetModules();
  return import("@/app/api/tilgang/route");
}

const post = (kode: unknown, ip = "203.0.113.30") =>
  new NextRequest(`${BASE}/api/tilgang`, {
    method: "POST",
    body: JSON.stringify({ kode }),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });

const get = (cookie?: string) =>
  new NextRequest(`${BASE}/api/tilgang`, { headers: cookie ? { cookie: `artsorakel_tilgang=${cookie}` } : {} });

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
  vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "test-hemmelighet-for-tilgang");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("tilgangskode", () => {
  it("uten kode satt er appen åpen, som før", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
    const { GET } = await load();
    expect(await (await GET(get())).json()).toEqual({ kreves: false, innlogget: true });
  });

  it("feil kode avvises, riktig kode gir en sikker cookie", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "riktig-kode-123");
    const { GET, POST } = await load();
    expect(await (await GET(get())).json()).toEqual({ kreves: true, innlogget: false });
    expect((await POST(post("feil"))).status).toBe(401);

    const ok = await POST(post("riktig-kode-123"));
    expect(ok.status).toBe(200);
    const satt = ok.headers.get("set-cookie") ?? "";
    expect(satt).toMatch(/HttpOnly/i);
    expect(satt).toMatch(/SameSite=lax/i);
    const cookie = ok.cookies.get("artsorakel_tilgang")!.value;
    expect(await (await GET(get(cookie))).json()).toEqual({ kreves: true, innlogget: true });
  });

  it("en endret cookie godtas ikke", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "riktig-kode-123");
    const { GET, POST } = await load();
    const cookie = (await POST(post("riktig-kode-123"))).cookies.get("artsorakel_tilgang")!.value;
    const [data, sig] = cookie.split(".");
    const tuklet = `${data.slice(0, -2)}AA.${sig}`;
    expect((await (await GET(get(tuklet))).json()).innlogget).toBe(false);
  });

  it("bytte av kode logger ut alle som brukte den gamle", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "gammel-kode-123");
    const { GET, POST } = await load();
    const cookie = (await POST(post("gammel-kode-123"))).cookies.get("artsorakel_tilgang")!.value;
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "ny-kode-456");
    expect((await (await GET(get(cookie))).json()).innlogget).toBe(false);
  });

  it("flere koder samtidig gjør det mulig å bytte kode gradvis", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "gammel-kode-123, ny-kode-456");
    const { GET, POST } = await load();
    const cookie = (await POST(post("gammel-kode-123"))).cookies.get("artsorakel_tilgang")!.value;
    expect((await (await GET(get(cookie))).json()).innlogget).toBe(true);
    expect((await POST(post("ny-kode-456"))).status).toBe(200);
  });

  it("antall forsøk er begrenset, så koden ikke kan gjettes", async () => {
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "riktig-kode-123");
    const { POST } = await load();
    const statuser: number[] = [];
    for (let i = 0; i < 11; i++) statuser.push((await POST(post(`gjett-${i}`))).status);
    expect(statuser.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuser[10]).toBe(429);
    // Også riktig kode stoppes fra samme IP til vinduet er over
    expect((await POST(post("riktig-kode-123"))).status).toBe(429);
  });
});
