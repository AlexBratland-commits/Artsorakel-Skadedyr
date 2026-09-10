import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

import {
  PESTS,
  PEST_PROMPT_LIST,
  GROUP_PROMPT_LIST,
  groupPromptList,
  focusForGroup,
  findGroup,
  findPest,
  fhiUrl,
} from "@/lib/pests";
import { LOCATIONS, type AnalysisResult, type Candidate, type Severity } from "@/lib/types";
import { checkRateLimit, getCached, setCached, RATE_LIMIT } from "@/lib/server-store";

export const runtime = "nodejs"; // sharp krever Node-runtime, ikke Edge
export const maxDuration = 30;

// ── API-nøkkel (uendret logikk: env først, så config.json) ───────────────
let apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  try {
    const configPath = path.join(process.cwd(), "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    apiKey = config.OPENROUTER_API_KEY;
    console.log("✅ API-nøkkel lastet fra config.json");
  } catch {
    console.warn("⚠️  Fant ingen config.json – bruker OPENROUTER_API_KEY fra miljøet");
  }
}

/** Synsmodell for bildeanalyse – kan overstyres med OPENROUTER_VISION_MODEL. */
const MODEL = process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-3.7-flash";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|heic|heif|gif|avif|tiff)$/i;

const UNKNOWN: AnalysisResult = {
  found: false,
  name: "Ukjent",
  latinName: "Ukjent",
  description: "Vi klarte ikke å artsbestemme dyret på dette bildet.",
  severity: "lav",
  fhiSlug: "ukjent",
  confidence: 0,
  tiltak: [
    "Ta et nytt bilde nærmere dyret, med god belysning og skarpt fokus",
    "Legg noe kjent ved siden av for størrelse, for eksempel en mynt eller fyrstikk",
    "Oppgi hvor du fant dyret – det skiller arter som ligner på hverandre",
  ],
  alternativer: [],
  fhiUrl: fhiUrl(),
};

const GROUP_SYSTEM_PROMPT = `Du er en grovsorterer for Ocab, et norsk skadedyrfirma. Du får ett bilde og skal bare velge hvilken hovedgruppe dyret tilhører.

GRUPPER
${GROUP_PROMPT_LIST}

REGLER
1. Velg én og bare én gruppe fra listen over – den som passer best.
2. Er du usikker, velg den mest sannsynlige. Ser du ikke noe dyr, svar "Ukjent".

SVARFORMAT – kun gyldig JSON, ingen forklaring rundt:
{"gruppe":"Gruppenavn fra listen"}`;

function buildSystemPrompt(speciesList: string, focus: string): string {
  return `Du er artsbestemmer for Ocab, et norsk skadedyrfirma. Du får ett bilde og skal identifisere dyret.

REGLER
1. Bruk kun norske navn fra listen under. Passer ingen av dem, svarer du "Ukjent".
2. Gjett aldri for å være hjelpsom. Er du i tvil mellom to arter, velg den som passer stedet best og senk "confidence".
3. "confidence" er hvor sikker du faktisk er, 0–100. Uskarpt bilde, dyret langt unna eller kjennetegn som ikke synes skal gi under 50.
4. Er dyret for lite til å artsbestemmes på foto (midd, støvlus), si det i beskrivelsen og hold confidence lav.
5. Beskrivelsen skal peke på hva du faktisk ser på bildet: størrelse, farge, form, antall bein, vinger, antenner, haletråder. To setninger, på norsk bokmål, uten "jeg" eller "AI".

HVA DU SKAL SE ETTER PÅ BILDET
${focus}

ARTER
${speciesList}

SVARFORMAT – kun gyldig JSON, ingen forklaring rundt:
{"found":true,"name":"Norsk navn fra listen","latinName":"Latinsk navn fra listen","description":"To setninger om det du ser","observasjon":"Kort hva du faktisk ser på bildet","confidence":0-100,"alternativer":[{"name":"Norsk navn","latinName":"Latinsk navn","confidence":0-100,"hvorfor":"Hvorfor dette kan være riktig"}]}

"alternativer" er de 1–3 artene som ligner mest etter hovedforslaget, sortert fallende på confidence. Er du sikker, kan listen være tom.
Ukjent art: {"found":false,"name":"Ukjent","latinName":"Ukjent","description":"...","observasjon":"...","confidence":0}`;
}

