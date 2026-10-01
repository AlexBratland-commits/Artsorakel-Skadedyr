import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { findPest } from "@/lib/pests";
import { checkRateLimit } from "@/lib/server-store";

export const runtime = "nodejs";
export const maxDuration = 30;

let apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "config.json"), "utf8")
    );
    apiKey = config.OPENROUTER_API_KEY;
  } catch {
    /* env-variabelen er hovedveien */
  }
}

/** Ren tekstmodell – dette kallet trenger ikke syn, og blir billigere uten. */
const MODEL = process.env.OPENROUTER_CHAT_MODEL ?? "openai/gpt-5.6-luna";

const MAX_MESSAGE_CHARS = 500;
const MAX_TURNS = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Tjenesten er ikke konfigurert." }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "ukjent";
  // Egen kvote for chat, uavhengig av bildeanalysene.
  const limit = checkRateLimit(`chat:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Du har stilt mange spørsmål den siste timen. Prøv igjen senere." },
      { status: 429 }
    );
  }

  let body: { art?: string; messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  // Klienten styrer innholdet – sjekk formen før vi kaller metoder på det.
  if (
    typeof body !== "object" ||
    body === null ||
    (body.art !== undefined && typeof body.art !== "string")
  ) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }

  // Chatten finnes bare i sammenheng med et funn. Uten art, ingen samtale.
  const pest = findPest(body.art);
  if (!pest) {
    return NextResponse.json(
      { error: "Chatten er knyttet til et artsfunn. Analyser et bilde først." },
      { status: 400 }
    );
  }

  if (body.messages !== undefined && !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m): m is ChatMessage =>
        (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string"
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Mangler spørsmål." }, { status: 400 });
  }

  const system = `Du svarer på spørsmål for Ocab om ett bestemt funn: ${pest.norsk} (${pest.latin}).

DETTE VET VI OM ARTEN
Kjennetegn: ${pest.kjennetegn}
Utbredelse: ${pest.utbredelse}
Aktiv: ${pest.sesong}
Alvorlighet: ${pest.alvorlighet}
Anbefalte tiltak: ${pest.tiltak.join(" | ")}
${pest.forveksles?.length ? `Forveksles med: ${pest.forveksles.join(" | ")}` : ""}

RAMMER FOR SVARENE
- Svar bare på spørsmål om dette funnet: arten, hvor farlig den er, hva brukeren gjør nå, når det er verdt å tilkalle fagfolk. Får du spørsmål om noe annet, si vennlig at du bare kan hjelpe med dette funnet, og foreslå at de kontakter Ocab.
- Anbefal aldri konkrete kjemiske midler, doser eller egenbehandling med pesticider. Yrkesmessig bruk av slike midler krever godkjenning i Norge. Vis til godkjent skadedyrbekjemper.
- Helsespørsmål (bitt, allergi, smitte) besvares kort og generelt, med henvisning til lege eller legevakt.
- Spørsmål om ansvar, husleie, forsikring og fredede arter: forklar hovedregelen kort, og vis til huseier, forsikringsselskapet eller kommunen. Du gir ikke juridiske råd.
- Er du usikker, si det. Ikke gjett på tall, priser eller frister.
- Prisoverslag på oppdrag skal du aldri gi – be dem kontakte Ocab for befaring.
- Svar på norsk bokmål, i vanlig samtaletone. Maks 120 ord. Ingen emoji, ingen overskrifter.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

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
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.3,
        max_tokens: 800,
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      console.error("❌ Chat-kall feilet:", response.status);
      return NextResponse.json(
        { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const valg = data?.choices?.[0];
    const svar: string = valg?.message?.content?.trim() ?? "";
    const finishReason: string = valg?.finish_reason ?? "ukjent";

    // Denne linjen avgjør hvor et avkuttet svar blir kuttet.
    // finish_reason "length" = modellen gikk tom for tokens.
    // "stop" med kort tekst = modellen svarte kort med vilje.
    // Full tekst her, men kort i nettleseren = feil i utlistingen.
    console.log(
      `💬 Chat om ${pest.norsk}: ${svar.length} tegn, finish_reason=${finishReason}`
    );

    if (!svar) {
      return NextResponse.json(
        { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
        { status: 502 }
      );
    }

    return NextResponse.json({ svar, avkuttet: finishReason === "length" });
  } catch {
    return NextResponse.json(
      { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
      { status: 504 }
    );
  }
}