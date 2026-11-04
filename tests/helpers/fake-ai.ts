import { vi } from "vitest";

/**
 * Falsk OpenRouter for tester. Erstatter global fetch, registrerer hvert
 * kall appen gjør, og svarer med det testen har bestemt. Ingen ekte AI-kall.
 */

export interface FakeCall {
  kind: "group" | "species" | "chat";
  url: string;
  body: {
    model: string;
    max_tokens: number;
    temperature: number;
    messages: { role: string; content: unknown }[];
    response_format?: unknown;
  };
  system: string;
  userText: string;
  imageDataUrl: string;
}

export interface FakeAiOptions {
  group?: unknown;
  species?: unknown;
  chat?: string;
  /** Overstyr hele svaret (status, innhold) for spesielle tester. */
  respond?: (call: FakeCall) => Response | Promise<Response>;
  usage?: Record<string, number>;
}

function classify(system: string): FakeCall["kind"] {
  if (system.includes("grovsorterer")) return "group";
  if (system.includes("skadedyrassistent")) return "chat";
  return "species";
}

export function installFakeAi(options: FakeAiOptions = {}) {
  const calls: FakeCall[] = [];
  const state = { ...options };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://openrouter.ai/")) {
      throw new Error(`Uventet nettverkskall i test: ${url}`);
    }
    const body = JSON.parse(String(init?.body));
    const system = String(body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "");
    const user = body.messages.filter((m: { role: string }) => m.role !== "system");
    const parts = Array.isArray(user[0]?.content) ? user[0].content : [];
    const userText =
      parts.filter((p: { type: string }) => p.type === "text").map((p: { text: string }) => p.text).join("") ||
      user.map((m: { content: unknown }) => String(m.content)).join("\n");
    const imageDataUrl = parts.find((p: { type: string }) => p.type === "image_url")?.image_url?.url ?? "";
    const call: FakeCall = { kind: classify(system), url, body, system, userText, imageDataUrl };
    calls.push(call);

    if (state.respond) return state.respond(call);

    const content =
      call.kind === "group"
        ? JSON.stringify(state.group ?? { gruppe: "Gnagere" })
        : call.kind === "chat"
          ? (state.chat ?? "Testsvar fra falsk AI.")
          : JSON.stringify(
              state.species ?? {
                found: true,
                name: "Husmus",
                latinName: "Mus musculus",
                description: "Liten gråbrun gnager.",
                observasjon: "Store ører, tynn hale.",
                confidence: 90,
                alternativer: [],
              }
            );
    return new Response(
      JSON.stringify({
        choices: [{ message: { content }, finish_reason: "stop" }],
        usage: state.usage ?? { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    fetchMock,
    set(next: FakeAiOptions) {
      Object.assign(state, next);
    },
  };
}

/** Henter bildet appen sendte til AI-en, som Buffer. */
export function imageFromCall(call: FakeCall): Buffer {
  const b64 = call.imageDataUrl.split(",")[1] ?? "";
  return Buffer.from(b64, "base64");
}