export async function POST(request: NextRequest) {
  // ── CSRF: skjemaposter med FormData utløser ikke preflight, så vi
  //    sjekker Origin mot Host selv.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Ugyldig opprinnelse." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Ugyldig opprinnelse." }, { status: 403 });
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Tjenesten er ikke konfigurert. Kontakt Ocab." },
      { status: 500 }
    );
  }

  // ── Rate limit per IP ──────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "ukjent";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    const minutter = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `Du har brukt alle ${RATE_LIMIT.MAX_REQUESTS} analysene denne timen. Prøv igjen om ${minutter} minutter.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const location = String(formData.get("location") ?? "");
    const storrelse = String(formData.get("storrelse") ?? "");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Ingen bildefil ble sendt med." }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Bildet er for stort. Maks 15 MB." },
        { status: 413 }
      );
    }
    if (image.type && !ALLOWED_TYPES.test(image.type)) {
      return NextResponse.json(
        { error: "Filtypen støttes ikke. Bruk JPG, PNG, WebP eller HEIC." },
        { status: 415 }
      );
    }

    const inputBuffer = Buffer.from(await image.arrayBuffer());

    // ── Cache: samme bilde + samme sted gir samme svar ───────────────────
    const hash = crypto
      .createHash("sha256")
      .update(inputBuffer)
      .update(location)
      .update(storrelse)
      .digest("hex");

    const cached = getCached(hash);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // ── Normaliser til JPEG ─────────────────────────────────────────────
    let jpegBuffer: Buffer;
    try {
      jpegBuffer = await sharp(inputBuffer)
        .rotate() // følg EXIF-orientering
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer();
    } catch (convError) {
      console.error("❌ sharp klarte ikke å lese bildet:", convError);
      // HEIC støttes ikke av alle sharp-bygg. Er filen allerede JPEG,
      // sender vi den som den er i stedet for å gi opp.
      if (/^image\/jpe?g$/i.test(image.type)) {
        jpegBuffer = inputBuffer;
      } else {
        return NextResponse.json(
          {
            error:
              "Bildeformatet kunne ikke leses. Ta bildet på nytt, eller lagre det som JPG først.",
          },
          { status: 415 }
        );
      }
    }

    const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
    const locationText = buildLocationText(location);
    const sizeText = buildSizeText(storrelse);
    const imageContent = { type: "image_url", image_url: { url: base64Image, detail: "high" } };

    // ── Steg 1: finn hovedgruppe ────────────────────────────────────────
    // Gruppefilteret gjør at et pattedyr bare konkurrerer mot andre pattedyr
    // i steg 2 – ikke mot 40 insekter.
    const groupOutcome = await callModel(
      GROUP_SYSTEM_PROMPT,
      [
        {
          type: "text",
          text: `Velg hvilken hovedgruppe dyret på bildet tilhører.${locationText}${sizeText} Svar kun med JSON.`,
        },
        imageContent,
      ],
      { maxTokens: 60, timeoutMs: 10_000 }
    );

    if (!groupOutcome.ok) return modelError(groupOutcome.reason);

    const gruppe = findGroup(groupOutcome.json?.gruppe);
    const speciesList = gruppe ? groupPromptList(gruppe) : PEST_PROMPT_LIST;
    const focus = focusForGroup(gruppe);

    // ── Steg 2: velg art innenfor gruppen ───────────────────────────────
    const speciesOutcome = await callModel(
      buildSystemPrompt(speciesList, focus),
      [
        {
          type: "text",
          text: `Artsbestem dyret på bildet.${locationText}${sizeText} Svar kun med JSON.`,
        },
        imageContent,
      ],
      { maxTokens: 700, timeoutMs: 15_000 }
    );

    if (!speciesOutcome.ok) return modelError(speciesOutcome.reason);

    const result = speciesOutcome.json ? enrich(speciesOutcome.json) : UNKNOWN;
    setCached(hash, result);

    return NextResponse.json(result, {
      headers: { "X-RateLimit-Remaining": String(limit.remaining) },
    });
  } catch (error) {
    console.error("❌ Uventet feil i /api/analyze:", error);
    return NextResponse.json(
      { error: "Noe gikk galt under analysen. Prøv igjen." },
      { status: 500 }
    );
  }
}

// ── Hjelpere ─────────────────────────────────────────────────────────────

function buildLocationText(location: string): string {
  const match = LOCATIONS.find((l) => l.value === location);
  if (!match) return "";
  return ` Dyret ble funnet ${match.prompt} – bruk det til å skille arter som ligner.`;
}

