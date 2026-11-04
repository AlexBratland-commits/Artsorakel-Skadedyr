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
