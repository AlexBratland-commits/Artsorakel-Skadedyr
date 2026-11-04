# Leveranse C – anbefaling: smartere identifisering (IKKE påbegynt)

Bare undersøkelse og anbefaling. **Ingenting implementeres før du har godkjent det.**
Felles regler for alle tiltakene:
- Ingen nye arter.
- Ingen modellbytte.
- Prompter endres bare bak en bryter og etter sammenligning med fasitbilder.
- Standardflyten med ett bilde beholdes.

## Viktig om kostnad

Saldoen er omtrent 10 USD, og ekte AI-kall i testing trekkes fra den. Hva én analyse faktisk
koster, vet vi først når loggene i produksjon viser `tokens_inn` og `tokens_ut` (eventuelt
`kostnad_usd`). **Første steg i C7 er derfor å kjøre 20 bilder og regne ut prisen per analyse**
før et større testsett kjøres.

## Prioritert anbefaling

| Pri | Tiltak | Forventet nytte | Kompleksitet | Løpende kostnad | Risiko for å forverre dagens identifisering |
|---|---|---|---|---|---|
| **1** | **C7 Måling med fasitbilder** | Høy. Forutsetningen for alt annet: uten den kan ingen forbedring bevises. | Lav i kode (`scripts/eval.mjs` finnes). Mest din tid til bilder og fasit. | Ekte AI-kall per testbilde. Måles på 20 bilder først. | **Ingen.** Endrer ikke appen. |
| **2** | **C4 Faglig oppfølging (regelstyrt)** | Høy for de vanligste forvekslingene | Lav til middels. Når de to beste forslagene er et kjent forvekslingspar, viser appen ett konkret råd du har skrevet, for eksempel «Ta et nærbilde av dekkvingene ovenfra». | **Ingen ekstra AI-kall.** Bare tekst i visningen. | **Svært lav.** Endrer ikke AI-en, bare tillegg i visningen. |
| **3** | **C6 Tilbakemelding fra ansatte** (Riktig / Feil / Usikker) | Middels til høy. Viser hvor appen feiler i praksis. | Lav. Én knapperad. Teller i Upstash per art, nivå og svar, **uten bilde, tekst eller IP**. | Ubetydelig (Upstash, gratisnivå) | Ingen |
| **4** | **C2a Enkelt valg for målestokk** («Hva ligger ved siden av?» Mynt / fyrstikk / linjal / ingenting) | Høy for ekskrementer (mus mot rotte) og små insekter | Lav i UI, men **endrer prompten** og må bak bryter og måles | Ingen ekstra kall | Lav til middels. Kan gi for mye vekt på et feil oppgitt objekt. Måles i C7. |
| **5** | **C1 Bedre skille mellom like arter** (promptversjon v2 per gruppe) | Middels til høy, men usikker til den er målt | Middels. Bestemmelsesnøkler som for gnagere og maur, også for pelsbiller, møll, lagerbiller og kre, basert på bibliotekets egne kjennetegn. Rydder også F5 og ekskrementnøkkelen (faglig forslag 15–16). | Litt lengre prompt (få prosent flere tokens) | **Middels.** Dagens prompt fungerer godt. Tas i bruk **bare** hvis C7 viser at v2 er bedre på fasitbildene og ikke dårligere på noen gruppe. |
| **6** | **C2b Måleverktøy på bildet** (trykk på endene av mynten og ekskrementet → mm) | Høy for ekskrementer | Middels til høy (UI) | Ingen AI-kostnad | Lav. Gir en målt størrelse i stedet for et anslag. |
| **7** | **C3 To bilder** (oversikt + nærbilde, valgfritt) | Usikker. Nyttig der kjennetegnet er lite (antenner, dekkvinger). | Middels. Begge bildene sendes i samme kall. | Høyere: anslagsvis +40–80 % tokens per analyse, og litt lengre svartid. Må måles. | Lav hvis valgfritt, men vurderes først når C7 viser hvor bildene ikke holder |
| **8** | **C5 Andre spor** (gnagemerker, borkaks, flygehull, hudskifter) | Middels | Larver er delvis dekket i dag. Gnagemerker og borkaks som egne «spor» betyr **nye oppføringer i biblioteket**. | Ingen | Middels. Krever din godkjenning av hvert nytt spor. |

## C1 – forvekslingspar i dagens bibliotek

Basert på bibliotekets egne `forveksles`-lister og kjennetegn. Kolonnen «Kjennetegn som skiller»
er hentet fra biblioteket og må godkjennes faglig før den brukes i prompter eller oppfølging.