function buildSizeText(storrelse: string): string {
  if (!storrelse) return "";
  return ` Oppgitt størrelse: ${storrelse}. Bruk størrelsen til å skille arter som ligner.`;
}

function parseJson(content: string): Record<string, unknown> | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// ── Modellkall og hjelpere for to-stegs prosessen ───────────────────────

type CallOutcome =
  | { ok: true; json: Record<string, unknown> | null }
  | { ok: false; reason: "timeout" | "rate_limit" | "http" | "network" };

async function callModel(
  system: string,
  userContent: unknown[],
  opts: { maxTokens: number; timeoutMs: number }
): Promise<CallOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Ocab Artsbestemmer",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: opts.maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("❌ OpenRouter svarte", response.status, detail.slice(0, 500));
      return { ok: false, reason: response.status === 429 ? "rate_limit" : "http" };
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, json: parseJson(raw) };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) {
      console.error("⏱️ OpenRouter-kall tok for lang tid");
      return { ok: false, reason: "timeout" };
    }
    console.error("❌ OpenRouter-kall feilet:", err);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

function modelError(reason: string): NextResponse {
  switch (reason) {
    case "timeout":
      return NextResponse.json(
        { error: "Analysen tok for lang tid. Prøv igjen." },
        { status: 504 }
      );
    case "rate_limit":
      return NextResponse.json(
        { error: "Analysetjenesten er overbelastet akkurat nå. Prøv igjen om litt." },
        { status: 502 }
      );
    case "network":
      return NextResponse.json(
        {
          error:
            "Fikk ikke kontakt med analysetjenesten. Sjekk nettforbindelsen og prøv igjen.",
        },
        { status: 504 }
      );
    default:
      return NextResponse.json(
        { error: "Analysen feilet. Prøv igjen om litt." },
        { status: 502 }
      );
  }
}

/** Mapper modellens alternativ-liste til kjente arter, sortert fallende. */
function parseAlternatives(raw: unknown): Candidate[] {
  if (!Array.isArray(raw)) return [];
  const out: Candidate[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    const latinName = typeof rec.latinName === "string" ? rec.latinName : "";
    const pest = findPest(name) ?? findPest(latinName);
    if (!pest) continue;

    let confidence = Number(rec.confidence);
    if (!Number.isFinite(confidence)) confidence = 0;
    confidence = Math.min(100, Math.max(0, Math.round(confidence)));

    const hvorfor = typeof rec.hvorfor === "string" ? rec.hvorfor.trim() : "";
    out.push({ name: pest.norsk, latinName: pest.latin, confidence, hvorfor });
  }

  out.sort((a, b) => b.confidence - a.confidence);
  return out;
}

/**
 * Modellen kan finne på navn som ikke står i listen. Vi stoler bare på
 * identifikasjonen hvis den lar seg slå opp – ellers blir svaret Ukjent.
 * Alvorlighet, tiltak, utbredelse og sesong tar vi fra vår egen database,
 * ikke fra modellen.
 */
function enrich(raw: Record<string, unknown>): AnalysisResult {
  const name = typeof raw.name === "string" ? raw.name : "";
  const pest = findPest(name) ?? findPest(String(raw.latinName ?? ""));
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : "";
  const observasjon =
    typeof raw.observasjon === "string" && raw.observasjon.trim().length > 0
      ? raw.observasjon.trim()
      : undefined;

  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 55;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));

  if (!pest || raw.found === false) {
    return { ...UNKNOWN, description: description || UNKNOWN.description };
  }

  const severity: Severity = pest.alvorlighet;
  const alternativer = parseAlternatives(raw.alternativer).filter(
    (a) => a.name !== pest.norsk
  );

  return {
    found: true,
    name: pest.norsk,
    latinName: pest.latin,
    description: description || pest.kjennetegn,
    severity,
    fhiSlug: pest.slug,
    confidence,
    observasjon,
    alternativer,
    gruppe: pest.gruppe,
    tiltak: pest.tiltak,
    utbredelse: pest.utbredelse,
    sesong: pest.sesong,
    forveksles: pest.forveksles,
    fhiUrl: fhiUrl(pest.slug),
  };
}

// Eksporteres for enkel sanity-sjekk i tester
export const _internal = { enrich, parseJson, parseAlternatives, PESTS };