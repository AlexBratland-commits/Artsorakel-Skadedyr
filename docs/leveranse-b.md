# Leveranse B – rapport: logikkfeil, regresjonstester, CI og vedlikeholdbarhet

Gren: `claude/leveranse-b-kodefeil-tester`, bygget på leveranse A (PR #6). Ikke merget, ikke deployet.
**AI-modell, prompter og artsbibliotek er uendret.** Grunnlinje-snapshotene består, og
`src/lib/pests.ts` er identisk med `main`.

## Hva er endret

| # | Funn | Endring |
|---|---|---|
| B1 | F3: manglende sikkerhet ble til «Middels» (55), og «85%» ble 55 | Robust tolkning av «85%», «85 %», «0,85» og 0.85. Mangler tallet, gir det lav sikkerhet («Mulig …»). |
| B2 | F4: «Rotte» på ekskrementer ble «Ukjent» | Generelle navn kobles til Brunrotte via det latinske navnet og gir høyst «Middels». Alle ekskrement-Brunrotte får forbeholdet *«Ekskrementer alene gir ikke alltid sikkert grunnlag for å skille brunrotte fra svartrotte. I Norge er brunrotte langt vanligst.»* Svartrotte slipper ikke inn som hovedsvar. |
| B3 | F1: ukjente ekskrementer | Overskriften *«Kunne ikke identifisere funnet sikkert»* og den godkjente forklaringen. Ingen artsnavn utenfor biblioteket vises på ekskrementer. Det AI-en observerte, vises fortsatt. API-et beholder `name: "Ukjent"`. |
| B4 | F2: feil gruppe i steg 1 ødela et riktig svar | En art fra biblioteket i en annen gruppe godtas: bare dyrearter, og bare med sikkerhet ≥ 30. Logges som `gruppe_korrigert`. |
| B5 | F7, F11 | Alternativer står ikke med «Høy sikkerhet» ved siden av hovedforslaget. Offline-lageret lagrer bare vellykkede svar og holder maks 60 filer. |
| B6 | F9 | HEIC som nettleseren ikke kan lese, gir norsk melding før opplasting |
| B7 | Vedlikehold | Identifiseringslogikken er flyttet til `src/lib/identification.ts` uten endret oppførsel. Ubrukt kode er fjernet. |
| B8 | Kvalitet | Kontrolltester for artsbiblioteket (ingen dataendring). Ett funn til faglig godkjenning. |
| B9 | CI | GitHub Actions ved hver push og pull request: typesjekk, lint, tester med ekte Redis, audit, bygg og UI-tester. Ingen deploy. Dependabot foreslår sikkerhetsoppdateringer. |
| B10 | Fag | [faglige-endringsforslag.md](faglige-endringsforslag.md): 21 forslag med kilder, **bare til godkjenning** |
| B11 | Dokumentasjon | Ny README på norsk |

**Ikke gjort, med begrunnelse:**
- F5 krever promptendring og flyttes til leveranse C. En test dokumenterer dagens oppførsel.
- B12: ESLint-oppgradering for 16 moderate sårbarheter i utviklingsverktøy. Krever en større oppgradering, og verktøyene leveres ikke til produksjon.

## Tester (alle med falsk AI – ingen ekte AI-kall)

| Kontroll | Resultat |
|---|---|
| TypeScript og ESLint | 0 feil |
| Vitest | **133 bestått**, 1 hoppet over (kjøres bare i CI) |
| Playwright (Chromium, mobilvisning) | **10 av 10**, blant annet ukjente ekskrementer, rotteforbeholdet og HEIC |
| Produksjonsbygg | OK |
| `npm audit --omit=dev` | 0 |

De nye testene for F1–F4 ble skrevet først. 13 av dem feilet på den gamle koden og består nå.

## Hva det IKKE sier noe om

Ingen av testene måler hvor treffsikker AI-en er. Rettingene gjør at riktige AI-svar ikke lenger
kastes (F2, F4) og at usikre svar ikke ser sikrere ut enn de er (F3). Om dette gir flere riktige
artsbestemmelser i praksis, kan bare fasitbilder vise (leveranse C, C7).

## Etter test i Preview med ekte AI (eierens test)

Riktige svar i testen: faraomaur, brunrotte, mus, sølvkre og skjeggkre, og metallskruer avvist.
Endringene under påvirker **ikke** artsbestemmelsen: promptene er uendret (snapshotene består),
og i artsbiblioteket er bare `tiltak`-tekster endret. De inngår ikke i identifiseringspromptene.

| Oppgave | Endring |
|---|---|
| 1. Tetting | Husmus, liten skogmus og ekskrement-Mus: «åpninger fra omtrent 4–6 mm». Brunrotte, svartrotte og ekskrement-Brunrotte: «fra omtrent 10–14 mm». Alle: ikke tett en aktiv inngang før situasjonen er kartlagt. Chatten følger samme regel. |
| 2. Chat utenfor faget | Helt irrelevante spørsmål («Hvem er kong Harald?») får et fast, høflig svar uten AI-kall (`src/lib/server/chat-tema.ts`). Spørsmål med fagord går alltid videre. Chat-instruksen er også skjerpet. |
| 3. Mus/flaggermus | Ingen prompt- eller modellendring. Ekskrement-Mus og -Flaggermus får et forbehold om hvordan de skilles (konsistens, fra bibliotekets egne kjennetegn). Uten størrelse og beskrivelse vises et tips før analysen. |
| 4. Ikke-skadedyr | Når grovsorteringen ikke ser noe dyr og ingen art blir funnet, vises «Ingen skadedyr på bildet» uten standardrådet om å fotografere dyret på nytt. |
