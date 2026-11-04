import { NextRequest, NextResponse } from "next/server";
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
  findPestInGroup,
  fhiUrl,
  type Pest,
  type PestGroup,
} from "@/lib/pests";
import {
  LOCATIONS,
  DROPPING_SIZES,
  type AnalysisResult,
  type AnnenArt,
  type Candidate,
  type Severity,
} from "@/lib/types";
import { getCached, setCached } from "@/lib/server-store";
import { erEvalModus, openRouterApiKey, visionModel } from "@/lib/server/config";
import { kallOpenRouter, summerForbruk, type AiFeil, type Forbruk } from "@/lib/server/openrouter";
import { forStorForesporsel, ipNokkel, klientIp, sjekkOpprinnelse } from "@/lib/server/request-guards";
import { lesTilgang, tilgangNektet } from "@/lib/server/access";
import { analyseDognRegel, analyseRegler, sjekkGrenser, type GrenseResultat } from "@/lib/server/limits";
import { lesAnalyseFelter } from "@/lib/server/validation";
import { gjenkjennBildeformat, TILLATTE_SHARP_FORMATER } from "@/lib/server/image-format";
import { lagChatBillett } from "@/lib/server/chat-ticket";
import { loggHendelse } from "@/lib/server/log";
import { LagerUtilgjengelig } from "@/lib/server/store";
import { grensekontrollUtilgjengelig, kostnadsrammeNaadd, medGrensekontroll, saldoBruktOpp } from "@/lib/server/svar";
import { sjekkSikkerhetsoppsett } from "@/lib/server/oppsett";
import { sikkerhetsnivaa } from "@/lib/types";

export const runtime = "nodejs"; // sharp krever Node-runtime, ikke Edge
export const maxDuration = 30;

const MAX_BYTES = 15 * 1024 * 1024;
/** Tak på hele forespørselen (bilde + felter), sjekkes før den leses inn. */
const MAX_BODY_BYTES = MAX_BYTES + 512 * 1024;
/**
 * Tak på antall piksler før bildet dekodes. Dekker kameraer på 48–50 MP,
 * men stopper «dekompresjonsbomber» som ville fylt minnet (S3).
 */
const MAX_PIXELS = 70_000_000;
/**
 * Tak på svarlengden i steg 2. Romslig, fordi noen modeller bruker tokens på
 * å tenke før de svarer – blir taket nådd, kuttes JSON-en og svaret kan ikke
 * leses.
 */
const SPECIES_MAX_TOKENS = 2000;
/** Under denne sikkerheten behandles selv en navngitt kandidat som "Ukjent". */
const MIN_CONFIDENCE = 30;
/** Under denne sikkerheten merkes navnet med "Mulig " i visningen. */
const LOW_CONFIDENCE_LABEL = 50;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|heic|heif|gif|avif|tiff)$/i;
/**
 * Lengste side på bildet som sendes til modellen. Samme som nettleseren
 * skalerer til, så bildet ikke krympes en gang til her.
 */
const MAX_EDGE = 1600;

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
2. Larver hører til gruppen til det voksne dyret: hårete billelarver og melorm er Biller, møllarver er Møll, hvite beinløse makk er Fluer og mygg.
3. Har brukeren oppgitt størrelse eller skrevet notater, bruk dem – de er ofte mer pålitelige enn bildet.
4. Er du usikker, velg den mest sannsynlige. Ser du ikke noe dyr, svar "Ukjent".

