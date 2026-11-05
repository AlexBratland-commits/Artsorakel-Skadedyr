import { findPest, findPestInGroup, type Pest } from "@/lib/pests";
import { ALVORLIGHET } from "@/lib/resultat-tekst";
import type { ChatBillett } from "./chat-ticket";
import { ARTER_UTENFOR_BIBLIOTEKET } from "./fagregler";

/**
 * H3: beskrivelsen av funnet i funn-chattens systemprompt. Bygges bare fra
 * den signerte billetten og artsbiblioteket. Usikkerheten fra bildeanalysen
 * bevares: chatten får vite sikkerhetsnivået, om svaret er et «Mulig …»,
 * alternativene, motstridende artsnavn og om arten er utenfor biblioteket.
 */

/** Kort og uten linjeskift eller anførselstegn, siden teksten havner i systemprompten. */
const rens = (x: string | undefined, maks = 120) => (x ?? "").replace(/\s+/g, " ").replace(/["\\]/g, "").trim().slice(0, maks);

export const IKKE_BEKREFTET =
  "Bildeanalysen er en AI-vurdering av et bilde, ikke en bekreftet artsbestemmelse. Si aldri at arten er bekreftet, sikkert bestemt eller fastslått, selv om brukeren ber om det – en sikker bestemmelse krever en fagperson.";

export const ARTSAVHENGIGE_RAAD =
  "Gi råd for akkurat denne arten – ikke generelle bekjempelsesråd for hele dyregruppen. Er arten lite alvorlig eller normalt ufarlig, si det, og ikke anbefal bekjempelse den ikke trenger.";

const UTENFOR_RAAD =
  "Du har ingen kvalitetssikret informasjon om arten. Ikke anbefal bekjempelse, gift, limfeller eller profesjonell bekjempelse automatisk – mange arter utenfor databasen er ufarlige. Svar generelt og med forbehold, og si at Ocab kan vurdere funnet hvis brukeren er usikker.";

function artsfakta(pest: Pest): string {
  const grad = ALVORLIGHET[pest.alvorlighet];
  return `DETTE VET VI OM ARTEN
Kjennetegn: ${pest.kjennetegn}
Utbredelse: ${pest.utbredelse}
Aktiv: ${pest.sesong}
Alvorlighet: ${pest.alvorlighet} (${grad.etikett} – ${grad.tekst})
Anbefalte tiltak: ${pest.tiltak.join(" | ")}
${pest.forveksles?.length ? `Forveksles med: ${pest.forveksles.join(" | ")}` : ""}
${pest.notat ? `Viktig: ${pest.notat}` : ""}`.trim();
}

/** Faste fagregler for kjente arter utenfor biblioteket (f.eks. markkakerlakk). */
function utenforRegel(navn: string, latin: string): string | undefined {
  const tekst = `${navn} ${latin}`.toLowerCase();
  return ARTER_UTENFOR_BIBLIOTEKET.find((r) => r.treff.some((t) => tekst.includes(t)))?.regel;
}

export interface FunnBeskrivelse {
  tekst: string;
  pest?: Pest;
  /** Til loggen: artsnavn, «annen_art», «motstrid» eller «ukjent_funn». */
  loggArt: string;
}

export function beskrivFunn(billett: ChatBillett): FunnBeskrivelse {
  // Samme navn kan finnes i flere grupper (Brunrotte som dyr og som
  // ekskrementer), så gruppen avgjør hvilken oppføring vi bruker.
  const pest = billett.art
    ? (billett.gruppe ? findPestInGroup(billett.art, billett.gruppe) : undefined) ?? findPest(billett.art)
    : undefined;
  const alternativer = billett.alternativer?.length
    ? `\nAndre mulige arter fra analysen: ${billett.alternativer.map((a) => rens(a)).join(", ")}. Nevn dem hvis det er relevant.`
    : "";

  if (pest) {
    const navn = `${pest.norsk} (${pest.latin})`;
    const ekskrement = pest.gruppe === "Ekskrementer" ? ", ut fra ekskrementer" : "";
    const usikker = billett.usikker || billett.nivaa === "lav";
    const innledning = usikker
      ? `Bildeanalysen foreslår at det kan være ${navn}${ekskrement}, men sikkerheten er lav. Omtal den alltid som «mulig ${pest.norsk}», aldri som sikker. Gi ikke råd som forutsetter at det er ${pest.norsk} uten å si at arten først bør bekreftes.`
      : billett.nivaa === "middels"
        ? `Bildeanalysen foreslår ${navn}${ekskrement} med middels sikkerhet. Omtal arten som sannsynlig, ikke sikker. Bestemmelsen bør bekreftes av en fagperson.`
        : billett.nivaa === "høy"
          ? `Bildeanalysen foreslår ${navn}${ekskrement} med høy sikkerhet. Du kan bruke artsnavnet naturlig.`
          : `Bildeanalysen foreslår ${navn}${ekskrement}.`;
    const generelt = billett.generelt ? `\n${rens(billett.generelt, 300)}` : "";
    return {
      tekst: `${innledning}${generelt}\n${IKKE_BEKREFTET}${alternativer}\n\n${artsfakta(pest)}\n\n${ARTSAVHENGIGE_RAAD}`,
      pest,
      loggArt: pest.norsk,
    };
  }

  if (billett.motstrid?.length) {
    const kandidater = billett.motstrid.map((k) => rens(k));
    return {
      tekst: `Bildeanalysen inneholder motstridende artsnavn: navnene peker på forskjellige arter (${kandidater.join(" og ")}). Du skal ikke velge mellom dem, og ikke si hvilken som er riktig. Forklar at arten må bekreftes, og at Ocab kan hjelpe. Du kan beskrive kjennetegn som skiller artene.\n${IKKE_BEKREFTET}`,
      loggArt: "motstrid",
    };
  }

  const annen = rens(billett.annenArt, 80);
  if (annen) {
    const latin = rens(billett.annenArtLatin, 80);
    const nivaa = billett.nivaa ? ` med ${billett.nivaa} sikkerhet` : "";
    const regel = utenforRegel(annen, latin);
    return {
      tekst: `Bildeanalysen foreslo «${annen}»${latin ? ` (${latin})` : ""}${nivaa}, en art utenfor Ocabs database. Omtal den som «mulig ${annen}».\n${IKKE_BEKREFTET}\n${UTENFOR_RAAD}${regel ? `\n${regel}` : ""}${alternativer}`,
      loggArt: "annen_art",
    };
  }

  return {
    tekst:
      "Bildeanalysen klarte ikke å bestemme arten. Hjelp brukeren med generelle råd, med hva de kan se etter for å finne ut hva det er, og med å ta et bedre bilde (nærmere, skarpt, noe kjent ved siden av for størrelse)." +
      alternativer,
    loggArt: "ukjent_funn",
  };
}
