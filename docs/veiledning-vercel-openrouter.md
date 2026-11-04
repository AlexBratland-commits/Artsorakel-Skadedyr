# Veiledning: ta i bruk leveranse A i OpenRouter og Vercel

Denne veiledningen er skrevet for deg som ikke programmerer selv. Følg stegene i rekkefølge.
Ingenting her endrer produksjonen før **Del 5**.

Knappene i OpenRouter og Vercel kan hete litt annerledes enn her, fordi sidene endres jevnlig.
Se etter ordene i *kursiv*.

---

## Del 1 – OpenRouter: sett et kredittak (5 minutter)

Kredittaket er den **siste sikkerhetsbarrieren**. Det virker selv om appen skulle ha en feil.

1. Gå til **openrouter.ai** og logg inn.
2. Åpne *Settings* → *API Keys* (eller *Keys*).
3. Finn nøkkelen som Artsorakel bruker. Navnet er det dere ga den da den ble laget.
   Er du usikker på hvilken det er, se **Tips 1** nederst.
4. Klikk på nøkkelen for å redigere den, og finn *Credit limit*.
   - Sett et beløp du er komfortabel med å tape i verste fall i løpet av en måned.
     **Forslag: 50 USD.**
   - Velg at grensen skal nullstilles *Monthly* (månedlig), hvis valget finnes.
   - Lagre.
5. Gå til *Credits* (saldo). Er *Auto top-up* (automatisk påfyll) slått på, bør du vurdere å slå det
   av eller sette et lavt beløp. Kredittaket på nøkkelen gjelder uansett.

**Hva skjer når taket er nådd?** OpenRouter avviser nye kall. Artsorakel viser da
«Analysen feilet. Prøv igjen om litt.» helt til du hever taket eller måneden er omme.

---

## Del 2 – Vercel: koble til Upstash (10 minutter)

Upstash holder tellerne for grenser og kostnadsramme felles for alle serverne.

1. Gå til **vercel.com**, logg inn og åpne prosjektet for Artsorakel.
2. Åpne fanen *Storage*.
3. Klikk *Create Database* (eller *Connect Store* / *Browse Marketplace*) og velg
   **Upstash** → *Redis*.
4. Velg en region **i Europa**, helst samme region som Vercel-funksjonene dine.
   Du finner den under *Settings* → *Functions* → *Function Region*. **Frankfurt** er et godt valg.
   Velg gratisplanen (*Free*).
5. Når databasen er laget, velger du å koble den til prosjektet (*Connect*). Kryss av for
   *Production*, *Preview* og *Development*.
6. Vercel legger nå selv inn to innstillinger: `KV_REST_API_URL` og `KV_REST_API_TOKEN`.
   Du trenger ikke kopiere noe.

---

## Del 3 – Vercel: legg inn innstillinger (5 minutter)

Åpne *Settings* → *Environment Variables* i prosjektet. For hver innstilling under klikker du
*Add* (eller *Add New*), skriver inn navnet og verdien, velger miljø og lagrer.
Kryss av for *Sensitive* hvis valget finnes.

| Navn | Verdi | Miljø |
|---|---|---|
| `ARTSORAKEL_HEMMELIGHET` | En lang, tilfeldig tekst, minst 40 tegn. Lag den med passordgeneratoren i passordbehandleren din. Den skal ikke huskes. | Production **og** Preview |
| `ARTSORAKEL_TILGANGSKODE` | Koden de ansatte skal bruke, minst 12 tegn. Forslag: tre tilfeldige ord, for eksempel `rotte-fjord-lampe-42`. | **Bare Preview** foreløpig |
| `ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD` | `5` (valgfritt – uten denne er dagsrammen 10 USD) | Production **og** Preview |

Ikke endre `OPENROUTER_API_KEY` eller modellinnstillingene.

> En endret innstilling virker først etter neste deploy (se Del 4, punkt 2).

---

## Del 4 – Test i forhåndsvisningen (Preview) (15 minutter)

En forhåndsvisning er en egen testversjon med egen adresse. Produksjonen påvirkes ikke.

1. Åpne fanen *Deployments* i Vercel. Finn den øverste deployen fra grenen
   `claude/relaxed-feynman-84savk`. Den er merket *Preview*.