SVARFORMAT – kun gyldig JSON, ingen forklaring rundt:
{"gruppe":"Gruppenavn fra listen"}`;

// ── Felles prompt-deler for dyr og ekskrementer ─────────────────────────
// Samme kontekst skal gi samme konklusjon, uansett om brukeren tar bilde av
// dyret eller av ekskrementene. Ligger her, så de to promptene ikke glir fra
// hverandre.

/** Hva modellen skal legge vekt på, og når et forslag er godt nok. */
const BEVISKRAV = `BEVIS FØR FORSLAG
Et forslag skal bygge på bevis, ikke gjetting. Bevis er noe du faktisk ser på bildet, eller noe brukeren har skrevet eller valgt (sted, størrelse, lukt, lyd, atferd).
- Har du minst ett konkret bevis som peker mot en art, gi den som hovedforslag – også med lav confidence (ned mot 30). Usikre forslag vises som "Mulig [art]" med en advarsel, og hjelper brukeren mer enn "Ukjent".
- Har du ikke noe konkret bevis, svar "Ukjent". Et feil svar som ser sikkert ut er verre enn "Ukjent".
- Skriv bevisene kort i "observasjon", så brukeren ser hva forslaget bygger på.
- Er du i tvil mellom to arter, velg den som passer best med det brukeren har skrevet, og legg den andre i "alternativer".`;

/** Hva brukerens fritekst og sted betyr. Gjelder bare arter som står i listen. */
const KONTEKSTREGLER = `BRUKERENS TEKST VEIER TYNGRE ENN BILDET
Lukt, lyd, sted og atferd kan ikke leses av bildet, så det brukeren skriver er ofte den mest avgjørende kilden. Men ett stikkord alene avgjør aldri: kombiner det med størrelse, form og innhold. Mange arter kan være på samme sted – på et loft kan det for eksempel være mus, rotte, mår og flaggermus.
Gjør alltid en helhetsvurdering: bildet, oppgitt størrelse, sted og brukerens tekst vurderes sammen. Bildet alene gir ofte feil, fordi størrelse ikke kan måles uten noe å sammenligne med og detaljer kan være utydelige. Har du bare bildet og ingen tekst eller størrelse, gi forslag bare når tydelige kjennetegn synes, hold confidence under 50, og legg nærmeste forveksling i "alternativer".
Bruk disse koblingene, og bare for arter som står i listen under:
- fiskebein, fiskeskjell eller krepsdyrskall i store, mørke ekskrementer (synlig på bildet), gjerne sammen med vann eller fiskelukt → mink
- store, vridde ekskrementer med bær, frø eller hår, lagt synlig på stein, bjelke eller mønekam, gjerne sammen med bråk på loft om natten → mår
- små, tynne ekskrementer (3–6 cm) med hår, fjær eller små bein, i haug ved et hull, reir, steinrøys eller på loft, gjerne med mus i nærheten → røyskatt
- 12–20 mm, butte ender, samlet på faste steder + kjeller, avløp eller kloakk → brunrotte
- 3–8 mm, spisse ender, mange og spredt + skuffer, skap, isolasjon eller stikkende lukt → mus
- skraping, tasling eller løping i vegg eller tak om natten → gnager (størrelsen avgjør mus eller rotte)
- små ekskrementer som smuldrer til glitrende pulver + under takutstikk, loftsluke eller sprekk i vegg → flaggermus
- sagflis av trefibre ved lister, vinduer eller terskler + store maur (over 6 mm) → stokkmaur
- fine, melaktige hauger + små brunsvarte maur → svart jordmaur
- maur som lukter sitrus eller appelsin når de knuses → svart tremaur
- hissige maur som sprayer maursyre + tue av barnåler → rød skogsmaur
- seng eller sofa + bitt på rad eller små blodflekker på laken → veggedyr
- hull i ull, pels eller tepper + små hårete larver → pelsbille, tepperbille eller klesmøll
- spinn eller klumper i mel og tørrvarer → matmøll eller melmøll
- små kryp som biter + fuglereir under tak eller i ventil → fuglemidd
- ved sluk på bad → avløpsflue; rundt potteplanter → soppmygg; rundt frukt → bananflue`;

/** Når ingen art i listen passer, men modellen kjenner igjen dyret. */
const ANNEN_ART = `ARTER SOM IKKE STÅR I LISTEN
Står dyret ikke i listen, men du kjenner det sikkert igjen, svar "found":false og fyll ut "annenArt" med det norske og latinske navnet, hvorfor du mener det, og confidence. Bruk dette bare når ingen art i listen passer – aldri som erstatning for en art som står der.`;

const SVARFORMAT = `SVARFORMAT – kun gyldig JSON, ingen forklaring rundt:
{"found":true,"name":"Norsk navn fra listen","latinName":"Latinsk navn fra listen","description":"To setninger om det du ser","observasjon":"Bevisene forslaget bygger på","confidence":0-100,"alternativer":[{"name":"Norsk navn","latinName":"Latinsk navn","confidence":0-100,"hvorfor":"Hvorfor dette kan være riktig"}]}

