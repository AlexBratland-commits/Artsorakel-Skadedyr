# Artsorakel 2.0 – Spør Artsorakel, chatboble og ny logo

Gren: `feature/artsorakel-2-ai-assistent` (fra `main` med 1.0). Ikke merget, ikke i produksjon.

**Uendret fra 1.0:** bildeanalyse og artsbestemmelse, AI-modeller, identifiseringsprompter,
artsbibliotek og tiltak, funn-chatten, kostnadskontroll, Upstash, sikkerhet og personvern.
Grunnlinje-snapshotene av promptene består uendret.

## Hva er nytt

| Del | Innhold |
|---|---|
| Logo | Ocabs offisielle logo fra original-PNG (bare beskåret og skalert ned). Toppfelt: «Ocab» uten slagord. Bunntekst: med slagord. Mørk modus: diskret lys plate bak logoen (kontrast 7,1:1). |
| Chatboble | «Spør Artsorakel» nederst til høyre, alltid tilgjengelig og aldri åpnet av seg selv. På mobil åpnes den over hele skjermen, på PC som et vindu på 400 px. Esc lukker, og fokuset går tilbake til boblen. |
| Assistent uten bilde | Velkomst, seks forslag, egne spørsmål, oppfølgingsspørsmål, «Skriver …», norske feilmeldinger og «Ny samtale». Fagstoff hentes fra artsbiblioteket for arter og grupper som nevnes (maks 6). |
| Kontakt Ocab | Lenken står alltid nederst i chatten. Kontaktkortet vises bare ved konkrete grunner til faglig oppfølging (se under), aldri to svar på rad, og samtalen fortsetter etterpå. Ingenting sendes til Ocab automatisk. |
| Analyser bilde | Når et bilde kan gi sikrere artsbestemmelse (ukjente insekter, uklar maurart, larver, ekskrementer, spor), foreslår assistenten bilde og viser knappen «Analyser bilde». Knappen lukker chatten og fører til den vanlige bildeopplastingen. Ikke ved generelle spørsmål om forebygging. |
| Historikk | De tre siste funnene vises på forsiden, med «Se alle tidligere funn (N)». Åpne og slette fungerer som før. |
| Små forbedringer | Personverntekst i bunnen med større skrift. Bunnmarg, så boblen ikke dekker bunnteksten. Varsler vises over boblen på mobil. |
| Mobil i chatten | Lavere toppfelt (undertittel og ikon bare på PC), kort personverntekst med lenke til personvernsiden, og panelet følger den synlige delen av skjermen så skrivefeltet ikke havner bak tastaturet på iPhone. |

## Tetteråd for gnagere (endret etter test i Preview)

Den gamle regelen «Kartlegg før du tetter: en aktiv inngang bør ikke tettes før du vet om dyr
fortsatt er inne – kontakt Ocab ved usikkerhet» er erstattet overalt:

- **Artsbiblioteket** (husmus, liten skogmus, brunrotte, svartrotte, og ekskrementer fra mus og
  brunrotte – 6 steder): «Sikre åpninger der mus og rotter kan komme inn, slik at nye dyr hindres
  adgang. Undersøk samtidig om det allerede finnes gnagere inne i bygningen, og gjennomfør
  nødvendig fangst eller bekjempelse. Ved omfattende aktivitet eller usikkerhet om hvor dyrene
  oppholder seg, bør en skadedyrbekjemper kontaktes.»
- **Funn-chatten og Spør Artsorakel** bruker den samme hovedregelen (felles tekst i
  `src/lib/server/fagregler.ts`), med størrelsene mus ca. 4–6 mm og rotter ca. 10–14 mm, og et
  tillegg: tetting skal ikke vente til alle dyr er fjernet, men kan dyr være inne i en
  konstruksjon, kombineres tettingen med fangst der dyrene er, så de ikke blir innestengt.
- Bare tiltak-tekster og chat-instrukser er endret. Identifiseringspromptene og
  artsbestemmelsen er uendret (grunnlinjetestene er grønne).

## Når vises kontaktkortet og «Analyser bilde»?

AI-en avgjør ut fra samtalen og setter en markør (`[[KONTAKT_OCAB]]` / `[[ANALYSER_BILDE]]`)
som appen fjerner fra teksten og gjør om til kort eller knapp.

- **Kontaktkort** ved: mistanke om stokkmaur, husbukk eller andre skadedyr som kan gi
  bygningsskade; omfattende gnageraktivitet eller gnagere i konstruksjonen; mistanke om
  veggedyr; gjentatte problemer som ikke løses med vanlig forebygging; funn som krever faglig
  kartlegging eller bekjempelse. **Ikke** bare fordi mus, rotte eller maur nevnes, og normalt
  ikke ved generelle spørsmål om forebygging.
