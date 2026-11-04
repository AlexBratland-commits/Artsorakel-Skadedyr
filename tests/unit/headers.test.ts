import { describe, expect, it, vi } from "vitest";

async function headersFor(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const { default: config } = await import("../../next.config");
  const regler = await config.headers!();
  const alle = regler.find((r) => r.source === "/(.*)")!.headers;
  return Object.fromEntries(alle.map((h) => [h.key, h.value]));
}

describe("sikkerhetsheadere (S9)", () => {
  it("CSP og grunnleggende headere er satt", async () => {
    const h = await headersFor({ VERCEL: "", NODE_ENV: "production" });
    expect(h["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(h["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(h["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=(self)");
  });

  it("på Vercel: HSTS og upgrade-insecure-requests", async () => {
    const h = await headersFor({ VERCEL: "1", NODE_ENV: "production" });
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(h["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });

  it("med tilgangskode skal appen ikke indekseres av søkemotorer", async () => {
    const h = await headersFor({ ARTSORAKEL_TILGANGSKODE: "kode-1234" });
    expect(h["X-Robots-Tag"]).toBe("noindex, nofollow");
  });

  it("X-Powered-By er slått av og bildeoptimaliseringen er av", async () => {
    vi.resetModules();
    const { default: config } = await import("../../next.config");
    expect(config.poweredByHeader).toBe(false);
    expect(config.images?.unoptimized).toBe(true);
  });
});
