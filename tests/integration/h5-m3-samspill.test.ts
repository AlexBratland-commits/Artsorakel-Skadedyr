/**
 * H5 × M3: kan taket på bildegrunnlaget («uklart»/«delvis») skjule et
 * konkurrerende alternativ? Regelen som skal gjelde: M3-advarselen vises
 * etter taket nøyaktig når den ville blitt vist uten taket (modellens egen
 * rangering), og ingen alternativer forsvinner. Tallene er modellens egne
 * vurderinger, ikke kalibrerte sannsynligheter – testene sammenligner bare
 * rangering og nivå, ikke «sannsynlighet».
 */
import { describe, expect, it } from "vitest";
import { enrich } from "@/lib/identification";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { ALTERNATIV_MOTSTRID_TEKST, alternativNivaa, harSterkereAlternativ, historikkMerknad } from "@/lib/resultat-tekst";
import { lagChatBillett, lesChatBillett } from "@/lib/server/chat-ticket";

const ALT = { name: "Brunrotte", latinName: "Rattus norvegicus", hvorfor: "Kraftig hale" };
const ALT2 = { name: "Liten skogmus", latinName: "Apodemus sylvaticus", hvorfor: "Store ører" };

function analyse(main: number, alt: number, grunnlag?: string, alt2?: number) {
  const alternativer = [{ ...ALT, confidence: alt }, ...(alt2 === undefined ? [] : [{ ...ALT2, confidence: alt2 }])];
  return enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: main, grunnlag, alternativer }, "Gnagere");
}

describe("H5 × M3: nesten lik, lik, lavere og høyere confidence", () => {
  const tilfeller: [string, number, number, boolean][] = [
    ["alternativ ett lavere", 82, 81, false],
    ["alternativ likt", 82, 82, true],
    ["alternativ ett høyere", 82, 83, true],
    ["alternativ klart lavere", 92, 60, false],
    ["alternativ klart høyere", 60, 92, true],
    ["begge under taket, alternativ likt", 45, 45, true],
    ["begge under taket, alternativ lavere", 45, 44, false],
  ];
  for (const grunnlag of ["uklart", "delvis"]) {
    for (const [navn, main, alt, m3] of tilfeller) {
      it(`${grunnlag}: ${navn} (${main}/${alt}) – M3 ${m3 ? "vises" : "vises ikke"}, som uten taket`, () => {
        const uten = analyse(main, alt);
        const med = analyse(main, alt, grunnlag);
        expect(harSterkereAlternativ(uten)).toBe(m3);
        expect(harSterkereAlternativ(med)).toBe(m3);
        // Alternativet er fortsatt med
        expect(med.alternativer.map((a) => a.name)).toEqual(["Brunrotte"]);
        // Nivået vises for alternativet når det er minst like sterkt (M3/F7)
        if (m3) expect(alternativNivaa(med, med.alternativer[0])).toBeDefined();
        // Samme melding i PDF og historikk
        const merknader = lagRapportInnhold(med, { analyseTid: new Date() }).merknader;
        expect(merknader.includes(ALTERNATIV_MOTSTRID_TEKST)).toBe(m3);
        expect(historikkMerknad(med) !== undefined).toBe(m3);
        // Chatten får vite om det sterke alternativet
        const billett = lesChatBillett(lagChatBillett(med))!;
        expect(Boolean(billett.sterkereAlternativ?.length)).toBe(m3);
      });
    }
  }
});

describe("H5 × M3: systematisk – taket endrer aldri M3-beslutningen eller fjerner alternativer", () => {
  it("alle kombinasjoner av hovedforslag 30–100 og alternativ 0–100, med uklart og delvis", () => {
    const avvik: string[] = [];
    for (const grunnlag of ["uklart", "delvis"]) {
      for (let main = 30; main <= 100; main += 1) {
        for (let alt = 0; alt <= 100; alt += 1) {
          const uten = analyse(main, alt);
          const med = analyse(main, alt, grunnlag);
          if (harSterkereAlternativ(uten) !== harSterkereAlternativ(med)) avvik.push(`${grunnlag} ${main}/${alt}`);
          if (med.alternativer.length !== uten.alternativer.length) avvik.push(`${grunnlag} ${main}/${alt}: alternativ forsvant`);
          if (med.alternativer[0].confidence > med.confidence && uten.alternativer[0].confidence < uten.confidence) avvik.push(`${grunnlag} ${main}/${alt}: rekkefølge snudd`);
        }
      }
    }
    expect(avvik).toEqual([]);
  });

  it("flere alternativer: hver beholder sin plass i forhold til hovedforslaget", () => {
    for (const grunnlag of ["uklart", "delvis"]) {
      const r = analyse(85, 90, grunnlag, 84);
      expect(r.alternativer.map((a) => a.name).sort()).toEqual(["Brunrotte", "Liten skogmus"]);
      const brunrotte = r.alternativer.find((a) => a.name === "Brunrotte")!;
      const skogmus = r.alternativer.find((a) => a.name === "Liten skogmus")!;
      expect(brunrotte.confidence).toBeGreaterThanOrEqual(r.confidence); // var høyere – forblir minst like høy
      expect(skogmus.confidence).toBeLessThan(r.confidence); // var lavere – forblir lavere
      expect(harSterkereAlternativ(r)).toBe(true);
    }
  });
});
