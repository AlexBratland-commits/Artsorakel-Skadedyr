# PDF-rapport og chatboble

## PDF-rapport

Etter en analyse (og når et funn åpnes fra historikken) finnes knappen **«Last ned PDF-rapport»**.

- **Lages på enheten.** PDF-en bygges i nettleseren med `pdf-lib` (MIT, ingen nettverkskall).
  Bildet og opplysningene sendes ikke til noen PDF-tjeneste, og det gjøres ingen ny AI-analyse.
- **Datakilde.** Bare det eksisterende analyseresultatet og de faste tekstene i
  `src/lib/resultat-tekst.ts` – de samme som vises på skjermen. Ingen nye råd lages for PDF-en.
- **Sikkerhet** vises bare som modellens nivå (lav/middels/høy sikkerhet), aldri som prosent.
- **Innhold:** toppfelt med Ocab-logo, tittel og dato · bildet (riktige proporsjoner og EXIF-rotasjon) ·
  foreslått funn med norsk og vitenskapelig navn · sikkerhet · alternative arter · risikovurdering
  (alvorlighet, faglige forbehold og viktige merknader fra biblioteket) · tiltak · når fagfolk bør
  kontaktes · forvekslinger · forbehold · bunntekst med «Ocab Artsorakel», AI-merking, rapportdato og
  sidetall.
- **Påkrevd forbehold** står både øverst (fremhevet) og under «Forbehold». Rapporten sier uttrykkelig
  at den ikke er signert og ikke er en inspeksjonsrapport.
- **Fra historikken** brukes miniatyrbildet (originalbildet lagres ikke), og det står i rapporten.
- **Skrift:** Helvetica (standard i alle PDF-lesere, også iPhone og Android). Den dekker æ, ø, å og
  norsk tegnsetting. Tegn den ikke har (f.eks. piler) byttes til nærmeste lesbare tegn.

Filer: `src/lib/rapport/innhold.ts` (innhold), `src/lib/rapport/pdf.ts` (oppsett),
`src/components/PdfRapportKnapp.tsx` (knapp og nedlasting).

### Valgfri samtale som vedlegg

«Last ned PDF-rapport» åpner en liten dialog med valget **«Inkluder samtale med Artsorakel»**
(alltid av som standard). Uten avkrysning er rapporten nøyaktig som før.

- **Hvilke meldinger:** bare meldingene i «Spør om dette funnet» for funnet som vises.
  Den generelle chatten («Spør Artsorakel») er en egen komponent og kommer aldri med.
- **Kobling (`src/lib/rapport/samtale.ts`):** Hver gang et funn vises – ny analyse eller åpnet
  fra historikken – får visningen et nytt løpenummer, og funn-chatten startes på nytt. Chatten
  melder fra om meldingene sammen med løpenummeret og analysens chat-billett (unik per analyse).
  Rapporten tar bare med meldinger der begge stemmer med funnet som vises. Tidspunkt brukes ikke
  til koblingen.
- **Ingen lagring:** meldingene finnes bare i minnet, som før. Lukkes siden, eller åpnes et annet
  funn, er samtalen borte, og valget er da deaktivert med en forklaring. Tidspunktet på hver
  melding settes i nettleseren og sendes ikke til serveren.
- **Vedlegget:** egne sider etter rapporten med «Vedlegg – Samtale med Artsorakel», undertekst,
  påkrevd forbehold, meldingene i rekkefølge med avsender (Kunde / Artsorakel (AI)) og
  tidspunkt. Toppfelt, bunntekst og sidetall fortsetter gjennom hele dokumentet.

**Forslag (ikke bygget):** Skal samtalen kunne legges ved også etter at siden er lukket, må den
lagres sammen med funnet i historikken på enheten. Det er en endring i hva som lagres lokalt og i
personvernteksten, og bør godkjennes først.

### Sideskift

Korte avsnitt (høyst 6 linjer) holdes samlet. Lange avsnitt deles aldri slik at én linje står
alene nederst eller øverst. Overskrifter tar alltid med seg starten av teksten under, og en
avsender i vedlegget står aldri alene nederst på en side.

## Chatboblen

Boblen «Spør Artsorakel» dekker aldri knapper, lenker eller skjemafelt – på alle sider. Den sjekker
hva som faktisk ligger under den (`src/lib/bobleplass.ts`), ved scrolling, endret størrelse og hvert
sekund:

1. Full boble i hjørnet nede til høyre, hvis plassen er fri.
2. Ellers kompakt (bare ikonet) i hjørnet.
3. Ellers kompakt, løftet opp til nærmeste ledige plass (høyst litt over midten av skjermen).
4. Ellers tones den ut til plassen blir fri.

Mens et skrivefelt har fokus på mobil (tastaturet er oppe), er boblen skjult. Med tastaturet kan den
alltid nås (Tab gir den fokus og viser den).
