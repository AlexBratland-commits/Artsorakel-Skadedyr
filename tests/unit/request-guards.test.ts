import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { forStorForesporsel, ipNokkel, klientIp, sjekkOpprinnelse } from "@/lib/server/request-guards";

const req = (headers: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/analyze", { method: "POST", headers });

describe("klientens IP-adresse (S4)", () => {
  it("på Vercel brukes x-real-ip, ikke en x-forwarded-for klienten har forfalsket", () => {
    vi.stubEnv("VERCEL", "1");
    expect(klientIp(req({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "10.0.0.1" }))).toBe("198.51.100.7");
  });

  it("lokalt brukes x-forwarded-for som før", () => {
    vi.stubEnv("VERCEL", "");
    expect(klientIp(req({ "x-forwarded-for": "203.0.113.5, 10.0.0.2" }))).toBe("203.0.113.5");
    expect(klientIp(req({}))).toBe("ukjent");
  });
});

describe("nøkkel for bruksgrense", () => {
  it("IPv4 brukes som den er", () => {
    expect(ipNokkel("203.0.113.5")).toBe("v4:203.0.113.5");
    expect(ipNokkel("::ffff:203.0.113.5")).toBe("v4:203.0.113.5");
  });

  it("IPv6 grupperes per /64, så adresserotasjon ikke omgår grensen", () => {
    const a = ipNokkel("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    const b = ipNokkel("2001:0db8:0001:0002:1111:2222:3333:4444");
    const c = ipNokkel("2001:db8:1:2::1");
    expect(a).toBe("v6:2001:db8:1:2::/64");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(ipNokkel("2001:db8:1:3::1")).not.toBe(a);
  });

  it("ugyldige verdier gir en trygg, kort nøkkel", () => {
    const k = ipNokkel("<script>alert(1)</script>".repeat(10));
    expect(k.startsWith("annet:")).toBe(true);
    expect(k).not.toMatch(/[<>()]/);
    expect(k.length).toBeLessThanOrEqual(51);
  });
});

describe("opprinnelse og størrelse", () => {
  it("avviser forespørsler fra andre nettsteder", () => {
    expect(sjekkOpprinnelse(req({ origin: "https://evil.example", host: "localhost:3000" }))?.status).toBe(403);
    expect(sjekkOpprinnelse(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBeNull();
  });

  it("oppdager for store forespørsler før innholdet leses", () => {
    expect(forStorForesporsel(req({ "content-length": "60000000" }), 16_000_000)).toBe(true);
    expect(forStorForesporsel(req({ "content-length": "1000" }), 16_000_000)).toBe(false);
  });
});
