# Leveranse A – Sikkerhet, kostnadskontroll og stabilitet

Gren: `claude/relaxed-feynman-84savk`. Ingenting er deployet til produksjon.
Artsbiblioteket, promptene og AI-modellene er **ikke** endret.
Steg-for-steg-veiledning for Vercel og OpenRouter: [veiledning-vercel-openrouter.md](veiledning-vercel-openrouter.md).

## Hva er endret

| Funn | Før | Nå |
|---|---|---|
| **S1** Ubegrenset felt | «storrelse» sendte ubegrenset tekst til AI-en (1,24 MB ble sendt to ganger i test) | Alle felter valideres. Valgfelter godtas bare med kjente verdier, fritekst renses og kuttes til 300 tegn. |
| **S2** Sårbart Next.js | 16.3.4 med 11 kjente sårbarheter, 3 kritiske | 16.4.5. Ubrukt bildeoptimalisering er slått av. `npm audit --omit=dev`: 0 sårbarheter. |
| **S3** sharp og SVG | sharp 0.35.4 (sårbar SVG-motor). En SVG merket som PNG ble tolket. | sharp 0.35.5. Filens faktiske format sjekkes før sharp, og det er satt et tak på antall piksler. |
| **S4** Bruksgrense | I minnet per instans, og kunne omgås med falsk IP-header | Lagdelt vern (se under). Tellerne ligger i Upstash og er atomiske. |
| **S5** Chatten | Kunne brukes uten analyse og godtok falsk historikk | Krever en signert billett fra en analyse. Tidligere svar må være signert, og antall spørsmål per analyse er begrenset. |
| **S6** Store filer | 60 MB ble lest inn før avvisning | Avvises ut fra `Content-Length` før innlesing |
| **S7** Reserveløsning | Originalfilen, med GPS, kunne sendes videre | Fjernet. Bildet avvises i stedet. Test bekrefter at EXIF og GPS fjernes. |
| **S8** Personvern | «Bildene lagres ikke hos oss» uten mer forklaring | Ny tekst i bunnen av siden og **utkast** til `/personvern` |
| **S9** Headere | Ingen sikkerhetsheadere, `X-Powered-By` synlig | CSP, X-Frame-Options, nosniff, Referrer- og Permissions-Policy, HSTS på Vercel |
| **Forbruk** | Ingen måling. Rå AI-svar ble logget ved feil. | Én JSON-logglinje per AI-kall og per analyse (tokens, kostnad, tid, utfall). Ingen bilder, brukertekst, IP-adresser eller nøkler. |
| **F8** Svak dekning | Ingen tidsgrense, engelsk «Failed to fetch» | Tidsgrense, norske feilmeldinger, og varsel hvis bildet er over 4 MB (Vercel-grensen) |
| **F10** Chat | Samtalen ble beholdt ved to «Ukjent» etter hverandre | Ny samtale for hver analyse |

### Tillegg etter tilbakemelding

**Upstash nede gir avvisning, ikke reserve i minnet (fail closed).**
Er Upstash satt opp, men svarer ikke (etter ett nytt forsøk og maks 2 sekunder ventetid), avvises nye
AI-kall med `503` og meldingen *«Artsorakel er midlertidig utilgjengelig fordi kontrollen av
bruksgrenser ikke svarer. Prøv igjen om noen minutter.»* Det samme gjelder innlogging med
tilgangskode, slik at koden ikke kan gjettes fritt mens grensen er nede. Testet både i API-et og i
nettleseren.

**Atomiske tellere, også ved samtidige forespørsler.**
Alle tellere er nå *ett* Lua-skript i Redis. Redis kjører et skript udelt, så to samtidige
forespørsler kan aldri lese samme verdi og begge slippe gjennom.
*Nytt funn under kontrollen:* den forrige løsningen (tre kall etter hverandre) kunne i et uheldig
øyeblikk lage en teller uten utløpstid. En slik teller nullstilles aldri, og brukeren ville til slutt
blitt sperret for godt. Feilen er rettet, og en test viser at en slik teller blir reparert.
Testet mot **ekte Redis 7.0**:

| Test | Resultat |
|---|---|
| 100 samtidige økninger av samme teller | 100 ulike verdier (1–100), og telleren har utløpstid |
| 60 samtidige reservasjoner mot plass til 25 | Nøyaktig 25 godtatt |
| 20 ansatte analyserer samtidig, døgnbudsjett 5 | Nøyaktig 5 godtatt (10 AI-kall), 15 avvist |
| 10 samtidige analyser mot kostnadsramme for 6 AI-kall | Maks 6 AI-kall, rammen ikke overskredet |

**Antallsgrenser og kostnadskontroll er nå to ulike ting.**

| Lag | Hva det teller | Hva det beskytter mot | Hvor |
|---|---|---|---|
| 1. Antallsgrenser | Forespørsler per enhet, per IP og per døgn | Misbruk og at én bruker tar alt. **Sier ingenting om kroner.** | Appen (Upstash) |
| 2. Kostnadsramme | Dollar per døgn for alle AI-kall | At dagens forbruk løper løpsk, uansett årsak | Appen (Upstash) |
| 3. Kredittak | Dollar på API-nøkkelen | Alt, også feil i appen. **Siste barriere.** | OpenRouter |

Slik virker kostnadsrammen:
1. Før hvert AI-kall holdes et beløp av, standard 0,02 USD. Det skjer i samme udelte operasjon som
   kontrollen av om det er plass, så samtidige kall ikke kan overskride rammen.
2. Etter kallet erstattes beløpet med den faktiske kostnaden:
   - Oppgir OpenRouter kostnaden i svaret, brukes den (`kostnad_kilde: openrouter` i loggen).
   - Ellers beregnes den fra tokens, hvis prisene er lagt inn (`beregnet`).
   - Ellers beholdes det avholdte beløpet som et forsiktig anslag (`reservert`).
3. Feilsvar fra OpenRouter faktureres ikke, og da frigis beløpet. Ved tidsavbrudd er det ukjent om
   kallet ble fakturert, og da beholdes beløpet.
4. Når dagens ramme (standard 10 USD) er brukt opp, avvises nye AI-kall med meldingen
   *«Artsorakel har nådd dagens kostnadsramme for AI-analyser. Prøv igjen i morgen, eller ring Ocab.»*

Rammen kan overskrides bare hvis ett enkelt kall koster mer enn det avholdte beløpet. Derfor bør
beløpet ligge over det et vanlig kall koster. Det ser du i loggene etter noen dager.
**Kredittaket i OpenRouter skal alltid være satt**, fordi det er den eneste grensen som ikke avhenger
av at appen virker.

## Endringer i API-kontrakten

- `/api/analyze`: samme felter inn og ut. **Nytt felt i svaret:** `chatToken`.
  Nye feilkoder:
  - `401`: bare når tilgangskode er slått på.
  - `503` med `kode`:
    - `dognbudsjett`: døgnets antall analyser er brukt opp.
    - `kostnadsramme`: dagens kostnadsramme er brukt opp.
    - `grensekontroll_utilgjengelig`: Upstash svarer ikke.
  - `413`: for høy oppløsning.

  Ukjente verdier i valgfelter ignoreres nå i stedet for å sendes til AI-en.
- `/api/ask-about-findings`: **krever** `chatToken`, og svaret har fått feltet `signatur`.
  Feltene `art`, `gruppe` og `annenArt` i forespørselen ignoreres. Arten hentes fra billetten.
  *Konsekvens:* chat om funn i historikken som ble lagret **før** oppdateringen, gir beskjed om å
  analysere bildet på nytt.
- Ny rute: `/api/tilgang` (GET/POST/DELETE) for tilgangskoden.

## Tester som er kjørt

