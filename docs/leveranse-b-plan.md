# Leveranse B – plan: logikkfeil, regresjonstester, CI og vedlikeholdbarhet

**Status: GJENNOMFØRT** – se [leveranse-b.md](leveranse-b.md). Planen under er beholdt som referanse.

- Gren: `claude/leveranse-b-kodefeil-tester`. Den bygger på leveranse A
  ([PR #6](https://github.com/AlexBratland-commits/Artsorakel-Skadedyr/pull/6)) og flyttes over på
  `main` når A er slått sammen.
- **Bevares uendret:** AI-modellene, promptene og artsbiblioteket (`src/lib/pests.ts`).
  Grunnlinje-snapshotene fra leveranse A låser promptene. En test som feiler betyr at en endring har
  truffet identifiseringen ved et uhell.
- Ingen deploy, og ingen endring i produksjon uten godkjenning.

## Beslutninger du har tatt

| # | Beslutning | Slik følges den opp |
|---|---|---|
| F4 | «Rotte» normaliseres til Brunrotte i ekskrementmodus, **men ordet alene gir ikke en sikker bestemmelse**. Svartrotte må fortsatt kunne håndteres som annen mulig art der det er relevant. | B2, og egen sak i leveranse C (se under) |
| F1 | Tekst når et ekskrementfunn ikke kan bestemmes: *«Kunne ikke identifisere funnet sikkert. Bildet eller opplysningene gir ikke tilstrekkelig grunnlag for å bestemme hvilket dyr sporene stammer fra. Prøv et tydeligere bilde med målestokk.»* | B3, med teksten ordrett |
| Bibliotek | Biblioteket skal være bevisst avgrenset til relevante skadedyr. **Ingen nye arter** (ekorn, pinnsvin o.l.) uten din godkjenning. Et lite bibliotek er ikke en feil i seg selv. | Gjelder alle tiltak. Ingen tiltak legger til arter. |

## Tiltak, i prioritert rekkefølge

Hver retting får en **regresjonstest som skrives først**. Testen skal vise feilen på dagens kode og
bestå etter rettingen. Hvert tiltak er én commit, så det kan rulles tilbake for seg.

### Bekreftede logikkfeil (uten promptendring)

| # | Feil | Planlagt retting | Påvirker promptene? |
|---|---|---|---|
| **B1** | F3: mangler AI-en en sikkerhetsangivelse, settes den til 55 («Middels»), og «85%» som tekst blir 55 | «85%», «85 %» og «0,85» tolkes riktig. Mangler tallet, gir det **lav** sikkerhet («Mulig …») i stedet for et oppdiktet tall. | Nei |
| **B2** | F4: «Rotte» på ekskrementer ble «Ukjent» | Et generelt navn kobles til ekskrement-Brunrotte via det latinske navnet, **uten å endre artsbiblioteket**. Bestemmelsen vises med maks «Middels sikkerhet» og en merknad (forslag nedenfor). Svartrotte er fortsatt sperret som *hovedsvar*. | Nei |
| **B3** | F1: ekskrementer som ligner et dyr som ikke har ekskrementoppføring (ekorn, pinnsvin …), ble kastet stille til «Ukjent» | Kontrollert håndtering: ingen art utenfor biblioteket vises som resultat. Brukeren får F1-teksten ordrett. API-et beholder `name: "Ukjent"`, så kontrakten er uendret. | Nei |
| **B4** | F2: feil gruppe i steg 1 ødela et ellers riktig svar | Svarer AI-en i steg 2 med en art fra biblioteket utenfor den valgte gruppen, godtas den. Bare dyrearter, aldri ekskrementoppføringer. Det logges som `gruppe_korrigert`, så omfanget kan måles. | Nei |
| **B5** | F7, F10, F11 | Alternativer viser ikke sitt eget «Høy sikkerhet» ved siden av hovedforslaget. Gjenstående av F10 kontrolleres. Offline-funksjonen lagrer bare vellykkede svar og rydder gamle filer. | Nei |
| **B6** | F9: appen lover HEIC, som serveren ikke kan lese | Teksten justeres, og brukeren får en tydelig melding når HEIC ikke kan leses i nettleseren | Nei |

### Krever promptendring – flyttes til leveranse C (bak bryter, med måling)

| # | Sak | Hvorfor ikke i B |
|---|---|---|
| F5 | Når steg 1 ikke ser noe dyr, kjøres steg 2 med *hele* listen, også ekskrementer og svartrotte | Rettingen endrer artslisten i prompten. Den må ikke gjøre at reelle skadedyr overses, og det kan bare måles med fasitbilder (C1). I B skrives en test som dokumenterer dagens oppførsel. |
| Svartrotte | Skal kunne vurderes som annen mulig art i ekskrementmodus | I dag sier prompten «foreslå aldri svartrotte», og det finnes ingen ekskrementoppføring for den. Begge deler er prompt- og biblioteksendringer som krever din godkjenning og måling. |

### Regresjonstester og teknisk kvalitet

| # | Tiltak |
|---|---|
| **B7** | Identifiseringslogikken flyttes ut av API-ruten til egne, rene funksjoner (`src/lib/identification.ts`): oppslag, alternativer, «annen art» og berikelse. Ingen endring i oppførsel. Snapshotene beviser det. Funksjonene får egne enhetstester for alle grenene i koden. |
| **B8** | **Kontrolltester for artsbiblioteket** (bare tester, ingen dataendring): like navn i samme gruppe, kallenavn som peker på to arter, manglende felter og ugyldige FHI-lenker. Funnene legges i endringslisten (B10) til din godkjenning. |
| **B9** | **CI med GitHub Actions** ved hver push og pull request: `npm ci`, typesjekk, lint, enhets- og integrasjonstester med Redis-tjeneste (testene mot ekte Redis kjøres da alltid), produksjonsbygg, UI-tester med Playwright, og `npm audit --omit=dev` som feiler ved høy alvorlighet. **Ingen deploy fra CI.** I tillegg Dependabot for sikkerhetsoppdateringer. |
| **B10** | `docs/faglige-endringsforslag.md`: navn, vitenskapelige navn, synonymer, kjennetegn og FHI-lenker, med kilder (FHI, SNL, Artsdatabanken). **Bare forslag.** Ingenting endres før du har godkjent punkt for punkt. Også skrivefeil i biblioteket, som «køllefformede» og en dobbel linje under stokkmaur, ligger her fordi de er biblioteksdata. |
| **B11** | README på norsk: hva appen er, hvordan den kjøres, testes og settes opp, og lenker til veiledningene. |
| **B12** | Vurdere en ESLint-oppgradering for de 16 moderate sårbarhetene i utviklingsverktøyene. Gjøres bare hvis den ikke krever store endringer. |

## Forslag som trenger ditt ja

1. **Merknad ved F4.** Når appen har tolket et generelt «rotte» som Brunrotte, vises:
   *«Rotteekskrementer i Norge stammer nesten alltid fra brunrotte. Svartrotte kan ikke utelukkes ut
   fra ekskrementer alene.»* Sikkerheten vises da som høyst «Middels».
2. **F1 og forslag fra AI-en.** Skal brukeren i ekskrementmodus se AI-ens forslag til en art utenfor
   biblioteket (for eksempel «Mulig katt – ikke i Ocabs database»), eller bare F1-teksten?
   **Min anbefaling: bare F1-teksten**, siden biblioteket er bevisst avgrenset og et navn utenfor
   biblioteket ikke er kvalitetssikret.
3. **Overskrift ved F1.** I dag er overskriften «Ukjent». Forslag: «Kunne ikke identifisere funnet
   sikkert» som overskrift, og resten av F1-teksten under.

## Slik verifiseres leveransen

- Alle tester fra leveranse A består fortsatt, også snapshotene av promptene.
- Hver retting har en test som feilet før rettingen.
- CI kjører grønt på pull requesten.
- Leveranserapport i samme form som for A: hva er endret, tester, forbedringer, usikkerhet, og om det
  er trygt å gå videre.

## Ikke med i B (kommer i C)

Måleopplegg med fasitbilder (C1), promptversjon v2 bak bryter (C2), bildekvalitetskontroll og
beskjæring, målestokk for ekskrementer, to bilder, oppfølgingsspørsmål og faglig bekreftelse.
