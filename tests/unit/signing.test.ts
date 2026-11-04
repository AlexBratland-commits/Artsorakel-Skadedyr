import { beforeEach, describe, expect, it, vi } from "vitest";
import { signer, signerTekst, verifiser, verifiserTekst } from "@/lib/server/signing";
import { lagChatBillett, lesChatBillett } from "@/lib/server/chat-ticket";
import type { AnalysisResult } from "@/lib/types";

beforeEach(() => {
  vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "test-hemmelighet-som-er-lang-nok");
});

describe("signering", () => {
  it("godtar uendret innhold og avviser endret innhold eller signatur", () => {
    const t = signer({ art: "Husmus" }, "test");
    expect(verifiser(t, "test")).toEqual({ art: "Husmus" });
    const [data, sig] = t.split(".");
    const endret = Buffer.from(JSON.stringify({ art: "Alt mulig" })).toString("base64url");
    expect(verifiser(`${endret}.${sig}`, "test")).toBeNull();
    expect(verifiser(`${data}.${sig.slice(0, -2)}xx`, "test")).toBeNull();
    expect(verifiser(t, "annet-formaal")).toBeNull();
    expect(verifiser(undefined, "test")).toBeNull();
  });

  it("signatur blir ugyldig når hemmeligheten byttes", () => {
    const sig = signerTekst("hei", "x");
    expect(verifiserTekst("hei", sig, "x")).toBe(true);
    vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "en-helt-annen-hemmelighet");
    expect(verifiserTekst("hei", sig, "x")).toBe(false);
  });
});

describe("chat-billett", () => {
  const funnet = { found: true, name: "Veggedyr", gruppe: "Andre småkryp" } as AnalysisResult;

  it("inneholder arten fra analysen og kan ikke forfalskes", () => {
    const b = lesChatBillett(lagChatBillett(funnet));
    expect(b).toMatchObject({ art: "Veggedyr", gruppe: "Andre småkryp" });
    expect(lesChatBillett("tull.tull")).toBeNull();
  });

  it("utløper", () => {
    vi.useFakeTimers();
    const t = lagChatBillett(funnet);
    vi.advanceTimersByTime(31 * 24 * 3600 * 1000);
    expect(lesChatBillett(t)).toBeNull();
    vi.useRealTimers();
  });
});
