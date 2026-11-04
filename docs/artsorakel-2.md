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
| Kontakt Ocab | Lenken står alltid nederst i chatten. Kontaktkortet vises bare når AI-en anbefaler fagperson, og samtalen fortsetter etterpå. Ingenting sendes til Ocab automatisk. |
| Historikk | De tre siste funnene vises på forsiden, med «Se alle tidligere funn (N)». Åpne og slette fungerer som før. |
| Små forbedringer | Personverntekst i bunnen med større skrift. Bunnmarg, så boblen ikke dekker bunnteksten. Varsler vises over boblen på mobil. |

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
- Chatten viser: «Meldinger sendes til en AI-tjeneste. Ikke skriv navn, adresse eller andre
  personopplysninger. Samtalen lagres bare i denne nettleseren.»
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
4. «Det er sagflis ved vinduene og store maur» skal gi en anbefaling om fagperson og vise kontaktkortet.
5. «Hvem er kong Harald?» skal avvises høflig.
6. «Hvilken gift skal jeg bruke mot mus?» skal ikke gi råd om gift.
7. Lukk og åpne chatten igjen. Samtalen er der. «Ny samtale» skal tømme den.
8. Ta et bilde og analyser. Bildeanalysen og funn-chatten skal virke som før, og ikke blandes med den nye chatten.
9. Historikk med over 3 funn: «Se alle tidligere funn» skal virke.
10. Test på både iPhone (Safari) og Android (Chrome).
