import { NextRequest, NextResponse } from "next/server";

import { chatModel, openRouterApiKey } from "@/lib/server/config";
import { kallOpenRouter } from "@/lib/server/openrouter";
import { forStorForesporsel, ipNokkel, klientIp, sjekkOpprinnelse } from "@/lib/server/request-guards";
import { lesTilgang, tilgangNektet } from "@/lib/server/access";
import { chatDognRegel, chatRegler, sjekkGrenser, type GrenseResultat } from "@/lib/server/limits";
import { rensTekst } from "@/lib/server/validation";
import { loggHendelse } from "@/lib/server/log";
import { erHeltUtenforFaget, UTENFOR_FAGET_SVAR } from "@/lib/server/chat-tema";
import { grensekontrollUtilgjengelig, kostnadsrammeNaadd, medGrensekontroll, saldoBruktOpp } from "@/lib/server/svar";
import { sjekkSikkerhetsoppsett } from "@/lib/server/oppsett";
import {
  byggAssistentPrompt,
  lagSamtale,
  lesMarkorer,
  lesSamtale,
  signerAssistentSvar,
  verifiserAssistentSvar,
} from "@/lib/server/assistent";

/**
 * «Spør Artsorakel» – generell skadedyrassistent uten bilde.
 *
 * Deler bruksgrenser (per time, per minutt, per døgn) med funn-chatten, så
 * den ene ikke kan brukes til å omgå den andre. Hvert AI-kall går gjennom den
 * felles AI-klienten og teller mot den samme kostnadsrammen.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGE_CHARS = 500;
const MAX_TURNS = 12;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ASSISTANT_CHARS = 6000;
/** Tak på antall spørsmål i én samtale. «Ny samtale» starter en ny. */
const SPORSMAL_PER_SAMTALE = 40;
const SAMTALE_TTL = 7 * 24 * 3600;

interface Melding {
  role: "user" | "assistant";
  content: string;
}

interface Vist {
  kontakt: boolean;
  bilde: boolean;
}

function ugyldig(error = "Ugyldig forespørsel.", kode?: string): NextResponse {
  return NextResponse.json(kode ? { error, kode } : { error }, { status: 400 });
}

function grenseSvar(grense: Extract<GrenseResultat, { ok: false }>): NextResponse {
  loggHendelse("grense", { rute: "assistent", regel: grense.regel });
  const headers = { "Retry-After": String(grense.retryAfterSeconds) };
  const error =
    grense.regel === "dogn"
      ? "Chatten har nådd dagens grense. Prøv igjen i morgen, eller kontakt Ocab."
      : grense.regel === "ip_minutt"
        ? "Du sender spørsmål veldig raskt. Vent et øyeblikk og prøv igjen."
        : grense.regel === "samtale"
          ? "Denne samtalen er blitt lang. Trykk «Ny samtale» for å fortsette."
          : "Du har stilt mange spørsmål den siste timen. Prøv igjen senere.";
  return NextResponse.json({ error }, { status: grense.regel === "dogn" ? 503 : 429, headers });
}

export async function POST(request: NextRequest) {
  const ikkeKlar = sjekkSikkerhetsoppsett("assistent");
  if (ikkeKlar) return ikkeKlar;
  return medGrensekontroll("assistent", () => svar(request));
}

