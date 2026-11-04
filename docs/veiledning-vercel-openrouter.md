# Veiledning: ta i bruk leveranse A i Vercel

Skrevet for deg som ikke programmerer selv. Følg stegene i rekkefølge.
Ingenting her endrer produksjonen før **Del 4**. Knappene kan hete litt annerledes enn her – se
etter ordene i *kursiv*.

## Om kostnader og OpenRouter – ingen endring nødvendig

OpenRouter-kontoen har en forhåndsbetalt saldo, og automatisk påfyll er slått av. **Saldoen er
derfor den siste kostnadsbarrieren:** når den er brukt opp, stopper AI-funksjonene, og
Artsorakel viser *«AI-tjenesten er midlertidig stoppet fordi saldoen er brukt opp …»*.
Du fyller på manuelt i OpenRouter når du vil. Du trenger ikke endre nøkler eller abonnement.

I tillegg har appen enkle grenser per ansatt, per nettverk og per døgn, og den logger forbruket
(se Del 3, punkt 5).

---

## Del 1 – Koble til Upstash (10 minutter)

Upstash holder tellerne for grensene felles for alle serverne.
**I Vercel Production og Preview er Upstash påkrevd:** mangler det, avviser appen analyser
med meldingen *«Artsorakel er ikke ferdig satt opp på serveren …»*.

1. Gå til **vercel.com**, logg inn og åpne prosjektet for Artsorakel.
2. Fanen *Storage* → *Create Database* (eller *Connect Store*) → velg **Upstash** → *Redis*.
3. Velg en region **i Europa** (Frankfurt) og gratisplanen (*Free*).
4. Koble databasen til prosjektet (*Connect*) og kryss av for *Production* og *Preview*
   (gjerne også *Development*).
5. Vercel legger selv inn `KV_REST_API_URL` og `KV_REST_API_TOKEN`. Du trenger ikke kopiere noe.

## Del 2 – Legg inn de to sikkerhetsinnstillingene (5 minutter)

*Settings* → *Environment Variables* → *Add*. Kryss av for *Sensitive* hvis valget finnes.
**Begge er påkrevd i Production og Preview.**

| Navn | Verdi | Miljø |
|---|---|---|
| `ARTSORAKEL_HEMMELIGHET` | En lang, tilfeldig tekst, minst 40 tegn. Lag den med passordgeneratoren i passordbehandleren. Den skal ikke huskes. | Production **og** Preview |
| `ARTSORAKEL_TILGANGSKODE` | Koden de ansatte skal bruke, minst 12 tegn. For eksempel tre ord og et tall: `rotte-fjord-lampe-42` | Production **og** Preview |

Ikke endre `OPENROUTER_API_KEY` eller modellinnstillingene.

> En endret innstilling virker først etter neste deploy (Del 3, punkt 2).

## Del 3 – Test i forhåndsvisningen (Preview) (15 minutter)

1. *Deployments* → finn den øverste deployen fra grenen `claude/relaxed-feynman-84savk` (merket
   *Preview*).
2. Tre prikker → *Redeploy*, så innstillingene kommer med. Vent til den er *Ready*.
3. Åpne forhåndsvisningen på mobilen (*Visit*). Kanskje må du logge inn hos Vercel først.
4. Sjekkliste, gjerne på både iPhone (Safari) og Android (Chrome):
   - [ ] Du blir bedt om tilgangskoden. Feil kode gir «Feil tilgangskode.», riktig kode slipper deg inn.
   - [ ] *Ta bilde* åpner kameraet.
   - [ ] En analyse gir et resultat. **Da vet du at Upstash og innstillingene er riktige.**
   - [ ] Chatten svarer, også på et oppfølgingsspørsmål.
   - [ ] Lenken *Personvern* nederst virker.
5. Valgfritt: åpne deployen → *Logs* og søk etter `ai_kall`. Linjene viser forbruket
   (`tokens_inn`, `tokens_ut` og eventuelt `kostnad_usd`).

## Del 4 – Ta i bruk i produksjon (når du har godkjent)

1. Gi tilgangskoden til de ansatte. De skriver den inn én gang per mobil eller PC.
2. Godkjenn personvernteksten i Ocab.
3. Åpne PR #6 på GitHub og klikk *Merge pull request*. Vercel lager en ny produksjonsversjon.

---

## Hvis noe går galt

Sikkerhetsfunksjonene skal **ikke** slås av for å få appen i gang igjen. Bruk heller dette:

| Det du ser | Hva du gjør |
|---|---|
| «… ikke ferdig satt opp på serveren …» | En påkrevd innstilling mangler. Sjekk Del 1 og 2 for riktig miljø (Production/Preview), og velg *Redeploy*. |
| «… midlertidig utilgjengelig fordi kontrollen av bruksgrenser ikke svarer …» | Upstash svarer ikke. Vent noen minutter. Varer det, sjekk at databasen fortsatt er koblet til i *Storage*, og se status hos Upstash. |
| «AI-tjenesten er midlertidig stoppet fordi saldoen er brukt opp …» | Fyll på saldoen i OpenRouter. |
| Ansatte kommer ikke inn | Sjekk at koden stemmer med `ARTSORAKEL_TILGANGSKODE`. Ny kode: legg den inn ved siden av den gamle, skilt med komma, og fjern den gamle senere. |
| Noe annet er feil etter en ny produksjonsversjon | *Deployments* → velg forrige produksjonsversjon → *Instant Rollback*. Det ruller tilbake koden, uten å svekke sikkerheten i den nye versjonen. |

## Når appen skal brukes mer

Skal Artsorakel lanseres offisielt eller brukes i større skala, skal løsningen overleveres til Ocabs
IT-avdeling for vurdering av sikkerhet, personvern, tilgangsstyring og drift. Den enkle
tilgangskoden er laget for dagens interne testfase.
