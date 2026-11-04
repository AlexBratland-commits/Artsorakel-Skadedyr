/**
 * Gjør tekniske feil i nettleseren om til forståelige norske meldinger (F8).
 * Uten dette ser brukeren nettleserens engelske tekst («Failed to fetch»)
 * når dekningen er dårlig.
 */
export function nettverksfeil(error: unknown, standard: string): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Det tok for lang tid å få svar. Sjekk dekningen og prøv igjen.";
  }
  // fetch() kaster TypeError når nettverket svikter («Failed to fetch»,
  // «Load failed», «NetworkError …» avhengig av nettleser).
  if (error instanceof TypeError) {
    return "Fikk ikke kontakt med Artsorakel. Sjekk nettforbindelsen og prøv igjen.";
  }
  if (error instanceof Error && error.message) return error.message;
  return standard;
}