| Kontroll | Resultat |
|---|---|
| TypeScript (`npm run typecheck`) | 0 feil |
| ESLint (`npm run lint`) | 0 feil, 0 advarsler |
| Enhets- og integrasjonstester (`npm test`) | **94 av 94 bestått** (13 filer), 10 av dem mot ekte Redis |
| UI-tester i Chromium på mobilvisning (`npm run test:ui`) | **7 av 7 bestått**, også «Upstash nede» |
| Produksjonsbygg | OK |
| Ren installasjon med npm 10 (som Vercel) | OK |
| `npm audit --omit=dev` | 0 sårbarheter |
| `npm audit` (inkludert utviklingsverktøy) | 16 moderate, alle i `minimatch` i ESLint-kjeden. Leveres ikke til produksjon. |
| `scripts/sjekk-upstash.mjs` mot ekte Redis | Godkjenner riktig oppsett, varsler ved feil nøkkel |

Alle tester bruker en **falsk AI-tjeneste**. De tester applikasjonslogikken, ikke hvor treffsikker
AI-en er. Grunnlinjetestene (`tests/integration/analyze-contract.test.ts`) ble tatt opp mot den
uendrede koden *før* endringene og består fortsatt. Promptene er altså byte-for-byte uendret.

Testene mot ekte Redis hoppes over automatisk hvis `redis-server` ikke er installert.
CI-oppsettet i leveranse B vil installere Redis, slik at testene alltid kjøres.

**Revisjonsangrepene på nytt, mot `next start` med falsk AI:**

| Angrep | Før | Nå |
|---|---|---|
| 1,24 MB i «storrelse» | 1 240 152 tegn sendt til AI-en | 69 og 46 tegn (feltet forkastes) |
| SVG som PNG | Tolket og sendt til AI-en | 415, AI-en kalles ikke |
| Ny falsk IP-header per forsøk | 12 av 12 godtatt | 429 etter 10 (Vercel-modus) |
| 60 MB opplasting | Lest inn, deretter 413 | 413 uten innlesing |
| Chat uten analyse, med falsk historikk | Godtatt | 401 |

## Tilbakerulling

- **Alt:** Vercels *Instant Rollback* til forrige produksjonsversjon, eller `git revert` av commitene.
- **Tilgangskoden:** Fjern `ARTSORAKEL_TILGANGSKODE`. Da er appen åpen igjen, som før.
- **Upstash:** Fjerner du begge variablene, brukes tellere i minnet igjen (svakere). Er Upstash nede
  over lengre tid, er dette nødløsningen for å holde appen i gang.
- **Kostnadsramme og grenser:** Kan justeres med miljøvariabler uten ny kode (se `.env.example`).
- **Sikkerhetsheadere:** Ligger i egen commit og kan reverteres for seg.

## Fortsatt usikkert

- **Upstash-tjenesten selv er ikke prøvd.** Skriptene er testet mot ekte Redis gjennom en oversetter
  som etterligner Upstash' REST-format. Bekreft med en analyse i forhåndsvisningen (se veiledningen):
  virker analysen, virker Upstash.
- **Om OpenRouter oppgir kostnaden i svaret, er ikke bekreftet.** Se etter `kostnad_kilde` i loggene
  etter første analyse. Står det `reservert`, legg inn prisene (se veiledningen), eller la det stå.
  Anslaget er da forsiktig, og kredittaket gjelder uansett.
- **Vercel-oppførsel er ikke testet på Vercel.** Det gjelder `x-real-ip` og HSTS, som settes ved bygg.
  Bekreftes i forhåndsvisningen.
- **Ekte AI-kall er ikke kjørt.** Snapshotene viser at forespørslene er identiske med før.
- **CSP er bare testet i Chromium.** Safari på iPhone bør prøves i forhåndsvisningen.
- **Personvernsiden er et utkast.** Ocab må godkjenne teksten.
- **Standardverdiene er anslag:** 20 analyser per enhet per time, 200 analyser per døgn og 10 USD
  per døgn. Juster dem etter en uke med logger.
