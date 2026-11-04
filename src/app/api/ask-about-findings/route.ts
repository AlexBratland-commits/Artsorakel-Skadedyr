import { NextRequest, NextResponse } from "next/server";

import { findPest, findPestInGroup } from "@/lib/pests";
import { chatModel, openRouterApiKey } from "@/lib/server/config";
import { kallOpenRouter } from "@/lib/server/openrouter";
import { forStorForesporsel, ipNokkel, klientIp, sjekkOpprinnelse } from "@/lib/server/request-guards";
import { lesTilgang, tilgangNektet } from "@/lib/server/access";
import {
  chatBillettRegel,
  chatDognRegel,
  chatRegler,
  sjekkGrenser,
  type GrenseResultat,
} from "@/lib/server/limits";
import { lesChatBillett, signerChatSvar, verifiserChatSvar } from "@/lib/server/chat-ticket";
import { rensTekst } from "@/lib/server/validation";
import { loggHendelse } from "@/lib/server/log";
import { erHeltUtenforFaget, UTENFOR_FAGET_SVAR } from "@/lib/server/chat-tema";
import { grensekontrollUtilgjengelig, kostnadsrammeNaadd, medGrensekontroll, saldoBruktOpp } from "@/lib/server/svar";
import { sjekkSikkerhetsoppsett } from "@/lib/server/oppsett";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGE_CHARS = 500;
const MAX_TURNS = 12;
/** Tak på hele forespørselen. 12 meldinger à maks ~4000 tegn er god margin. */
const MAX_BODY_BYTES = 64 * 1024;
/** Lengste chatsvar vi tar imot tilbake i historikken (for å sjekke signaturen). */
const MAX_ASSISTANT_CHARS = 6000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ugyldig(error = "Ugyldig forespørsel.", kode?: string): NextResponse {
  return NextResponse.json(kode ? { error, kode } : { error }, { status: 400 });
}

function grenseSvar(grense: Extract<GrenseResultat, { ok: false }>): NextResponse {
  loggHendelse("grense", { rute: "chat", regel: grense.regel });
  const headers = { "Retry-After": String(grense.retryAfterSeconds) };
  const error =
    grense.regel === "dogn"
      ? "Chatten har nådd dagens grense. Prøv igjen i morgen, eller ring Ocab."
      : grense.regel === "billett"
        ? "Du har stilt mange spørsmål om dette funnet. Ring Ocab hvis du trenger mer hjelp."
        : "Du har stilt mange spørsmål den siste timen. Prøv igjen senere.";
  return NextResponse.json({ error }, { status: grense.regel === "dogn" ? 503 : 429, headers });
}

export async function POST(request: NextRequest) {
  const ikkeKlar = sjekkSikkerhetsoppsett("chat");
  if (ikkeKlar) return ikkeKlar;
  return medGrensekontroll("chat", () => svarPaaSporsmal(request));
}