"alternativer" er de 1–3 artene fra listen som ligner mest etter hovedforslaget, sortert fallende på confidence. Er du sikker, kan listen være tom.
Ukjent art: {"found":false,"name":"Ukjent","latinName":"Ukjent","description":"...","observasjon":"...","confidence":0}
Art som ikke står i listen: {"found":false,"name":"Ukjent","latinName":"Ukjent","description":"...","observasjon":"...","confidence":0,"annenArt":{"name":"Norsk navn","latinName":"Latinsk navn","confidence":0-100,"hvorfor":"..."}}`;

/**
 * Egen systemprompt for ekskrementer. Mus artsbestemmes ikke: husmus og
 * skogmus er samlet som "Mus", fordi Ocab bare trenger å skille mus fra
 * rotte. Svartrotte er utelatt (sjelden i Norge) – rotteekskrementer er
 * brunrotte. Svar som "Husmus" eller "Skogmus" blir til "Mus" via
 * aliasene, og lookupPest() og parseAnnenArt() hindrer at svartrotte
 * slipper inn fra dyre-listen.
 */
function buildDroppingsSystemPrompt(speciesList: string, focus: string, beskrivelseText: string): string {
  return `Du er artsbestemmer for Ocab, et norsk skadedyrfirma. Du får ett bilde av ekskrementer (avføring) og skal bestemme hvilket dyr de stammer fra. De fleste dyrene ser man sjelden – det er ekskrementene som avslører dem.

${BEVISKRAV}

REGLER
1. Bruk kun norske navn fra listen under. Passer ingen av dem, svarer du "Ukjent".
2. Mus skal ikke artsbestemmes: husmus, skogmus og andre mus heter bare "Mus". Det viktigste er å skille mus fra rotte. Rotteekskrementer er "Brunrotte" – foreslå aldri svartrotte.
3. "confidence" er hvor sikker du faktisk er, 0–100. Under 50 vises forslaget som "Mulig [art]".
4. Rotter (brunrotte) lager faste toaletter. Ekskrementer fra rotte finnes derfor ofte i klynger på ett eller få utvalgte steder, ikke spredt tilfeldig rundt.
5. Flaggermus-ekskrementer smuldrer lett til pulver ved berøring og glinser av uknuste insektskall i bruddflaten. Museekskrementer er faste, smuldrer ikke, og inneholder ofte synlige frørester i stedet.
6. Beskrivelsen skal peke på hva du faktisk ser på bildet: form, størrelse, farge og eventuelt innhold. To setninger, på norsk bokmål, uten "jeg" eller "AI".

${KONTEKSTREGLER}
${beskrivelseText}

HVA DU SKAL SE ETTER PÅ BILDET
${focus}

ARTER
${speciesList}

${ANNEN_ART}

${SVARFORMAT}`;
}

function buildSystemPrompt(speciesList: string, focus: string, notesAnimal: string): string {
  return `Du er artsbestemmer for Ocab, et norsk skadedyrfirma. Du får ett bilde og skal identifisere dyret.

${BEVISKRAV}

