/**
 * H3 (revisjon), punkt 6: «Mulig Markkakerlakk» (art utenfor listen) viste
 * «høy sikkerhet» på resultatsiden, mens «Meld fra om feil bestemmelse» sa
 * «lav» og «modellens tall: 0» (result.confidence er 0 for ukjente funn).
 * Nå bruker skjerm, e-post, historikk og PDF samme tall – ingen nye tall.
 * Markkakerlakk er senere lagt i biblioteket; testen bruker nå en annen
 * Ectobius-art som fortsatt er utenfor listen.
 * Feilet på main 6541875 og består etter rettelsen.
 */
import { describe, expect, it } from "vitest";
import { enrich } from "@/lib/identification";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { annenArtTekst, feilmeldingTekst, visningsSikkerhet } from "@/lib/resultat-tekst";

const markkakerlakk = () =>
  enrich(
    { found: false, name: "Ukjent", latinName: "Ukjent", description: "x", confidence: 0, annenArt: { name: "Skogkakerlakk", latinName: "Ectobius sylvestris", confidence: 85, hvorfor: "" } },
    "Kakerlakker"
  );

describe("H3: samme sikkerhet overalt", () => {
  it("art utenfor listen: AI-ens tall for den arten, ikke 0", () => {
    const r = markkakerlakk();
    expect(r.confidence).toBe(0);
    expect(visningsSikkerhet(r)).toEqual({ confidence: 85, etikett: "Høy sikkerhet" });
    expect(annenArtTekst(r)).toContain("(høy sikkerhet)");
    const tekst = feilmeldingTekst(r);
    expect(tekst).toContain("Appen foreslo Mulig Skogkakerlakk (Ectobius sylvestris) – ikke i databasen, sikkerhet: høy sikkerhet (tall i analysen: 85).");
    expect(tekst).not.toMatch(/lav sikkerhet|: 0\)/);
    expect(lagRapportInnhold(r, { analyseTid: new Date() }).merknader.join(" ")).toContain("(høy sikkerhet)");
  });

  it("kjent art: samme nivå og tall som på skjermen", () => {
    const r = enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 65 }, "Gnagere");
    expect(visningsSikkerhet(r)).toEqual({ confidence: 65, etikett: "Middels sikkerhet" });
    expect(feilmeldingTekst(r)).toContain("Appen foreslo Husmus (Mus musculus), sikkerhet: middels sikkerhet (tall i analysen: 65).");
  });

  it("ukjent funn: ingen sikkerhet og ingen oppdiktet «0»", () => {
    const r = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "x", confidence: 0 }, "Gnagere");
    expect(visningsSikkerhet(r)).toBeUndefined();
    const tekst = feilmeldingTekst(r);
    expect(tekst).toContain("Appen kunne ikke identifisere funnet sikkert.");
    expect(tekst).not.toMatch(/sikkerhet:|tall i analysen|\(Ukjent\)/);
  });

  it("motstridende navn: ingen sikkerhet, men de mulige artene", () => {
    const r = enrich({ found: true, name: "Klatremus", latinName: "Myodes rutilus", description: "x", confidence: 90 }, "Gnagere");
    expect(visningsSikkerhet(r)).toBeUndefined();
    const tekst = feilmeldingTekst(r);
    expect(tekst).toContain("Appen kunne ikke identifisere funnet sikkert.");
    expect(tekst).toContain("Motstridende artsnavn – mulige arter: Klatremus (Myodes glareolus), Rødmus (Myodes rutilus).");
    expect(tekst).not.toMatch(/sikkerhet:|90/);
  });
});
