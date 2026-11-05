# H5 – Sikkerhetsnivå: hvordan det fungerer, og manuell kalibreringstest

## Hvordan sikkerheten fungerer (etter H5)

1. Modellen svarer med `confidence` (0–100) og, etter H5, `grunnlag`
   («tydelig», «delvis» eller «uklart»). Tallet er modellens egen vurdering,
   **ikke** en kalibrert sannsynlighet: 85 betyr ikke at svaret er riktig i 85 % av tilfellene.
2. Tallet tolkes robust (`tolkProsent`): «85 %», «0,85» og 0.85 gir 85. Mangler det eller er
   det uleselig, brukes 30 (lav – «Mulig …»). Negativt gir 0 (ukjent); over 100 gir 100.
3. Arten slås opp i artsbiblioteket (H1). Ukjent art gir «Kunne ikke identifisere funnet
   sikkert» eller «art utenfor listen» – ingen art presses inn.
4. Tak som aldri hever og aldri bytter art (de eksisterende nivågrensene – ingen nye tall):
   - generelt navn alene («mus»): høyst Lav (H1)
   - «rotte» alene på ekskrementer: høyst Middels (F4)
   - `grunnlag` «uklart»: høyst Lav; «delvis»: høyst Middels (H5)
   - ekskrementer uten oppgitt størrelse (valg eller mål i beskrivelsen): høyst Middels (H5)
   Alternativene får samme tak; modellens rangering beholdes, så taket ikke lager en kunstig
   motstrid. Når et tak senket nivået, vises en fast forklaring.
5. Visning: Lav < 50 ≤ Middels < 80 ≤ Høy. Under 30: ukjent. Ingen prosenter vises.
6. Motstrid: alternativ minst like sannsynlig (M3) og motstridende navn (H1) vises tydelig.
7. Samme tall og nivå brukes på skjermen, i historikken, i PDF-en, i e-posten «Meld fra om
   feil» og i chatten (chatbilletten bærer nivå, forklaringer og alternativer).

Grensene 50 og 80 er visningsgrenser valgt tidligere; de er ikke validert mot fasit.

## Manuell kalibreringstest med ekte AI

Automatiske tester (Vitest/Playwright) bruker **falsk AI** og viser bare at reglene virker på
svarene. Om «Høy» faktisk betyr at Artsorakel oftere har rett, kan bare måles med ekte bilder
med kjent fasit. Hvert bilde koster AI-kall – avtal omfang og kostnad først.

### Oppsett
- Minst 60 bilder med fasit bestemt av fagperson, helst 100+:
  - 20 tydelige bilder av vanlige arter (husmus, brunrotte, tysk kakerlakk, stokkmaur, skjeggkre)
  - 15 visuelt like par (brun pelsbille/pelsbille, markkakerlakk/tysk kakerlakk, maurarter,
    husmus/ung rotte, skjeggkre/sølvkre)
  - 10 uklare eller delvis skjulte (uskarpt, mørkt, dyret delvis skjult, bare larve)
  - 10 ekskrementer, halvparten med og halvparten uten målestokk og oppgitt størrelse
  - 5 arter utenfor biblioteket og 5 bilder uten dyr
- Kjør hvert bilde én gang i Preview, med og uten fritekst der det er relevant. Ikke bruk cache
  (nytt bilde eller endret felt).

### Registrer for hvert bilde
Fasit · vist art · nivå (Lav/Middels/Høy/ukjent) · «Mulig»? · alternativer · vist forklaring
(uklart/delvis/størrelse) · riktig art? (ja/nei/i alternativene) · chat: omtalt som usikker når
nivået er Lav/Middels? anbefalt feil tiltak?

### Vurdering
- Andel riktige per nivå: Høy skal ha klart flest riktige, Lav færrest. Rapporter antall, ikke
  bare prosent (små tall gir stor usikkerhet).
- Overkonfidens: tell feil med «Høy». Hver slik feil gjennomgås (grunnlag, bilde, alternativer).
- Ærlighet: andel uklare/delvise bilder som faktisk fikk «uklart»/«delvis» fra modellen.
- Ekskrementer: andel «Høy» uten oppgitt størrelse skal være null.
- Endre grensene eller reglene bare på grunnlag av slike resultater, og dokumenter datasettet.