REGLER
1. Bruk kun norske navn fra listen under. Passer ingen av dem, svarer du "Ukjent".
2. "confidence" er hvor sikker du faktisk er, 0–100. Uskarpt bilde, dyret langt unna eller kjennetegn som ikke synes skal gi under 50. Under 50 vises forslaget som "Mulig [art]".
3. Er dyret for lite til å artsbestemmes på foto (midd, støvlus), si det i beskrivelsen og hold confidence lav.
4. Er det en larve, si det i beskrivelsen og svar med arten larven tilhører.
5. Beskrivelsen skal peke på hva du faktisk ser på bildet: farge, form, mønster, antall bein, vinger, antenner, haletråder. To setninger, på norsk bokmål, uten "jeg" eller "AI".

STØRRELSE
Du kan ikke måle størrelse på et bilde uten noe kjent ved siden av. Har brukeren valgt en størrelse eller skrevet størrelse i notatene, er det en opplysning du skal stole på: utelukk arter som ikke passer, og ikke vurder størrelsen på nytt fra bildet. Er ingen størrelse oppgitt, bruk størrelse fra bildet bare hvis noe kjent synes (mynt, fyrstikk, finger, flis, skrue), og ellers form, farge og mønster.

${KONTEKSTREGLER}

Brukerens notater om skadedyret: ${notesAnimal ? `"${notesAnimal}"` : "Ingen notater"}

HVA DU SKAL SE ETTER PÅ BILDET
${focus}

ARTER
${speciesList}

${ANNEN_ART}

