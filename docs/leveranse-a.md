# Leveranse A – Sikkerhet, kostnadskontroll og stabilitet

Gren: `claude/relaxed-feynman-84savk`. Ingenting er deployet.
Artsbiblioteket, promptene og AI-modellene er **ikke** endret.

## Hva er endret

| Funn | Før | Nå |
|---|---|---|
| **S1** Ubegrenset felt | «storrelse» sendte ubegrenset tekst til AI-en (1,24 MB ble sendt to ganger i test) | Alle felter valideres. Valgfelter godtas bare med kjente verdier, fritekst renses og kuttes til 300 tegn. |
| **S2** Sårbart Next.js | 16.3.4 med 11 kjente sårbarheter, 3 kritiske | 16.4.5. Ubrukt bildeoptimalisering er slått av. `npm audit --omit=dev`: 0 sårbarheter. |
| **S3** sharp og SVG | sharp 0.35.4 (sårbar SVG-motor). En SVG merket som PNG ble tolket. | sharp 0.35.5. Filens faktiske format sjekkes før sharp, og det er satt et tak på antall piksler. |
| **S4** Bruksgrense | I minnet per instans, og kunne omgås med falsk IP-header | Lagdelt vern: valgfri tilgangskode, grense per enhet og per IP (IPv6 per /64), felles døgnbudsjett. Tellerne ligger i Upstash, med minne som reserve. |
| **S5** Chatten | Kunne brukes uten analyse og godtok falsk historikk | Krever en signert billett fra en analyse. Tidligere svar må være signert, og antall spørsmål per analyse er begrenset. |
| **S6** Store filer | 60 MB ble lest inn før avvisning | Avvises ut fra `Content-Length` før innlesing |
| **S7** Reserveløsning | Originalfilen, med GPS, kunne sendes videre | Fjernet. Bildet avvises i stedet. Test bekrefter at EXIF og GPS fjernes. |
| **S8** Personvern | «Bildene lagres ikke hos oss» uten mer forklaring | Ny tekst i bunnen av siden og **utkast** til `/personvern` |
| **S9** Headere | Ingen sikkerhetsheadere, `X-Powered-By` synlig | CSP, X-Frame-Options, nosniff, Referrer- og Permissions-Policy, HSTS på Vercel |
| **A6** Forbruk | Ingen måling. Rå AI-svar ble logget ved feil. | Én JSON-logglinje per AI-kall og per analyse (tokens, kostnad, tid, utfall). Ingen bilder, brukertekst, IP-adresser eller nøkler. |
| **F8** Svak dekning | Ingen tidsgrense, engelsk «Failed to fetch» | Tidsgrense, norske feilmeldinger, og varsel hvis bildet er over 4 MB (Vercel-grensen) |
| **F10** Chat | Samtalen ble beholdt ved to «Ukjent» etter hverandre | Ny samtale for hver analyse |

Ny kode ligger i `src/lib/server/`. Kode som var kopiert i begge API-rutene er samlet der:
AI-klient, opprinnelsessjekk, IP-adresse og konfigurasjon.

## Endringer i API-kontrakten

- `/api/analyze`: samme felter inn og ut. **Nytt felt i svaret:** `chatToken`.
  Nye feilkoder: `401` (bare når tilgangskode er slått på), `503` (døgnbudsjettet er brukt opp)
  og `413` (for høy oppløsning). Ukjente verdier i valgfelter ignoreres nå i stedet for å sendes til AI-en.
- `/api/ask-about-findings`: **krever** `chatToken`, og svaret har fått feltet `signatur`.
  Feltene `art`, `gruppe` og `annenArt` i forespørselen ignoreres. Arten hentes fra billetten.
  *Konsekvens:* chat om funn i historikken som ble lagret **før** oppdateringen, gir beskjed om å analysere på nytt.
- Ny rute: `/api/tilgang` (GET/POST/DELETE) for tilgangskoden.

## Tester som er kjørt

| Kontroll | Resultat |
|---|---|
| TypeScript (`npm run typecheck`) | 0 feil |
| ESLint (`npm run lint`) | 0 feil, 0 advarsler |
| Enhets- og integrasjonstester (`npm test`) | **73 av 73 bestått** (10 filer) |
| UI-tester i Chromium på mobilvisning (`npm run test:ui`) | **6 av 6 bestått** |
| Produksjonsbygg | OK |
| Ren installasjon med npm 10 (som Vercel) | OK |
| `npm audit --omit=dev` | 0 sårbarheter |
| `npm audit` (inkludert utviklingsverktøy) | 16 moderate, alle i `minimatch` i ESLint-kjeden. Rettingen krever en større oppgradering av ESLint, og verktøyene leveres ikke til produksjon. |
| Angrepene fra revisjonen kjørt på nytt mot ny kode | Alle stoppet (se under) |

