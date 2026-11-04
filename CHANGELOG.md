# Endringslogg

## Uutgitt – leveranse A: sikkerhet, kostnadskontroll og stabilitet

Detaljer, tester og driftssteg: [docs/leveranse-a.md](docs/leveranse-a.md).
Artsbiblioteket, promptene og AI-modellene er uendret.

### Sikkerhet
- Alle API-felter valideres. Feltet «storrelse» kunne før sende ubegrenset tekst til AI-en.
- Next.js 16.4.5 og sharp 0.35.5 (kjente sårbarheter). Bildeoptimaliseringen er slått av.
- Bildets faktiske format sjekkes før bildemotoren, og antall piksler har fått et tak.
  Originalfilen sendes aldri videre.
- For store forespørsler avvises før de leses inn.
- Valgfri tilgangskode for ansatte (`ARTSORAKEL_TILGANGSKODE`).
- Bruksgrenser per enhet og IP, og felles døgnbudsjett. Tellerne ligger i Upstash, med minne som reserve.
- Chatten krever en signert billett fra en analyse, og falsk samtalehistorikk avvises.
- Sikkerhetsheadere (CSP, rammevern, HSTS på Vercel). `X-Powered-By` er fjernet.

### Stabilitet og drift
- Logging av forbruk per AI-kall (tokens, kostnad, tid) uten personopplysninger.
- Tidsgrense og norske feilmeldinger ved dårlig dekning.
- Varsel når bildet er for stort for Vercel (over 4 MB etter komprimering).
- Ny chatsamtale for hver analyse.

### Personvern
- Ny personverntekst i bunnen av siden og **utkast** til `/personvern` (må godkjennes av Ocab).

### Kvalitet
- Testoppsett: Vitest (73 tester) og Playwright (6 UI-tester), alle mot en falsk AI.
- `.env.example` dokumenterer alle miljøvariabler.
- `scripts/sjekk-upstash.mjs` sjekker Upstash-oppsettet.
