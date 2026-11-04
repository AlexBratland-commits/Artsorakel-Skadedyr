/**
 * Faglig oppdatering kun for stokkmaur (godkjent av eier). Bare tiltak-feltet
 * er endret – kjennetegnene, som inngår i identifiseringsprompten, er uendret.
 */
import { describe, expect, it } from "vitest";
import { findPestInGroup, pestsInGroup } from "@/lib/pests";

const FUKT =
  "Stokkmaurangrep i bygninger er ofte knyttet til fukt, råte eller tidligere fuktskader. Undersøk særlig utsatte konstruksjoner, men vær oppmerksom på at stokkmaur også kan etablere seg i tørt trevirke.";
const REIR =
  "Stokkmaur kan også etablere reir i isolasjonsmaterialer og polystyren, blant annet under støpte dekker og i nærheten av varmekilder. Slike reir trenger ikke være knyttet til fukt eller råte.";

describe("stokkmaur", () => {
  const stokkmaur = findPestInGroup("Stokkmaur", "Maur")!;

  it("har de to godkjente formuleringene ordrett i tiltakene", () => {
    expect(stokkmaur.tiltak).toContain(FUKT);
    expect(stokkmaur.tiltak).toContain(REIR);
  });

  it("presenterer ikke fukt som nødvendig betingelse, og har ingen prosenttall", () => {
    const tekst = stokkmaur.tiltak.join(" ");
    expect(tekst).not.toMatch(/skyldes som oftest fukt/);
    expect(tekst).not.toMatch(/fuktig konstruksjonsvirke/);
    expect(tekst).not.toMatch(/%|prosent/);
  });

  it("de andre maurartene er uendret", () => {
    for (const p of pestsInGroup("Maur").filter((x) => x.norsk !== "Stokkmaur")) {
      expect(p.tiltak.join(" "), p.norsk).not.toMatch(/Stokkmaurangrep|polystyren/);
    }
  });
});
