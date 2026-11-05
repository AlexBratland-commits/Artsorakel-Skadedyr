/**
 * M5 fra revisjonen: tidligere chatsvar ble kuttet til 500 tegn før de ble
 * sendt tilbake til modellen, så forbehold på slutten forsvant. Gjelder begge
 * chattene. Feilet på 199dc5e og består etter rettelsen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg, jsonRequest } from "../helpers/requests";

const LANGT_SVAR = "Mus kan forurense mat. ".repeat(40) + "VIKTIG FORBEHOLD: Bruk hansker og munnbind ved rengjøring.";

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

describe("M5: hele tidligere svar når modellen", () => {
  it("funn-chatten", async () => {
    expect(LANGT_SVAR.length).toBeGreaterThan(500);
    const ai = installFakeAi({ chat: LANGT_SVAR });
    const { analyze, chat } = await ruter();
    const r = await (await analyze(analyzeRequest({ image: await jpeg(31) }))).json();
    const s1 = await (await chat(jsonRequest("/api/ask-about-findings", { chatToken: r.chatToken, messages: [{ role: "user", content: "Spm 1" }] }))).json();
    const res = await chat(
      jsonRequest("/api/ask-about-findings", {
        chatToken: r.chatToken,
        messages: [{ role: "user", content: "Spm 1" }, { role: "assistant", content: s1.svar, sig: s1.signatur }, { role: "user", content: "Spm 2" }],
      })
    );
    expect(res.status).toBe(200);
    const sendt = ai.calls.filter((c) => c.kind === "chat").at(-1)!.body.messages.find((m) => m.role === "assistant")!.content;
    expect(sendt).toBe(LANGT_SVAR);
  });

  it("Spør Artsorakel", async () => {
    const ai = installFakeAi({ assistent: LANGT_SVAR });
    const { assistent } = await ruter();
    const s1 = await (await assistent(jsonRequest("/api/assistent", { messages: [{ role: "user", content: "Jeg har mus på kjøkkenet" }] }))).json();
    const res = await assistent(
      jsonRequest("/api/assistent", {
        samtaleToken: s1.samtaleToken,
        messages: [
          { role: "user", content: "Jeg har mus på kjøkkenet" },
          { role: "assistant", content: s1.svar, sig: s1.signatur, kontakt: !!s1.visKontakt, bilde: !!s1.visBilde },
          { role: "user", content: "Hva gjør jeg nå?" },
        ],
      })
    );
    expect(res.status).toBe(200);
    const sendt = ai.calls.filter((c) => c.kind === "assistent").at(-1)!.body.messages.find((m) => m.role === "assistant")!.content;
    expect(sendt).toBe(LANGT_SVAR);
  });

  it("brukerens egne meldinger er fortsatt begrenset til 500 tegn", async () => {
    const ai = installFakeAi();
    const { assistent } = await ruter();
    await assistent(jsonRequest("/api/assistent", { messages: [{ role: "user", content: "mus ".repeat(400) }] }));
    expect(String(ai.calls.at(-1)!.body.messages.at(-1)!.content).length).toBeLessThanOrEqual(500);
  });
});