| Gruppe | Par som ofte forveksles | Kjennetegn som skiller (fra biblioteket) | Godt oppfølgingsspørsmål eller -bilde (C4) |
|---|---|---|---|
| Gnagere | Husmus / ung brunrotte | Halens tykkelse ved roten, bakføttenes størrelse, hode i forhold til kropp | «Ta et bilde av halen og bakbeina» |
| Gnagere | Husmus / skogmus | Øyne og ører, skarpt avgrenset hvit buk | «Ta et bilde fra siden som viser buken» |
| Maur | Stokkmaur / jordstokkmaur («brun tremaur») / rød skogsmaur | Hodefarge, ryggprofil sett fra siden, farge på bakkroppen | «Ta et bilde fra siden» og «Er den rolig eller hissig?» |
| Maur | Svart tremaur / svart jordmaur | Blank mot matt, hjerteformet hode, sitronlukt | «Lukter den sitrus når den knuses?» |
| Pelsbiller | Museumsbille / tepperbille | Tre lyse bølgebånd mot jevnt spraglet. Biblioteket sier selv at de er «svært vanskelige å skille på foto». | Godta begge som riktig på slektsnivå (*Anthrenus*) i målingen |
| Pelsbiller | Brun pelsbille / tepperbille | Ensfarget avlang mot rund og spraglet. Larver: gulrotformet med hårdusk mot kort og bred. | «Er det en voksen bille eller en hårete larve?» |
| Møll | Klesmøll / pelsmøll | Prikker på vingene, og om larven bærer sekk | «Ta et nærbilde av larven» |
| Møll | Matmøll / melmøll | Kobberbrun ytre vingehalvdel mot grå med sikksakklinjer | «Ta et bilde av vingene ovenfra» |
| Lagerbiller | Brødbille / tobakksbille | Lengderiller på dekkvingene mot glatte, sagtakkede antenner | «Ta et nærbilde av dekkvingene ovenfra» |
| Lagerbiller | Rismelbille / sagtannet kornbille | Sagtenner på forkroppen | «Ta et nærbilde av forkroppen ovenfra» |
| Kre | Skjeggkre / sølvkre | Størrelse, behåring, haletrådenes lengde, rom (tørt eller fuktig). Biblioteket anbefaler limfeller og fagperson. | «Hvor fant du den – tørt rom eller bad?» |
| Kakerlakker | Tysk / brunbåndet | Lengdestriper på ryggskjoldet mot tverrbånd over vingene | «Ta et bilde ovenfra» |
| Veps | Vanlig veps / jordveps | Ankertegning mot tre prikker i ansiktet | «Ta et nærbilde av ansiktet forfra» |

**Prinsipp for C4:** et spørsmål vises bare når de to beste forslagene er et par i denne tabellen,
og bare med kjennetegn som faktisk skiller dem. Ellers stilles ingen spørsmål.

## C2 – ekskrementer

Dagens nøkkel bruker allerede størrelse, tykkelse, form og ender, innhold, mengde og plassering.
Svakhetene er:
- Størrelsen er et anslag (F6, faglig forslag 16).
- Ingen målestokk.
- Ferskhet blir ikke rapportert.

Forslag, i rekkefølge:
1. **Målestokk-valg (C2a).**
2. **Nye størrelsesintervaller** (faglig forslag 16).
3. **Måleverktøy (C2b).**

Appen skal fortsatt kunne svare «Kunne ikke identifisere funnet sikkert». Brunrotte og
svartrotte skilles ikke ut fra ekskrementer alene. Forbeholdet fra leveranse B beholdes.

## C6 – tilbakemelding uten personopplysninger

Lagres:
- art eller «ukjent»
- gruppe
- sikkerhetsnivå
- tilbakemelding (riktig / feil / usikker)
- eventuelt riktig art valgt fra biblioteket
- dato
- promptversjon

Lagres ikke: bilde, fritekst, IP-adresse eller enhets-ID. Telles i Upstash per måned.

Gir en grov feilrate per art. Den er skjev, fordi folk oftere melder feil enn riktig, og
**erstatter ikke fasitbildene i C7**.

## C7 – testopplegg med fasitbilder

**Testsett:** start med 20 bilder for å måle prisen, og bygg så opp mot 300–500. Mappestrukturen i
`scripts/eval.mjs` brukes. Bildene lagres bare lokalt, aldri i git.

| Kategori | Eksempler | Forventet svar |
|---|---|---|
| Tydelige bilder | 10–20 per vanlig art | Riktig art |
| Dårlige bilder | Uskarpt, mørkt, langt unna | Riktig art med lav sikkerhet, eller «Kunne ikke identifisere» |
| Like arter | Parene i C1-tabellen | Riktig art, eller riktig **slekt eller gruppe** |
| Ekskrementer | Med og uten målestokk, mus, rotte, mår, mink, røyskatt, flaggermus | Riktig, eller «Kunne ikke identifisere» der grunnlaget er svakt |
| Utenfor biblioteket | Arter som ikke er med | «Kunne ikke identifisere», eller «annen art» for dyr. **Aldri en art fra biblioteket.** |
| Uten skadedyr | Lo, rosiner, frø, skitt | «Kunne ikke identifisere» |
| Flere dyr | To arter i samme bilde | Notert manuelt |

**Måltall** (rapporteres per gruppe og samlet):
- Riktig art (topp 1), og riktig blant topp 3.
- **Riktig på slekt eller gruppe**, rapportert for seg og ikke slått sammen med artsnivå.
- **Feil med høy sikkerhet.** Det viktigste tallet.
- Riktig avvisning av bilder uten skadedyr og arter utenfor biblioteket.
- Alvorlige feil, for eksempel rotte kalt mus eller veggedyr oversett.
- Svartid (median og 90-persentil) og kostnad per analyse fra loggene.

Modellens egen prosent brukes **ikke** som bevis. Den sammenlignes bare med fasit for å se om
«Høy sikkerhet» faktisk stemmer oftere enn «Lav».

## Hva du må godkjenne før C starter

1. Rekkefølgen over, eller en annen.
2. At C7 kan bruke inntil et avtalt beløp av saldoen, for eksempel 2 USD til første måling.
3. Tekstene for oppfølging (C4) i C1-tabellen.