- **Ikke gjentatt:** Har kortet vært vist i samtalen, får AI-en beskjed om det og skal bare
  vise det igjen ved vesentlig endring. Serveren viser uansett aldri kortet to svar på rad.
  Hva som er vist, er signert sammen med svaret, så det kan ikke forfalskes.
- **Analyser bilde** ved ukjente insekter, uklar maurart, larver, ekskrementer, gnagespor og
  andre spor – ikke ved generelle spørsmål om forebygging, tetting eller regler.

## AI-modell og kostnad

- Bruker **samme modell som funn-chatten**: `openai/gpt-5.6-luna` (`OPENROUTER_CHAT_MODEL`).
  Ingen ny modell og ingen nye betalte tjenester.
- Hvert AI-kall går gjennom den felles AI-klienten og **teller mot den samme døgnbaserte
  kostnadsrammen** (`ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD`). Forbruket logges som `ai_kall` med
  `steg: assistent`.
- **Deler grensene med funn-chatten:** 120 per time og 10 per minutt per IP-adresse, og 500 per
  døgn for hele appen. Den ene chatten kan ikke brukes til å omgå den andre.
- Tak på 40 spørsmål per samtale. Maks 500 tegn per melding, og bare de 12 siste meldingene sendes.
- Irrelevante spørsmål får et fast svar uten AI-kall.
- Mangler Upstash i Vercel, eller er den nede, avvises AI-kall (fail closed).
- Hvert svar er signert, og falsk historikk avvises. Svar fra funn-chatten kan ikke brukes her.
- Instruksen har regler mot prompt injection og ber aldri om personopplysninger.

**Nye miljøvariabler:** ingen.

## Personvern – til godkjenning

- Samtalen lagres bare i nettleseren (`localStorage`) og slettes med «Ny samtale».
  Ocab lagrer ingen samtaler.
- Chatten viser på PC: «Meldinger sendes til en AI-tjeneste. Ikke skriv navn, adresse eller andre
  personopplysninger. Samtalen lagres bare i denne nettleseren.» På mobil, for å spare plass:
  «Sendes til AI. Ikke skriv personopplysninger.» Begge har lenke til personvernsiden.
- **Nytt avsnitt på `/personvern` («Spør Artsorakel») er merket for godkjenning** i koden.

## Tester (alle med falsk AI)

Se rapporten i pull requesten. Nye testfiler:
- `tests/unit/assistent.test.ts`
- `tests/integration/assistent.test.ts`
- `tests/ui/assistent.spec.ts`
- `tests/ui/assistent-pc.spec.ts`
- `tests/ui/historikk.spec.ts`
- `tests/ui/tema.spec.ts`

## Manuell test i Preview (med ekte AI – bruker litt av saldoen)

1. Forsiden: logoen er skarp i lys og mørk modus, og boblen dekker ikke knapper eller bunntekst.
2. «Spør Artsorakel» → «Jeg hører krafsing på loftet». Svaret skal stille et oppfølgingsspørsmål.
3. Svar på oppfølgingsspørsmålet. Samtalen skal fortsette naturlig.
4. «Det er sagflis ved vinduene og store maur» skal gi en anbefaling om fagperson og vise kontaktkortet. Et oppfølgingsspørsmål skal ikke vise kortet på nytt.
4b. «Hvordan forebygger jeg mus?» skal gi råd uten kontaktkort og uten «Analyser bilde».
4c. «Det er store maur ved vinduet» eller «Jeg har funnet små larver i kjøkkenskapet» skal foreslå bilde og vise «Analyser bilde». Knappen skal føre til bildeopplastingen.
4d. «Hvordan tetter jeg mot mus?» skal følge den nye hovedregelen (sikre åpninger, undersøk om det er gnagere inne, fangst) og ikke si at man må vente med å tette.
5. «Hvem er kong Harald?» skal avvises høflig.
6. «Hvilken gift skal jeg bruke mot mus?» skal ikke gi råd om gift.
7. Lukk og åpne chatten igjen. Samtalen er der. «Ny samtale» skal tømme den.
8. Ta et bilde og analyser. Bildeanalysen og funn-chatten skal virke som før, og ikke blandes med den nye chatten.
9. Historikk med over 3 funn: «Se alle tidligere funn» skal virke.
10. Test på både iPhone (Safari) og Android (Chrome). På iPhone: trykk i skrivefeltet – feltet og Send-knappen skal være synlige over tastaturet.