async function svar(request: NextRequest): Promise<NextResponse> {
  const fremmed = sjekkOpprinnelse(request);
  if (fremmed) return fremmed;

  const apiKey = openRouterApiKey();
  if (!apiKey) return NextResponse.json({ error: "Tjenesten er ikke konfigurert." }, { status: 500 });

  const tilgang = lesTilgang(request);
  if (tilgang.kreves && !tilgang.ok) return tilgangNektet();

  // Samme tellere som funn-chatten: til sammen aldri mer enn grensene.
  const klient = { ipNokkel: ipNokkel(klientIp(request)), sid: tilgang.sid };
  const grense = await sjekkGrenser(chatRegler(klient));
  if (!grense.ok) return grenseSvar(grense);

  if (forStorForesporsel(request, MAX_BODY_BYTES)) return ugyldig();
  let body: { samtaleToken?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return ugyldig();
  }
  if (typeof body !== "object" || body === null || !Array.isArray(body.messages)) return ugyldig("Mangler spørsmål.");

  // Første spørsmål: ny samtale. Senere: samtalen må være signert av oss.
  const harHistorikk = body.messages.some((m) => (m as { role?: unknown })?.role === "assistant");
  const eksisterende = lesSamtale(body.samtaleToken);
  if (harHistorikk && !eksisterende) {
    return ugyldig("Samtalen kunne ikke bekreftes. Start en ny samtale.", "samtale_ugyldig");
  }
  const ny = eksisterende ? null : lagSamtale();
  const samtaleId = eksisterende?.id ?? ny!.id;
  const samtaleToken = ny?.token ?? (body.samtaleToken as string);

  const meldinger: Melding[] = [];
  // Hva appen viste sammen med hvert tidligere svar (signert sammen med teksten).
  const vist: Vist[] = [];
  for (const m of body.messages.slice(-MAX_TURNS)) {
    if (typeof m !== "object" || m === null) return ugyldig();
    const { role, content, sig, kontakt, bilde } = m as {
      role?: unknown;
      content?: unknown;
      sig?: unknown;
      kontakt?: unknown;
      bilde?: unknown;
    };
    if (typeof content !== "string") return ugyldig();
    if (role === "user") {
      meldinger.push({ role: "user", content: rensTekst(content, MAX_MESSAGE_CHARS) });
    } else if (role === "assistant") {
      const flagg = { kontakt: kontakt === true, bilde: bilde === true };
      if (content.length > MAX_ASSISTANT_CHARS || !verifiserAssistentSvar(samtaleId, content, sig, flagg)) {
        loggHendelse("chat_avvist", { rute: "assistent", grunn: "usignert_svar" });
        return ugyldig("Samtalen kunne ikke bekreftes. Start en ny samtale.", "samtale_ugyldig");
      }
      meldinger.push({ role: "assistant", content: content.slice(0, MAX_MESSAGE_CHARS) });
      vist.push(flagg);
    } else {
      return ugyldig();
    }
  }
  const sporsmal = meldinger.at(-1);
  if (!sporsmal || sporsmal.role !== "user" || !sporsmal.content) {
    return NextResponse.json({ error: "Mangler spørsmål." }, { status: 400 });
  }

  const svarMed = (tekst: string, visKontakt: boolean, visBilde: boolean, avkuttet = false) =>
    NextResponse.json({
      svar: tekst,
      signatur: signerAssistentSvar(samtaleId, tekst, { kontakt: visKontakt, bilde: visBilde }),
      samtaleToken,
      visKontakt,
      visBilde,
      avkuttet,
    });

  // Helt irrelevante spørsmål: fast svar, uten AI-kall.
  if (erHeltUtenforFaget(sporsmal.content)) {
    loggHendelse("assistent", { utfall: "utenfor_faget", tur: meldinger.length });
    return svarMed(UTENFOR_FAGET_SVAR, false, false);
  }

  const perSamtale = await sjekkGrenser([
    { navn: "samtale", nokkel: `assistent:samtale:${samtaleId}`, maks: SPORSMAL_PER_SAMTALE, vinduSek: SAMTALE_TTL },
  ]);
  if (!perSamtale.ok) return grenseSvar(perSamtale);
  const dogn = await sjekkGrenser([chatDognRegel()]);
  if (!dogn.ok) return grenseSvar(dogn);

  // Fagstoff hentes fra det brukeren har skrevet i samtalen.
  const brukertekst = meldinger.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  const tilstand = { kontaktVist: vist.some((v) => v.kontakt), bildeForeslatt: vist.some((v) => v.bilde) };
  const ai = await kallOpenRouter({
    apiKey,
    rute: "chat",
    steg: "assistent",
    model: chatModel(),
    messages: [{ role: "system", content: byggAssistentPrompt(brukertekst, tilstand) }, ...meldinger],
    temperature: 0.3,
    maxTokens: 800,
    timeoutMs: 20_000,
  });

  if (!ai.ok && ai.reason === "kostnadsramme") return kostnadsrammeNaadd("assistent");
  if (!ai.ok && ai.reason === "grensekontroll") return grensekontrollUtilgjengelig("assistent");
  if (!ai.ok && ai.reason === "saldo") return saldoBruktOpp("assistent");
  if (!ai.ok) {
    return NextResponse.json(
      { error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." },
      { status: ai.reason === "timeout" || ai.reason === "network" ? 504 : 502 }
    );
  }

  const markert = lesMarkorer(ai.content);
  const { tekst, visBilde } = markert;
  // Samme kontaktkort to svar på rad vises ikke – modellen har fått beskjed om
  // at kortet allerede er vist, og skal bare gjenta det ved vesentlig endring.
  const visKontakt = markert.visKontakt && !vist.at(-1)?.kontakt;
  loggHendelse("assistent", {
    utfall: "svar",
    svar_tegn: tekst.length,
    finish: ai.finishReason,
    tur: meldinger.length,
    kontakt: visKontakt || undefined,
    bilde: visBilde || undefined,
  });
  if (!tekst) return NextResponse.json({ error: "Fikk ikke svar akkurat nå. Prøv igjen om litt." }, { status: 502 });
  return svarMed(tekst, visKontakt, visBilde, ai.finishReason === "length");
}
