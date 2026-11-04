/**
 * Grunnlinje: dokumenterer hvordan /api/analyze oppfører seg mot en falsk AI.
 *
 * - Svarfeltene klienten får (API-kontrakten) skal ikke forsvinne.
 * - Promptene (instruksene til AI-en) skal være byte-for-byte uendret i
 *   leveranse A. Snapshotene ble tatt FØR endringene i leveranse A, så en
 *   utilsiktet endring i identifiseringen får testen til å feile.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg } from "../helpers/requests";

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/analyze/route");
}

const FOUND_KEYS = [
  "alternativer",
  "confidence",
  "description",
  "fhiSlug",
  "fhiUrl",
  "forveksles",
  "found",
  "gruppe",
  "latinName",
  "name",
  "observasjon",
  "sesong",
  "severity",
  "tiltak",
  "usikkerKandidat",
  "utbredelse",
];

describe("/api/analyze – kontrakt og uendrede prompter", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-nokkel-ikke-ekte");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("dyr: to AI-kall, kjent art beriket fra databasen, uendrede felter", async () => {
    const ai = installFakeAi();
    const { POST } = await loadRoute();
    const res = await POST(
      analyzeRequest({
        image: await jpeg(1),
        fields: {
          location: "kjeller",
          storrelse: "5–10 mm (som et riskorn til en ert)",
          notesAnimal: "Løper langs listen om kvelden",
        },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const k of FOUND_KEYS) expect(body).toHaveProperty(k);
    expect(body).toMatchObject({
      found: true,
      name: "Husmus",
      latinName: "Mus musculus",
      severity: "middels",
      gruppe: "Gnagere",
      confidence: 90,
      usikkerKandidat: false,
      fhiSlug: "mus",
    });
    expect(ai.calls.map((c) => c.kind)).toEqual(["group", "species"]);
    expect(ai.calls[0].body.model).toBe("google/gemini-3.7-flash");

    // Promptene skal være identiske med grunnlinjen.
    expect(
      ai.calls.map((c) => ({
        kind: c.kind,
        model: c.body.model,
        max_tokens: c.body.max_tokens,
        temperature: c.body.temperature,
        response_format: c.body.response_format,
        system: c.system,
        userText: c.userText,
      }))
    ).toMatchSnapshot();
  });

  it("ekskrementer: ett AI-kall med ekskrement-prompten", async () => {
    const ai = installFakeAi({
      species: {
        found: true,
        name: "Brunrotte",
        latinName: "Rattus norvegicus",
        description: "Tykke, butte.",
        confidence: 75,
        alternativer: [{ name: "Mus", latinName: "Mus musculus", confidence: 30, hvorfor: "Størrelse" }],
      },
    });
    const { POST } = await loadRoute();
    const res = await POST(
      analyzeRequest({
        image: await jpeg(2),
        fields: {
          type: "ekskrementer",
          location: "loft",
          droppingSize: "15mm+",
          beskrivelse: "Samlet i en klynge ved pipa",
        },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ found: true, name: "Brunrotte", gruppe: "Ekskrementer" });
    expect(body.alternativer.map((a: { name: string }) => a.name)).toEqual(["Mus"]);
    expect(ai.calls.map((c) => c.kind)).toEqual(["species"]);
    expect(
      ai.calls.map((c) => ({ kind: c.kind, max_tokens: c.body.max_tokens, system: c.system, userText: c.userText }))
    ).toMatchSnapshot();
  });

  it("ukjent gruppe i steg 1 gir steg 2 med full artsliste (dagens oppførsel, F5)", async () => {
    const ai = installFakeAi({
      group: { gruppe: "Ukjent" },
      species: { found: false, name: "Ukjent", latinName: "Ukjent", description: "Ingen dyr.", confidence: 0 },
    });
    const { POST } = await loadRoute();
    const res = await POST(analyzeRequest({ image: await jpeg(3) }));
    const body = await res.json();
    expect(body).toMatchObject({ found: false, name: "Ukjent" });
    expect(ai.calls.map((c) => c.kind)).toEqual(["group", "species"]);
    expect(ai.calls[1].system.length).toMatchSnapshot();
  });

  it("uleselig modellsvar gir 502, ikke 'Ukjent'", async () => {
    installFakeAi({
      respond: (call) =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: call.kind === "group" ? '{"gruppe":"Maur"}' : "ikke json" }, finish_reason: "stop" }],
          }),
          { status: 200 }
        ),
    });
    const { POST } = await loadRoute();
    const res = await POST(analyzeRequest({ image: await jpeg(4) }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/lesbart svar/);
  });

  it("mangler bilde gir 400", async () => {
    installFakeAi();
    const { POST } = await loadRoute();
    const res = await POST(analyzeRequest({}));
    expect(res.status).toBe(400);
  });
});