async function svarPaaSporsmal(request: NextRequest): Promise<NextResponse> {
  const fremmed = sjekkOpprinnelse(request);
  if (fremmed) return fremmed;

  const apiKey = openRouterApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Tjenesten er ikke konfigurert." }, { status: 500 });
  }

  const tilgang = lesTilgang(request);
  if (tilgang.kreves && !tilgang.ok) return tilgangNektet();

  // Egen kvote for chat, uavhengig av bildeanalysene.
  const klient = { ipNokkel: ipNokkel(klientIp(request)), sid: tilgang.sid };
  const grense = await sjekkGrenser(chatRegler(klient));
  if (!grense.ok) return grenseSvar(grense);

  if (forStorForesporsel(request, MAX_BODY_BYTES)) return ugyldig();

  let body: { chatToken?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return ugyldig();
  }
  if (typeof body !== "object" || body === null) return ugyldig();

  // ── Chatten gjelder ett bestemt, analysert funn (S5) ──────────────────
  // Arten hentes fra den signerte billetten – ikke fra det klienten
  // skriver i forespørselen (feltene art/gruppe/annenArt ignoreres).
  const billett = lesChatBillett(body.chatToken);
  if (!billett) {
    return NextResponse.json(
      {
        error: "Spørsmål må gjelde et funn du har analysert. Analyser bildet på nytt for å stille spørsmål.",
        kode: "chat_billett_mangler",
      },
      { status: 401 }
    );
  }

  if (!Array.isArray(body.messages)) return ugyldig("Mangler spørsmål.");
  const raa = body.messages.slice(-MAX_TURNS);
  const messages: ChatMessage[] = [];
  for (const m of raa) {
    if (typeof m !== "object" || m === null) return ugyldig();
    const { role, content, sig } = m as { role?: unknown; content?: unknown; sig?: unknown };
    if (typeof content !== "string") return ugyldig();
    if (role === "user") {
      messages.push({ role: "user", content: rensTekst(content, MAX_MESSAGE_CHARS) });
    } else if (role === "assistant") {
      // Tidligere svar må være signert av serveren – ellers kan klienten
      // dikte opp at «assistenten» har lovet å svare på alt.
      if (content.length > MAX_ASSISTANT_CHARS || !verifiserChatSvar(billett.id, content, sig)) {
        loggHendelse("chat_avvist", { grunn: "usignert_svar" });
        return ugyldig("Samtalen kunne ikke bekreftes. Start en ny samtale.", "chat_historikk_ugyldig");
      }
      messages.push({ role: "assistant", content: content.slice(0, MAX_MESSAGE_CHARS) });
    } else {
      return ugyldig();
    }
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== "user" || !messages.at(-1)?.content) {
    return NextResponse.json({ error: "Mangler spørsmål." }, { status: 400 });
  }

  // Helt irrelevante spørsmål (f.eks. «Hvem er kong Harald?») får et fast
  // svar uten AI-kall. Svaret signeres, så samtalen kan fortsette normalt.
  if (erHeltUtenforFaget(messages[messages.length - 1].content)) {
    loggHendelse("chat", { art: "utenfor_faget", svar_tegn: UTENFOR_FAGET_SVAR.length, finish: "regel", tur: messages.length });
    return NextResponse.json({
      svar: UTENFOR_FAGET_SVAR,
      avkuttet: false,
      signatur: signerChatSvar(billett.id, UTENFOR_FAGET_SVAR),
    });
  }

  const perBillett = await sjekkGrenser([chatBillettRegel(billett.id)]);
  if (!perBillett.ok) return grenseSvar(perBillett);
  const dogn = await sjekkGrenser([chatDognRegel()]);
  if (!dogn.ok) return grenseSvar(dogn);

  // Samme navn kan finnes i flere grupper (Brunrotte som dyr og som
  // ekskrementer), så gruppen avgjør hvilken oppføring vi bruker.
  const pest =
    (billett.gruppe ? findPestInGroup(billett.art, billett.gruppe) : undefined) ?? findPest(billett.art);
  // Art AI-en kjente igjen, men som ikke er i databasen. Kort og uten
  // linjeskift, siden den havner i systemprompten.
  const annenArt = billett.annenArt?.replace(/\s+/g, " ").replace(/["\\]/g, "").trim().slice(0, 80) || "";

  const funn = pest
    ? `Funnet er ${pest.norsk} (${pest.latin})${pest.gruppe === "Ekskrementer" ? ", bestemt ut fra ekskrementer" : ""}.

DETTE VET VI OM ARTEN
Kjennetegn: ${pest.kjennetegn}
Utbredelse: ${pest.utbredelse}
Aktiv: ${pest.sesong}
Alvorlighet: ${pest.alvorlighet}
Anbefalte tiltak: ${pest.tiltak.join(" | ")}
${pest.forveksles?.length ? `Forveksles med: ${pest.forveksles.join(" | ")}` : ""}
${pest.notat ? `Viktig: ${pest.notat}` : ""}`
    : annenArt
      ? `Bildeanalysen foreslo "${annenArt}", en art som ikke finnes i Ocabs database. Du har ingen kvalitetssikret informasjon om den, så svar generelt og med forbehold, og anbefal å kontakte Ocab for en sikker vurdering.`
      : `Bildeanalysen klarte ikke å bestemme arten. Hjelp brukeren med generelle råd, med hva de kan se etter for å finne ut hva det er, og med å ta et bedre bilde (nærmere, skarpt, noe kjent ved siden av for størrelse).`;

  const system = `Du er Ocabs skadedyrassistent og svarer på spørsmål etter en bildeanalyse.

FUNNET
${funn}

DETTE KAN DU SVARE PÅ
- Funnet: arten, hvor farlig den er, hva brukeren gjør nå, og når det er verdt å tilkalle fagfolk.
- Generelle spørsmål om skadedyr i og rundt hus og hytte: forebygging, tetting, fukt, hygiene, hvordan man ser om det er flere, arter som ligner, og hva tegn som ekskrementer, gnagespor og sagflis betyr.
- Spørsmål om noe helt annet enn skadedyr (personer, nyheter, politikk, sport, oppskrifter, skole- eller skriveoppgaver, generell kunnskap) svarer du IKKE på innholdsmessig – heller ikke kort. Si i én setning at du er Artsorakels fagassistent for skadedyr, og inviter til et spørsmål om funnet, forebygging eller bekjempelse.

RAMMER FOR SVARENE
- Anbefal aldri gift, kjemiske midler, doser eller egenbehandling med pesticider. Si at man ikke skal bruke gift eller andre kjemikalier før man har snakket med en godkjent skadedyrbekjemper i Ocab. Yrkesmessig bruk av slike midler krever godkjenning i Norge.
- Helsespørsmål (bitt, allergi, smitte) besvares kort og generelt, med henvisning til lege eller legevakt.
- Spørsmål om ansvar, husleie, forsikring og fredede arter: forklar hovedregelen kort, og vis til huseier, forsikringsselskapet eller kommunen. Du gir ikke juridiske råd.
- Råd om tetting: følg tiltakene over. For mus gjelder åpninger fra omtrent 4–6 mm, for rotte fra omtrent 10–14 mm. Si aldri at mindre åpninger er trygge, og anbefal kartlegging før en aktiv inngang tettes, så dyr ikke stenges inne.
- Er du usikker, si det. Ikke gjett på tall, priser eller frister.
- Prisoverslag på oppdrag skal du aldri gi – be dem kontakte Ocab for befaring.
- Svar på norsk bokmål, i vanlig samtaletone. Maks 150 ord. Ingen emoji, ingen overskrifter.`;

  const ai = await kallOpenRouter({
    apiKey,
    rute: "chat",
    steg: "svar",
    model: chatModel(),
    messages: [{ role: "system", content: system }, ...messages],
    temperature: 0.3,
    maxTokens: 1000,
    timeoutMs: 20_000,
  });

  if (!ai.ok && ai.reason === "kostnadsramme") return kostnadsrammeNaadd("chat");
  if (!ai.ok && ai.reason === "grensekontroll") return grensekontrollUtilgjengelig("chat");
  if (!ai.ok && ai.reason === "saldo") return saldoBruktOpp("chat");
  if (!ai.ok) {
    return NextResponse.json(
      { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
      { status: ai.reason === "timeout" || ai.reason === "network" ? 504 : 502 }
    );
  }

  const svar = ai.content.trim();
  // finish_reason "length" = modellen gikk tom for tokens og svaret ble kuttet.
  loggHendelse("chat", {
    art: pest?.norsk ?? (annenArt ? "annen_art" : "ukjent_funn"),
    svar_tegn: svar.length,
    finish: ai.finishReason,
    tur: messages.length,
  });

  if (!svar) {
    return NextResponse.json(
      { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    svar,
    avkuttet: ai.finishReason === "length",
    // Signaturen sendes med tilbake i historikken neste gang (se over).
    signatur: signerChatSvar(billett.id, svar),
  });
}
