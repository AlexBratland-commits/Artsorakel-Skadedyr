/**
 * Stokkmaur: godkjente formuleringer fra fagansvarlig. Den nyeste
 * fuktformuleringen har forrang foran den eldre stokkmaurteksten om fukt.
 */
import { describe, expect, it } from "vitest";
import { findPestInGroup, pestsInGroup } from "@/lib/pests";

const FUKT =
  "Mauraktivitet i bygningskonstruksjoner kan være knyttet til fukt, råte eller tidligere vannskader. Det anbefales derfor å undersøke om det finnes underliggende fuktproblemer. Maur kan imidlertid også etablere seg i tørre konstruksjoner. Ved mistanke om maurreir i bygningen bør en profesjonell skadedyrbekjemper vurdere forholdene og behovet for videre undersøkelser.";
const REIR =
  "Stokkmaur kan også etablere reir i isolasjonsmaterialer og polystyren, blant annet under støpte dekker og i nærheten av varmekilder. Slike reir trenger ikke være knyttet til fukt eller råte.";
const FORSIKRING = "Om skaden dekkes av forsikringen, avhenger av vilkårene i den enkelte forsikringsavtalen.";

describe("stokkmaur", () => {
  const stokkmaur = findPestInGroup("Stokkmaur", "Maur")!;

  it("har de godkjente formuleringene ordrett i tiltakene", () => {
    expect(stokkmaur.tiltak).toContain(FUKT);
    expect(stokkmaur.tiltak).toContain(REIR);
    expect(stokkmaur.tiltak.join(" ")).toContain(FORSIKRING);
  });

  it("fukt er med, men ikke som nødvendig betingelse – og ingen løfter om forsikring", () => {
    const tekst = stokkmaur.tiltak.join(" ");
    expect(tekst).toMatch(/fukt, råte eller tidligere vannskader/);
    expect(tekst).not.toMatch(/skyldes som oftest fukt/);
    expect(tekst).not.toMatch(/ofte dekket av boligforsikring|dekkes ofte av/);
    expect(tekst).not.toMatch(/%|prosent/);
    // Den eldre fuktteksten er erstattet av den nyere godkjente
    expect(tekst).not.toMatch(/Stokkmaurangrep i bygninger er ofte knyttet til fukt/);
  });

  it("isolasjons- og polystyrenteksten er bare på stokkmaur", () => {
    for (const p of pestsInGroup("Maur").filter((x) => x.norsk !== "Stokkmaur")) {
      expect(p.tiltak.join(" "), p.norsk).not.toMatch(/Stokkmaurangrep|polystyren/);
    }
  });
});

describe("maur og fukt i de fire berørte artene", () => {
  it("stokkmaur, brun tremaur, svart tremaur og svart jordmaur har den godkjente fuktformuleringen", () => {
    for (const navn of ["Stokkmaur", "Brun tremaur", "Svart tremaur", "Svart jordmaur"]) {
      const p = findPestInGroup(navn, "Maur")!;
      expect(p.tiltak, navn).toContain(FUKT);
      expect(p.tiltak.join(" "), navn).not.toMatch(/Maur inne skyldes som oftest fukt/);
    }
  });

  it("svart jordmaur skiller tilfeldige maur fra reir i konstruksjonen", () => {
    expect(findPestInGroup("Svart jordmaur", "Maur")!.tiltak.join(" ")).toMatch(
      /Maur som bare kommer inn etter mat, trenger ikke ha reir i bygningen/
    );
  });

  it("brun tremaur: etablert angrep bagatelliseres ikke, og ingen giftinstruksjoner", () => {
    const p = findPestInGroup("Brun tremaur", "Maur")!;
    expect(p.alvorlighet).toBe("middels");
    expect(p.tiltak.join(" ")).toMatch(/Reir inne i bygningskonstruksjoner bør undersøkes – et etablert angrep kan kreve profesjonell bekjempelse/);
    expect(p.tiltak.join(" ")).not.toMatch(/(^|[^r])åte|giftåte|gift |insektmiddel|spray/i); // «råte» er lov
  });
});

describe("størrelsessammenligninger mellom de fire maurartene", () => {
  it("ingen bruker den gamle stokkmaurstørrelsen 6–18 mm, og arbeidere og dronninger skilles", () => {
    for (const navn of ["Stokkmaur", "Brun tremaur", "Svart tremaur", "Svart jordmaur"]) {
      const t = JSON.stringify(findPestInGroup(navn, "Maur"));
      expect(t, navn).not.toMatch(/6–18 mm/);
    }
    for (const navn of ["Brun tremaur", "Svart tremaur", "Svart jordmaur"]) {
      const stokk = findPestInGroup(navn, "Maur")!.forveksles!.find((f) => f.startsWith("Stokkmaur"))!;
      expect(stokk, navn).toMatch(/arbeidere ca\. 5–14 mm, dronninger opptil 18 mm/);
    }
  });

  it("brun tremaur sammenlignes med de andre der det hjelper artsbestemmelsen", () => {
    for (const navn of ["Stokkmaur", "Svart tremaur", "Svart jordmaur"]) {
      const f = findPestInGroup(navn, "Maur")!.forveksles!.find((x) => x.startsWith("Brun tremaur"));
      expect(f, navn).toMatch(/lysebrun mellomkropp/);
    }
    const brun = findPestInGroup("Brun tremaur", "Maur")!.forveksles!.map((x) => x.split(" –")[0]);
    expect(brun).toEqual(["Svart jordmaur", "Svart tremaur", "Stokkmaur"]);
  });
});
