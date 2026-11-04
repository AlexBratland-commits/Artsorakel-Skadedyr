import { describe, expect, it } from "vitest";
import { erHeltUtenforFaget } from "@/lib/server/chat-tema";

describe("chat: spørsmål helt utenfor skadedyrfaget", () => {
  it.each([
    "Hvem er kong Harald?",
    "hvem er Jonas Gahr Støre",
    "Skriv en stil om andre verdenskrig",
    "Hva er hovedstaden i Frankrike?",
    "Oversett dette til engelsk: god morgen",
    "Har du en oppskrift på lasagne?",
    "Hva er 17 * 23?",
  ])("blokkeres uten AI-kall: %s", (q) => {
    expect(erHeltUtenforFaget(q)).toBe(true);
  });

  it.each([
    "Er den farlig?",
    "Hvordan blir jeg kvitt den?",
    "Bør jeg ringe fagfolk?",
    "Hvorfor har jeg fått den inn?",
    "Hva kan dette være?",
    "Hvordan tar jeg et bedre bilde?",
    "Hvem er ansvarlig når jeg leier leiligheten?",
    "Hvem er Ocab?",
    "Hvor små åpninger kan mus komme gjennom?",
    "Kan skjeggkre leve i bøker?",
    "Er rotteekskrementer farlige for barn?",
    "Hva betyr det at de smuldrer?",
    "Dekker forsikringen dette?",
    "Og hva gjør jeg i hytta?",
  ])("går videre til fagassistenten: %s", (q) => {
    expect(erHeltUtenforFaget(q)).toBe(false);
  });
});