${SVARFORMAT}`;
}

export async function POST(request: NextRequest) {
  // Vercel Production/Preview: stopp hvis en sikkerhetsinnstilling mangler.
  const ikkeKlar = sjekkSikkerhetsoppsett("analyze");
  if (ikkeKlar) return ikkeKlar;
  // Svarer ikke Upstash, avvises forespørselen med et norsk 503-svar.
  return medGrensekontroll("analyze", () => analyser(request));
}

async function analyser(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  // ── CSRF: skjemaposter fra andre nettsteder avvises ──────────────────
  const fremmed = sjekkOpprinnelse(request);
  if (fremmed) return fremmed;

  const apiKey = openRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Tjenesten er ikke konfigurert. Kontakt Ocab." },
      { status: 500 }
    );
  }

  // ── Tilgangskode (når den er slått på) ──────────────────────────────
  const tilgang = lesTilgang(request);
  if (tilgang.kreves && !tilgang.ok) return tilgangNektet();

  // ── Bruksgrense per enhet og IP ─────────────────────────────────────
  const evalModus = erEvalModus();
  const klient = { ipNokkel: ipNokkel(klientIp(request)), sid: tilgang.sid };
  let gjenstaende = 0;
  if (!evalModus) {
    const grense = await sjekkGrenser(analyseRegler(klient));
    if (!grense.ok) return grenseSvar(grense, Boolean(klient.sid));
    gjenstaende = grense.gjenstaende;
  }

  // ── For stor forespørsel avvises før den leses inn i minnet (S6) ────
  if (forStorForesporsel(request, MAX_BODY_BYTES)) {
    return NextResponse.json({ error: "Bildet er for stort. Maks 15 MB." }, { status: 413 });
  }

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
    }
    const image = formData.get("image");
    // Alle felter valideres: valgfelter godtas bare med kjente verdier,
    // fritekst renses og kuttes (S1).
    const { location, storrelse, analyseType, droppingSize, beskrivelse, notesAnimal } =
      lesAnalyseFelter(formData);
    const erEkskrementer = analyseType === "ekskrementer";

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

    // Filtypen avsenderen oppgir kan være feil eller forfalsket. Sjekk hva
    // filen faktisk er før den når bildemotoren – SVG, PDF o.l. stoppes (S3).
    if (!gjenkjennBildeformat(inputBuffer)) {
      return NextResponse.json(
        { error: "Filtypen støttes ikke. Bruk JPG, PNG, WebP eller HEIC." },
        { status: 415 }
      );
    }

    // ── Cache: samme bilde + samme sted gir samme svar ───────────────────
    // Feltene serialiseres som JSON, så "ab"+"c" og "a"+"bc" ikke gir samme nøkkel.
    const hash = crypto
      .createHash("sha256")
      .update(inputBuffer)
      .update(JSON.stringify([location, storrelse, analyseType, droppingSize, beskrivelse, notesAnimal]))
      .digest("hex");

    const cached = evalModus ? undefined : getCached(hash);
    if (cached) {
      loggHendelse("analyse", { type: analyseType, utfall: utfallFor(cached), cached: true, ms: Date.now() - start });
      return NextResponse.json({ ...cached, cached: true, chatToken: lagChatBillett(cached) });
    }

    // ── Felles døgnbudsjett – telles først når et AI-kall faktisk skal gjøres
    if (!evalModus) {
      const dogn = await sjekkGrenser([analyseDognRegel()]);
      if (!dogn.ok) return grenseSvar(dogn, Boolean(klient.sid));
    }

    // ── Normaliser til JPEG ─────────────────────────────────────────────
    // Ny JPEG uten metadata: EXIF – også GPS-posisjon – blir ikke med til
    // AI-tjenesten. Klarer ikke sharp å lese bildet, avvises det; vi sender
    // aldri originalfilen videre (S7).
    let jpegBuffer: Buffer;
    try {
      const bilde = sharp(inputBuffer, { limitInputPixels: MAX_PIXELS, failOn: "none" });
      const meta = await bilde.metadata();
      if (!meta.format || !TILLATTE_SHARP_FORMATER.has(meta.format)) {
        return NextResponse.json(
          { error: "Filtypen støttes ikke. Bruk JPG, PNG, WebP eller HEIC." },
          { status: 415 }
        );
      }
      if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_PIXELS) return forHoyOpplosning();
      jpegBuffer = await bilde
        .rotate() // følg EXIF-orientering
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true, mozjpeg: true })
        .toBuffer();
    } catch (convError) {
      const melding = convError instanceof Error ? convError.message : "";
      console.error("❌ sharp klarte ikke å lese bildet:", melding.slice(0, 200));
      if (/pixel limit/i.test(melding)) return forHoyOpplosning();
      // HEIC støttes ikke av alle sharp-bygg.
      return NextResponse.json(
        {
          error:
            "Bildeformatet kunne ikke leses. Ta bildet på nytt, eller lagre det som JPG først.",
        },
        { status: 415 }
      );
    }

    const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
    const locationText = buildLocationText(location);
    const sizeText = buildSizeText(storrelse);
    const notesText = notesAnimal ? ` Brukerens notater: "${notesAnimal}".` : "";
    const imageContent = { type: "image_url", image_url: { url: base64Image, detail: "high" } };
    const forbruk: Forbruk[] = [];
    const feil = (reason: AiFeil) => {
      loggHendelse("analyse", { type: analyseType, utfall: "ai_feil", grunn: reason, ms: Date.now() - start });
      return modelError(reason);
    };

    let gruppe: PestGroup | null;
    let speciesOutcome: CallOutcome;

    if (erEkskrementer) {
      // Ekskrement-analyser vet allerede hvilken gruppe det gjelder – vi
      // trenger ikke steg 1 for å gjette hovedgruppen.
      gruppe = "Ekskrementer";
      const speciesList = groupPromptList(gruppe);
      const focus = focusForGroup(gruppe);
      const droppingsText = buildDroppingsText({ droppingSize });

      const beskrivelseText = beskrivelse
        ? `\nBrukerens egen beskrivelse (dette er den viktigste kilden du har – vei den tyngre enn bildet alene): "${beskrivelse}"\nBruk den aktivt til å skille mellom artene under, jamfør eksemplene over.`
        : "\nBrukeren har ikke skrevet noen fritekstbeskrivelse denne gangen – bruk bildet, stedet og størrelsen så godt du kan.";

      speciesOutcome = await callModel(
        buildDroppingsSystemPrompt(speciesList, focus, beskrivelseText),
        [
          {
            type: "text",
            text: `Artsbestem hvilket dyr ekskrementene på bildet stammer fra.${locationText}${droppingsText}${
              beskrivelse ? ` Ekstra beskrivelse fra brukeren: ${beskrivelse}.` : ""
            } Svar kun med JSON.`,
          },
          imageContent,
        ],
        { maxTokens: SPECIES_MAX_TOKENS, timeoutMs: 15_000, steg: "ekskrementer", apiKey, forbruk }
      );
    } else {
      // ── Steg 1: finn hovedgruppe ─────────────────────────────────────
      // Gruppefilteret gjør at et pattedyr bare konkurrerer mot andre
      // pattedyr i steg 2 – ikke mot 40 insekter.
      const groupOutcome = await callModel(
        GROUP_SYSTEM_PROMPT,
        [
          {
            type: "text",
            text: `Velg hvilken hovedgruppe dyret på bildet tilhører.${locationText}${sizeText}${notesText} Svar kun med JSON.`,
          },
          imageContent,
        ],
        { maxTokens: 300, timeoutMs: 10_000, steg: "gruppe", apiKey, forbruk }
      );

      if (!groupOutcome.ok) return feil(groupOutcome.reason);

      gruppe = findGroup(groupOutcome.json?.gruppe);
      const speciesList = gruppe ? groupPromptList(gruppe) : PEST_PROMPT_LIST;
      const focus = focusForGroup(gruppe);

      // ── Steg 2: velg art innenfor gruppen ───────────────────────────
      speciesOutcome = await callModel(
        buildSystemPrompt(speciesList, focus, notesAnimal),
        [
          {
            type: "text",
            text: `Artsbestem dyret på bildet.${locationText}${sizeText} Svar kun med JSON.`,
          },
          imageContent,
        ],
        { maxTokens: SPECIES_MAX_TOKENS, timeoutMs: 15_000, steg: "art", apiKey, forbruk }
      );
    }

    if (!speciesOutcome.ok) return feil(speciesOutcome.reason);

    // Et svar vi ikke klarte å lese er en teknisk feil, ikke en vurdering.
    // Vis det som feil med "prøv igjen" – ikke som "Ukjent", som får
    // brukeren til å tro at dyret ikke kunne bestemmes.
    if (!speciesOutcome.json) {
      loggHendelse("analyse", { type: analyseType, utfall: "uleselig_svar", ms: Date.now() - start });
      return NextResponse.json(
        { error: "Fikk ikke et lesbart svar fra analysen. Prøv igjen." },
        { status: 502 }
      );
    }
    const result = enrich(speciesOutcome.json, gruppe);
    if (!evalModus) setCached(hash, result);

    const sum = summerForbruk(forbruk);
    loggHendelse("analyse", {
      type: analyseType,
      utfall: utfallFor(result),
      art: result.found ? result.name : undefined,
      gruppe: result.gruppe,
      nivaa: result.found ? sikkerhetsnivaa(result.confidence) : undefined,
      cached: false,
      ai_kall: forbruk.length,
      tokens_inn: sum.tokensInn,
      tokens_ut: sum.tokensUt,
      kostnad_usd: sum.kostnadUsd,
      ms: Date.now() - start,
    });

    return NextResponse.json(
      { ...result, chatToken: lagChatBillett(result) },
      { headers: { "X-RateLimit-Remaining": String(gjenstaende) } }
    );
  } catch (error) {
    if (error instanceof LagerUtilgjengelig) return grensekontrollUtilgjengelig("analyze");
    console.error("❌ Uventet feil i /api/analyze:", error instanceof Error ? error.message : "ukjent feil");
    return NextResponse.json(
      { error: "Noe gikk galt under analysen. Prøv igjen." },
      { status: 500 }
    );
  }
}

function utfallFor(r: AnalysisResult): string {
  return r.found ? "art" : r.annenArt ? "annen_art" : "ukjent";
}

function forHoyOpplosning(): NextResponse {
  return NextResponse.json(
    { error: "Bildet har for høy oppløsning. Ta bildet på nytt med vanlig kamerainnstilling." },
    { status: 413 }
  );
}

/** Svar når en bruksgrense eller døgnbudsjettet er nådd. */
function grenseSvar(grense: Extract<GrenseResultat, { ok: false }>, harTilgangskode: boolean): NextResponse {
  loggHendelse("grense", { rute: "analyze", regel: grense.regel });
  const headers = { "Retry-After": String(grense.retryAfterSeconds) };
  const minutter = Math.ceil(grense.retryAfterSeconds / 60);
  if (grense.regel === "dogn") {
    return NextResponse.json(
      {
        error: "Artsorakel har nådd dagens grense for analyser. Prøv igjen i morgen, eller ring Ocab.",
        kode: "dognbudsjett",
      },
      { status: 503, headers }
    );
  }
  const error =
    grense.regel === "ip_time" && harTilgangskode
      ? `Det er gjort mange analyser fra dette nettverket den siste timen. Prøv igjen om ${minutter} minutter.`
      : `Du har brukt alle ${grense.maks} analysene denne timen. Prøv igjen om ${minutter} minutter.`;
  return NextResponse.json({ error }, { status: 429, headers });
}

// ── Hjelpere ─────────────────────────────────────────────────────────────

function buildLocationText(location: string): string {
  const match = LOCATIONS.find((l) => l.value === location);
  if (!match) return "";
  return ` Dyret ble funnet ${match.prompt} – bruk det til å skille arter som ligner.`;
}

function buildSizeText(storrelse: string): string {
  if (!storrelse) return "";
  return ` Brukeren har oppgitt størrelsen ${storrelse} – stol på dette og utelukk arter som ikke passer.`;
}

function buildDroppingsText(fields: { droppingSize: string }): string {
  const size = DROPPING_SIZES.find((s) => s.value === fields.droppingSize);
  if (!size) return "";
  return ` Oppgitt størrelse på ekskrementene: ${size.prompt}. Bruk dette aktivt til å skille artene fra hverandre.`;
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
  | { ok: false; reason: AiFeil };

async function callModel(
  system: string,
  userContent: unknown[],
  opts: { maxTokens: number; timeoutMs: number; steg: string; apiKey: string; forbruk: Forbruk[] }
): Promise<CallOutcome> {
  const svar = await kallOpenRouter({
    apiKey: opts.apiKey,
    rute: "analyze",
    steg: opts.steg,
    model: visionModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    maxTokens: opts.maxTokens,
    timeoutMs: opts.timeoutMs,
    json: true,
  });
  if (!svar.ok) return { ok: false, reason: svar.reason };
  opts.forbruk.push(svar.forbruk);

  const json = parseJson(svar.content);
  // "length" betyr at max_tokens var for lavt og svaret ble kuttet.
  // Vi logger bare lengde og årsak – aldri selve svaret, som kan gjengi
  // det brukeren skrev.
  if (!json || svar.finishReason === "length") {
    console.warn(
      `⚠️ Modellsvar ${json ? "kuttet" : "ikke lesbart"}: finish_reason=${svar.finishReason}, ` +
        `max_tokens=${opts.maxTokens}, svar_tegn=${svar.content.length}`
    );
  }
  return { ok: true, json };
}

function modelError(reason: string): NextResponse {
  switch (reason) {
    case "kostnadsramme":
      return kostnadsrammeNaadd("analyze");
    case "grensekontroll":
      return grensekontrollUtilgjengelig("analyze");
    case "saldo":
      return saldoBruktOpp("analyze");
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

/**
 * Slår opp modellens svar i databasen, først i gruppen steg 2 jobbet mot.
 * For dyr faller vi tilbake til hele listen i tilfelle steg 1 valgte feil
 * gruppe. For ekskrementer gjør vi ikke det – da kunne et dyr som er bevisst
 * utelatt der (svartrotte) slippe inn via dyre-oppføringen.
 */
function lookupPest(name: string, latinName: string, gruppe: PestGroup | null): Pest | undefined {
  const iGruppe = gruppe
    ? findPestInGroup(name, gruppe) ?? findPestInGroup(latinName, gruppe)
    : undefined;
  if (iGruppe || gruppe === "Ekskrementer") return iGruppe;
  return findPest(name) ?? findPest(latinName);
}

/** Mapper modellens alternativ-liste til kjente arter, sortert fallende. */
function parseAlternatives(raw: unknown, gruppe: PestGroup | null): Candidate[] {
  if (!Array.isArray(raw)) return [];
  const out: Candidate[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    const latinName = typeof rec.latinName === "string" ? rec.latinName : "";
    const pest = lookupPest(name, latinName, gruppe);
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
 * En art modellen kjenner igjen, men som ikke står i databasen. Navn som
 * finnes i databasen forkastes – da skulle modellen brukt listen, og det
 * hindrer også at bevisst utelatte arter (svartrotte på ekskrementer) slipper
 * inn den veien.
 */
function parseAnnenArt(raw: unknown): AnnenArt | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 80) : "";
  const latinName = typeof rec.latinName === "string" ? rec.latinName.trim().slice(0, 80) : "";
  if (!name || /^ukjent$/i.test(name)) return undefined;
  if (findPest(name) || findPest(latinName)) return undefined;

  let confidence = Number(rec.confidence);
  if (!Number.isFinite(confidence)) return undefined;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));
  if (confidence < MIN_CONFIDENCE) return undefined;

  const hvorfor = typeof rec.hvorfor === "string" ? rec.hvorfor.trim().slice(0, 300) : "";
  return { name, latinName, confidence, hvorfor };
}

/**
 * Modellen kan finne på navn som ikke står i listen. Vi stoler bare på
 * identifikasjonen hvis den lar seg slå opp – ellers blir svaret Ukjent.
 * Alvorlighet, tiltak, utbredelse og sesong tar vi fra vår egen database,
 * ikke fra modellen.
 */
function enrich(raw: Record<string, unknown>, gruppe: PestGroup | null): AnalysisResult {
  const name = typeof raw.name === "string" ? raw.name : "";
  const latinName = String(raw.latinName ?? "");
  const pest = lookupPest(name, latinName, gruppe);
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

  if (!pest || raw.found === false || confidence < MIN_CONFIDENCE) {
    const annenArt = parseAnnenArt(raw.annenArt);
    if (annenArt) {
      return {
        ...UNKNOWN,
        description: description || UNKNOWN.description,
        observasjon,
        annenArt,
        tiltak: [
          "Arten finnes ikke i Ocabs database, så vi har ingen kvalitetssikrede råd for den",
          "Kontakt Ocab hvis du er usikker, ser mange av dem eller de gjør skade",
          "Ta gjerne et nytt bilde nærmere dyret for å bekrefte",
        ],
        alternativer: parseAlternatives(raw.alternativer, gruppe),
      };
    }
    return { ...UNKNOWN, description: description || UNKNOWN.description, observasjon };
  }

  const severity: Severity = pest.alvorlighet;
  const alternativer = parseAlternatives(raw.alternativer, gruppe).filter(
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
    usikkerKandidat: confidence < LOW_CONFIDENCE_LABEL,
    bekreftelse: pest.bekreftelse,
    notat: pest.notat,
    fhiUrl: fhiUrl(pest.slug),
  };
}

// Eksporteres for enkel sanity-sjekk i tester
export const _internal = { enrich, parseJson, parseAlternatives, PESTS };