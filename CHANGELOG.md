# Endringslogg

## Uutgitt – justeringer etter test i Preview

- Artsavhengige tetteråd: mus fra omtrent 4–6 mm, rotte fra omtrent 10–14 mm, og
  kartlegging før en aktiv inngang tettes (bare tiltak-tekster – identifiseringen er uendret).
- Chat: helt irrelevante spørsmål får et fast svar uten AI-kall. Skjerpet chat-instruks.
- Ekskrementer: forbehold om mus og flaggermus, og tips om størrelse og beskrivelse når de mangler.
- Bilder uten skadedyr vises som «Ingen skadedyr på bildet».

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
- Bruksgrenser per enhet og IP, og felles døgnbudsjett. Tellerne ligger i Upstash (se Kostnadskontroll).
- Chatten krever en signert billett fra en analyse, og falsk samtalehistorikk avvises.
- Sikkerhetsheadere (CSP, rammevern, HSTS på Vercel). `X-Powered-By` er fjernet.

### Kostnadskontroll (tre lag)
- Antallsgrenser: per enhet, per IP og per døgn. Hindrer misbruk, men sier ingenting om kroner.
- Kostnadsramme i USD per døgn: beløpet reserveres før hvert AI-kall og avregnes mot faktisk
  kostnad etterpå. Når rammen er nådd, avvises nye AI-kall.
- OpenRouter-saldo uten automatisk påfyll: siste barriere, utenfor appen.
- Alle tellere er atomiske Lua-skript i Redis. Testet med samtidige forespørsler mot ekte Redis.
- Er Upstash satt opp, men nede, avvises AI-kall midlertidig med norsk melding (ingen reserve i minnet).
- Rettet: en teller kunne i sjeldne tilfeller bli liggende uten utløpstid.
- IP-adresser lagres bare som anonymisert verdi (HMAC) i Upstash.

### Ferdigstilling av leveranse A
- Vercel Production/Preview bruker aldri tellere i minnet. Mangler Upstash, avvises AI-kall.
- Påkrevde innstillinger i Vercel Production/Preview: `ARTSORAKEL_HEMMELIGHET`
  og Upstash. Ellers `503 ikke_konfigurert`. Tilgangskoden er valgfri.
- Tom OpenRouter-saldo gir en egen norsk melding.
- Veiledningen anbefaler ikke å slå av sikkerhetsfunksjoner som nødløsning.

### Stabilitet og drift
- Logging av forbruk per AI-kall (tokens, kostnad, tid) uten personopplysninger.
- Tidsgrense og norske feilmeldinger ved dårlig dekning.
- Varsel når bildet er for stort for Vercel (over 4 MB etter komprimering).
- Ny chatsamtale for hver analyse.

### Personvern
- Ny personverntekst i bunnen av siden og **utkast** til `/personvern` (må godkjennes av Ocab).

### Kvalitet
- Testoppsett: Vitest (94 tester, hvorav 10 mot ekte Redis) og Playwright (7 UI-tester), alle mot en falsk AI.
- `.env.example` dokumenterer alle miljøvariabler.
- `scripts/sjekk-upstash.mjs` sjekker Upstash-oppsettet med appens egne Lua-skript.
- Veiledning for oppsett i OpenRouter og Vercel: docs/veiledning-vercel-openrouter.md.