Alle tester bruker en **falsk AI-tjeneste**. De tester applikasjonslogikken, ikke hvor treffsikker
AI-en er. Grunnlinjetestene (`tests/integration/analyze-contract.test.ts`) ble tatt opp mot den
uendrede koden *før* endringene og består fortsatt. Promptene som sendes til AI-en er altså
byte-for-byte uendret.

**Revisjonsangrepene på nytt, mot `next start` med falsk AI:**

| Angrep | Før | Nå |
|---|---|---|
| 1,24 MB i «storrelse» | 1 240 152 tegn sendt til AI-en | 69 og 46 tegn (feltet forkastes) |
| SVG som PNG | Tolket og sendt til AI-en | 415, AI-en kalles ikke |
| Ny falsk IP-header per forsøk | 12 av 12 godtatt | 429 etter 10 (Vercel-modus) |
| 60 MB opplasting | Lest inn, deretter 413 | 413 uten innlesing |
| Chat uten analyse, med falsk historikk | Godtatt | 401 |

## Slik tas leveransen i bruk (i denne rekkefølgen)

1. **Kredittak hos OpenRouter.** Sett maks forbruk på nøkkelen. Det er det viktigste enkelttiltaket.
2. **Upstash:** I Vercel, gå til *Storage → Upstash for Redis* og koble databasen til prosjektet.
   Da settes `KV_REST_API_URL` og `KV_REST_API_TOKEN` automatisk. Sjekk at det virker:
   `vercel env pull .env.local` og deretter `node --env-file=.env.local scripts/sjekk-upstash.mjs`.
3. **`ARTSORAKEL_HEMMELIGHET`:** Sett en lang, tilfeldig verdi, for eksempel `openssl rand -base64 32`.
4. **Test i en forhåndsvisning (Preview)** av grenen: analyse, chat, kamera på iPhone og Android.
5. **`ARTSORAKEL_TILGANGSKODE`:** Sett først i Preview, deretter i Production, og gi koden til de ansatte.
   Bruk minst 12 tegn. Koden kan byttes uten at alle logges ut på en gang: legg inn den nye koden
   kommaseparert ved siden av den gamle, og fjern den gamle senere.
6. Slå sammen med `main` når forhåndsvisningen er godkjent.

Alle variabler er beskrevet i `.env.example`.

> **Merk:** Er Vercel koblet til GitHub, lager Vercel vanligvis en *forhåndsvisning* (Preview)
> automatisk når grenen pushes. Produksjonen endres ikke før grenen slås sammen med `main`.

## Tilbakerulling

- **Alt:** Vercels *Instant Rollback* til forrige produksjonsversjon, eller `git revert` av commitene.
- **Tilgangskoden:** Fjern `ARTSORAKEL_TILGANGSKODE`. Da er appen åpen igjen, som før.
- **Upstash:** Fjern variablene. Da brukes tellere i minnet, som før.
- **Sikkerhetsheadere:** Ligger i egen commit (`Sikkerhetsheadere: …`) og kan reverteres for seg.
- **Grensene:** Kan justeres med miljøvariabler uten ny kode (se `.env.example`).

## Fortsatt usikkert

- **Upstash er ikke testet mot en ekte Upstash-database.** Nettverket i utviklingsmiljøet var stengt.
  Formatet følger Upstash' REST-dokumentasjon og er enhetstestet. Feiler det, faller appen tilbake
  til tellere i minnet, så appen stopper ikke. Kjør `scripts/sjekk-upstash.mjs` (steg 2).
- **Vercel-oppførsel er ikke testet på Vercel.** Det gjelder `x-real-ip` og HSTS, som settes ved bygg.
  Bekreftes i forhåndsvisningen.
- **Ekte AI-kall er ikke kjørt.** Snapshotene viser at forespørslene er identiske med før.
  Det bør likevel gjøres én ekte analyse i forhåndsvisningen.
- **CSP er bare testet i Chromium.** Safari på iPhone bør prøves i forhåndsvisningen, særlig kamera og deling.
- **Personvernsiden er et utkast.** Ocab må vurdere teksten, behandlingsgrunnlag,
  databehandleravtaler og overføring ut av EØS.
- **Standardgrensene er anslag** ut fra volumet «under 50 analyser per døgn»:
  20 per enhet per time, 60 per IP per time og 200 per døgn totalt.
- **CSP med `'unsafe-inline'` for skript** er Next.js' anbefalte løsning uten nonce. En strengere
  CSP med nonce gjør alle sider dynamiske og er utsatt.
