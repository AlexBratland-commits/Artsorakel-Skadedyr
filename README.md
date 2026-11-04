# Artsorakel

Artsorakel er Ocabs interne verktøy for å bestemme norske skadedyr og spor etter dem,
som ekskrementer, ut fra et bilde. Det er et **spesialistverktøy**, ikke en generell
artsdatabase. Artsbiblioteket er bevisst avgrenset til arter som er relevante for profesjonell
skadedyrbekjempelse i Norge.

Appen bruker en AI-modell via OpenRouter. Svaret kontrolleres alltid mot artsbiblioteket, og
alvorlighet, tiltak og forvekslinger hentes fra biblioteket, ikke fra AI-en.

## Viktig før du endrer noe

- **AI-modell, prompter og artsbibliotek endres ikke** uten godkjenning fra fagansvarlig.
  Grunnlinjetestene (`tests/integration/analyze-contract.test.ts`) feiler hvis promptene endres.
- Faglige forslag samles i [docs/faglige-endringsforslag.md](docs/faglige-endringsforslag.md).
- Produksjon endres bare ved merge til `main`. Vercel deployer, og CI deployer aldri.

## Kom i gang lokalt

```bash
npm ci
cp .env.example .env.local   # legg inn OPENROUTER_API_KEY
npm run dev                  # http://localhost:3000
```

Lokalt brukes tellere i minnet. I Vercel Production og Preview **kreves** Upstash og
`ARTSORAKEL_HEMMELIGHET`. Tilgangskoden (`ARTSORAKEL_TILGANGSKODE`) er valgfri.
Se [.env.example](.env.example).

## Tester

| Kommando | Hva |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Enhets- og integrasjonstester (Vitest). Bruker **falsk AI**. Testene mot ekte Redis krever `redis-server`. |
| `npm run test:ui` | Bygger appen og kjører UI-tester (Playwright) mot falsk AI |
| `npm run eval` | Måler treffsikkerhet med **ekte AI** og egne fasitbilder (koster penger). Se `scripts/eval.mjs`. |

Testene med falsk AI viser at *applikasjonslogikken* er riktig. Bare `npm run eval` med fasitbilder
sier noe om hvor treffsikker AI-en faktisk er.

CI (GitHub Actions) kjører alt unntatt `eval` ved hver push og pull request.

## Struktur

| Sted | Innhold |
|---|---|
| `src/app/api/analyze/route.ts` | Bildeanalysen: validering, grenser og promptene (låst av tester) |
| `src/lib/identification.ts` | Tolkning av AI-svaret og oppslag i artsbiblioteket |
| `src/lib/pests.ts` | Artsbiblioteket (krever faglig godkjenning) |
| `src/lib/server/` | Sikkerhet, valgfri tilgangskode, grenser (Upstash), AI-klient og logging |
| `src/app/api/ask-about-findings/route.ts` | Chat om et analysert funn |
| `src/app/api/assistent/route.ts`, `src/lib/server/assistent.ts` | «Spør Artsorakel» – chat uten bilde (2.0) |
| `docs/` | Leveranserapporter, veiledning for Vercel og faglige forslag |

## Drift

Se [docs/veiledning-vercel-openrouter.md](docs/veiledning-vercel-openrouter.md).
Skal Artsorakel lanseres offisielt eller brukes i større skala, skal løsningen overleveres til
Ocabs IT-avdeling for vurdering av sikkerhet, personvern, tilgangsstyring og drift.
