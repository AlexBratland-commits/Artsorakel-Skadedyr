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
    const content = system.includes("grovsorterer")
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
