// Falsk OpenRouter for UI-tester. Lastes inn i Next-serveren via
// NODE_OPTIONS="--import …" fra playwright.config.ts – aldri i produksjon.
// Er bare aktiv når ARTSORAKEL_TEST_MOCK_AI=1.
if (process.env.ARTSORAKEL_TEST_MOCK_AI === "1") {
  const ekteFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://openrouter.ai/")) return ekteFetch(input, init);
    const body = JSON.parse(String(init.body));
    const system = String(body.messages.find((m) => m.role === "system")?.content ?? "");
    // «Spør Artsorakel» (generell assistent uten bilde)
    if (system.includes("Du er Spør Artsorakel")) {
      const sist = String(body.messages.at(-1)?.content ?? "").toLowerCase();
      const svar = sist.includes("sagflis")
        ? "Sagflis ved vinduer kan tyde på stokkmaur, som kan skade treverk. Det er lurt å få en fagperson til å se på det.\n[[KONTAKT_OCAB]]"
        : sist.includes("store maur")
          ? "Store maur ved vinduet kan være stokkmaur, men også andre arter. Ta gjerne et bilde, så kan bildeanalysen gi et sikrere svar.\n[[ANALYSER_BILDE]]"
        : sist.includes("krafsing")
          ? "Krafsing på loftet kan komme fra mus, rotte eller mår. Når på døgnet hører du det, og har du sett ekskrementer?"
          : "Takk. Ekskrementer på 3–8 mm tyder oftest på mus. Ligger de spredt langs veggene?";
      return new Response(JSON.stringify({ choices: [{ message: { content: svar }, finish_reason: "stop" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // Testtilfelle for bilde uten skadedyr: styres av notatfeltet.
    if (JSON.stringify(body.messages).includes("SKRUE-TEST")) {
      const svar = system.includes("grovsorterer")
        ? '{"gruppe":"Ukjent"}'
        : JSON.stringify({ found: false, name: "Ukjent", latinName: "Ukjent", description: "Bildet viser fire metallskruer.", confidence: 0 });
      return new Response(JSON.stringify({ choices: [{ message: { content: svar }, finish_reason: "stop" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // H1: motstridende og riktige navnepar, styres av notatfeltet.
    const meldinger = JSON.stringify(body.messages);
    const navnepar = meldinger.includes("ANNEN-MOTSTRID-TEST")
      ? { gruppe: "Gnagere", found: false, name: "Ukjent", latinName: "Ukjent", annenArt: { name: "Klatremus", latinName: "Myodes rutilus", confidence: 80, hvorfor: "Rødbrun rygg." } }
      : meldinger.includes("MOTSTRID-TEST")
        ? { gruppe: "Gnagere", name: "Klatremus", latinName: "Myodes rutilus" }
        : meldinger.includes("PELSBILLE-TEST")
          ? { gruppe: "Biller", name: "Pelsbille", latinName: "Attagenus pellio" }
          : meldinger.includes("GENERELL-TEST")
            ? { gruppe: "Gnagere", name: "Mus", latinName: "" }
            : meldinger.includes("SKOGKAKERLAKK-TEST")
              ? { gruppe: "Kakerlakker", name: "Kakerlakk", latinName: "Ectobius sylvestris" }
              : meldinger.includes("MARKKAKERLAKK-TEST")
              ? { gruppe: "Kakerlakker", name: "Kakerlakk", latinName: "Ectobius lapponicus" }
              : meldinger.includes("KAKERLAKK-TEST")
                ? { gruppe: "Kakerlakker", name: "Kakerlakk", latinName: "Periplaneta americana" }
                : null;
    if (navnepar) {
      const { gruppe, ...art } = navnepar;
      const svar = system.includes("grovsorterer")
        ? JSON.stringify({ gruppe })
        : JSON.stringify({ found: true, description: "Testbeskrivelse.", observasjon: "Testobservasjon.", confidence: 92, alternativer: [], ...art });
      return new Response(JSON.stringify({ choices: [{ message: { content: svar }, finish_reason: "stop" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    // Testtilfeller for ekskrementer styres av ord i brukerens beskrivelse.
    const ekskrementSvar = system.includes("UKJENT-TEST")
      ? { found: false, name: "Ukjent", latinName: "Ukjent", description: "x", observasjon: "Runde, 6 mm", confidence: 0,
          annenArt: { name: "Ekorn", latinName: "Sciurus vulgaris", confidence: 70, hvorfor: "Runde" } }
      : system.includes("ROTTE-TEST")
        ? { found: true, name: "Rotte", latinName: "Rattus", description: "Tykke, butte ekskrementer.", observasjon: "15 mm", confidence: 92, alternativer: [] }
        : null;
    const content = ekskrementSvar
      ? JSON.stringify(ekskrementSvar)
      : system.includes("grovsorterer")
      ? '{"gruppe":"Gnagere"}'
      : system.includes("skadedyrassistent")
        ? "Testsvar fra falsk AI."
        : JSON.stringify({
            found: true,
            name: "Husmus",
            latinName: "Mus musculus",
            description: "Liten gråbrun gnager med store ører.",
            observasjon: "Store ører og tynn hale.",
            confidence: 88,
            alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 20, hvorfor: "Ung rotte kan ligne." }],
          });
    return new Response(
      JSON.stringify({
        choices: [{ message: { content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1000, completion_tokens: 50 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };
}