2. Klikk på de tre prikkene ved den og velg *Redeploy*, slik at innstillingene fra Del 3 kommer med.
   Vent til den står som *Ready*.
3. Åpne forhåndsvisningen fra mobilen, via *Visit* eller lenken. Kanskje må du logge inn hos Vercel
   først.
4. Gå gjennom denne sjekklisten, gjerne både på iPhone (Safari) og Android (Chrome):
   - [ ] Du blir bedt om tilgangskoden. Feil kode gir «Feil tilgangskode.», og riktig kode slipper deg inn.
   - [ ] *Ta bilde* åpner kameraet.
   - [ ] En analyse gir et resultat. **Da vet du også at Upstash virker.** Hvis ikke, ville du fått
     «midlertidig utilgjengelig».
   - [ ] Spør i chatten («Er den farlig?»), og still et oppfølgingsspørsmål.
   - [ ] Lenken *Personvern* nederst på siden virker.
5. Sjekk kostnadsloggen. Åpne deployen → *Logs* (eller *Runtime Logs*) og søk etter `ai_kall`.
   Hver linje viser `tokens_inn`, `tokens_ut` og `kostnad_kilde`:
   - `openrouter`: den faktiske kostnaden brukes. Bra, du trenger ikke gjøre mer.
   - `reservert`: OpenRouter oppgir ikke kostnaden, og appen bruker et forsiktig anslag
     (0,02 USD per kall). Det er trygt. Se **Tips 2** hvis du vil ha nøyaktige tall.

---

## Del 5 – Ta i bruk i produksjon (når du er fornøyd)

1. Legg inn `ARTSORAKEL_TILGANGSKODE` for **Production** også (som i Del 3).
2. Gi koden til de ansatte. De skriver den inn én gang per mobil eller PC.
3. Åpne pull requesten på GitHub og klikk *Merge pull request*. Vercel lager da en ny
   produksjonsversjon automatisk.
4. Etter en uke: se i loggene hvor mye en analyse faktisk koster, og juster dagsrammen om nødvendig.

---

## Hvis noe går galt

| Det du ser | Hva du gjør |
|---|---|
| «Artsorakel er midlertidig utilgjengelig …» | Upstash svarer ikke. Vent noen minutter. Varer det, er nødløsningen å koble Upstash fra prosjektet (*Storage*) og velge *Redeploy*. Da brukes enklere grenser til problemet er løst. |
| Ansatte kommer ikke inn | Sjekk at koden stemmer. Nødløsning: slett `ARTSORAKEL_TILGANGSKODE` og velg *Redeploy*. Da er appen åpen som før. |
| «Analysen feilet» for alle | Sjekk saldoen og kredittaket hos OpenRouter (Del 1). |
| «… dagens kostnadsramme …» | Dagsrammen er brukt opp. Hev `ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD` og velg *Redeploy*, eller vent til midnatt. |
| Noe annet er feil etter at grenen er slått sammen | *Deployments* → velg forrige produksjonsversjon → *Instant Rollback* (eller *Promote to Production*). |

---

## Tips

**1. Usikker på hvilken OpenRouter-nøkkel appen bruker?** Lag en ny nøkkel i OpenRouter som heter
«Artsorakel produksjon», med kredittak. Lim den inn som ny verdi for `OPENROUTER_API_KEY` i
Vercel (*Settings* → *Environment Variables* → *Edit*), velg *Redeploy* og test. Når alt virker,
sletter du den gamle nøkkelen i OpenRouter. Har du ikke satt `ARTSORAKEL_HEMMELIGHET`, blir alle
logget ut når nøkkelen byttes. Med den satt skjer det ikke.

**2. Nøyaktige kostnadstall uten kostnad fra OpenRouter.** Prisene står på modellens side hos
OpenRouter (søk etter modellnavnet `google/gemini-3.7-flash`): pris per million «input»-tokens og
«output»-tokens. Legg dem inn som `ARTSORAKEL_PRIS_INN_USD_PER_MTOK` og
`ARTSORAKEL_PRIS_UT_USD_PER_MTOK`, og velg *Redeploy*.

**3. Gi oppgaven til en AI-agent.** Du kan be agenten følge denne filen. Agenten trenger tilgang til
Vercel-prosjektet. Del aldri verdiene for nøkler og koder i en chat. Legg dem inn selv i Vercel.
