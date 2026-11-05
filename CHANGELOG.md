# Endringslogg

## Uutgitt – H5: sikkerhetsnivå etter grunnlaget

AI-modell, artsbibliotek, råd og visningen (Høy/Middels/Lav, ingen prosenter) er uendret.

- Modellen oppgir bildegrunnlaget («tydelig», «delvis», «uklart»). «Uklart» vises høyst som
  Lav og «delvis» høyst som Middels, med en forklaring på skjermen, i PDF-en og i chatten.
- Ekskrementer uten oppgitt størrelse (valg eller mål i beskrivelsen) vises høyst som Middels.
  Ekskrementprompten sier at confidence gjelder hvilket dyr, og at mål ikke skal oppgis som om
  de var målt uten målestokk. Råd og faginnhold er uendret.
- Takene bytter aldri art og hever aldri et nivå. Alternativenes rangering fra modellen beholdes.
- Ingen nye prosentgrenser: takene er de eksisterende nivågrensene. Se
  `docs/h5-kalibrering-sikkerhet.md` for flyt og manuell kalibreringstest med ekte bilder.

## Uutgitt – faglig gjennomgang: pelsbiller og markkakerlakk

AI-modeller, sikkerhetsnivåer og ekskrementanalysen er uendret. Artslisten til modellen har
fått markkakerlakk.

- Ny art: markkakerlakk (*Ectobius lapponicus*) etter FHIs felthåndbok s. 19. Lite alvorlig;
  ikke et skadedyr og skal ikke bekjempes. Råd om å fjerne enkeltdyr, begrense innvandring og
  få arten bestemt ved tvil – ingen åte, insektmidler eller behandling av bygningen.
  «Kakerlakk» + *Ectobius lapponicus* gir markkakerlakk; andre *Ectobius*-arter gjør det ikke.
- Tysk kakerlakk: kan forveksles med markkakerlakk (FHI s. 20). Rådene er uendret.
- Brun pelsbille (FHI s. 26): voksen og larve beskrevet hver for seg, utbredelse og sesong
  rettet (formerer seg bare innendørs, hele året), råd etter situasjon (én bille, gjentatte
  funn/larver, skade).
- Pelsbille (FHI s. 27 og FHIs nettside): voksen 3,5–5,5 mm, larve opptil 10 mm; én bille er
  ikke tegn på angrep; hva larvene skader; varme 60 °C der materialet tåler det, frysing mulig,
  men arten tåler kulde godt og en hjemmefryser gir ikke alltid god nok effekt.
- Museumsbille (FHI s. 30): kjennetegn og utbredelse rettet; varmebehandling i stedet for
  frysing (billene tåler kulde); de fleste hus har museumsbille uten skade.
- Fleskeklanner (FHI s. 24): larve opptil 13 mm; enkeltindivider må tolereres.
- «Ensfarget brun» om brun pelsbille er rettet i forvekslingene.
- FHI-lenker for brun pelsbille, pelsbille, museumsbille, tysk kakerlakk og markkakerlakk.
- Artsdataversjon 4. Manuell testplan for ekte AI: `docs/testplan-pelsbiller-kakerlakker.md`.

## Uutgitt – revisjonsfunn M1, M2 og M3

AI-modeller og artsbibliotek er uendret. Ekskrementanalysen er ikke endret.

- M1: Brukerens notater om dyret står ikke lenger i systemprompten. De sendes i brukermeldingen,
  avgrenset som `<brukernotater>`, og systemprompten sier at brukertekst og tekst i bildet er
  observasjoner, aldri instruksjoner. Størrelse, funnsted og kjennetegn brukes fortsatt.
  Funn-chatten sier at brukerens meldinger ikke endrer reglene, og navn på arter utenfor listen
  slippes bare inn i chatten når de ser ut som artsnavn.
- M2: Størrelsesgrensen gjelder faktisk innhold. Bytene telles mens de leses, og lesingen stopper
  ved grensen – også når Content-Length mangler eller er feil (analyse, begge chattene og
  tilgangskoden).
- M3: Er et alternativ vurdert som minst like sannsynlig som hovedforslaget, vises det ved selve
  sikkerhetsnivået (med «bør bekreftes av en fagperson»), i historikken, i PDF-ens
  sikkerhetsforklaring og «kontakte fagfolk», og chatten får beskjed om ikke å velge selv.
  Nivået vises fortsatt som Høy/Middels/Lav, uten prosenter, og arten byttes ikke.

## Uutgitt – H3: funn-chatten bevarer usikkerheten

AI-modeller, identifiseringsprompter og artsbibliotek er uendret.

- Chatbilletten (signert av serveren) har nå med sikkerhetsnivå, «Mulig …», forklaring ved
  generelt navn, alternativer, motstridende artsnavn og vitenskapelig navn for art utenfor
  listen. Eldre billetter virker fortsatt.
- Chatten omtaler funnet som et forslag fra bildeanalysen, aldri som bekreftet. Ved lav
  sikkerhet alltid «mulig …»; ved middels «sannsynlig, bør bekreftes»; ved motstridende navn
  skal den ikke velge art.
- Råd for akkurat den arten som er foreslått, ikke for hele dyregruppen; lite alvorlige arter
  omtales slik.
- Art utenfor biblioteket: ingen automatiske råd om bekjempelse, gift, limfeller eller
  profesjonell bekjempelse. Markkakerlakk får FHIs råd (ikke et skadedyr, skal ikke bekjempes).
  Markkakerlakk er fortsatt ikke i artsbiblioteket.
- «Meld fra om feil bestemmelse» og historikken bruker samme sikkerhet som resultatsiden. For
  en art utenfor listen var det «lav sikkerhet (modellens tall: 0)» i e-posten mens siden sa
  «høy sikkerhet». Ukjente og motstridende funn får ingen sikkerhet i e-posten.

## Uutgitt – H1: artsaliaser og motstridende artsnavn

AI-modeller og analyseprompter er uendret, bortsett fra at artslisten som sendes til modellen
nå har med de to nye artene.

- Pelsbille (*Attagenus pellio*) og rødmus (*Myodes rutilus*) er egne arter med fagdata fra FHIs
  felthåndbok 2023 (s. 27 og 120). De var før aliaser for brun pelsbille og klatremus.
- Fjernet aliaser som pekte på feil art: «anthrenus» (to arter i slekten), «hundelopp» og «loppe»
  (katteloppe er etter FHI en sjeldnere art i Norge).
- Etter FHI: klatremus finnes nord til Salten, brun pelsbille har svart halsskjold, og
  katteloppe er en sjeldnere art.
- Peker det norske og det vitenskapelige navnet fra AI-en på forskjellige arter, velger appen
  ikke. Svaret blir «Kunne ikke identifisere funnet sikkert» med boksen «Analysen inneholder
  motstridende artsnavn». De to artene vises som «Mulige arter (ingen sikkerhet oppgitt)» –
  uten egne sikkerhetsnivåer. Det samme gjelder på skjermen, i historikken og i PDF-en, og når
  navnene kommer som «art utenfor listen».
- Generelle navn som «mus», «veps», «møll», «flue» og «kakerlakk» har et faglig omfang (artene
  navnet kan gjelde). Norsk navn går foran, og det vitenskapelige navnet avgjør hvilken art:
  - innenfor navnet → den spesifikke arten («Kakerlakk» + *Periplaneta americana* → Amerikansk
    kakerlakk, «Mus» + *Apodemus sylvaticus* → Liten skogmus)
  - en annen art i listen → motstridende («Mus» + *Rattus norvegicus*)
  - ukjent → art utenfor listen; ingen art velges fra biblioteket (f.eks. markkakerlakk,
    *Ectobius lapponicus*, blir ikke tysk kakerlakk)
  - mangler → bare «Mulig …» med lav sikkerhet og forklaring
  Ekskrementanalysen er unntatt («Mus» og «Rotte» er hovedsvarene der).
- Historikken viser «Mulig …» for usikre forslag, slik skjermen og PDF-en gjør.
- En art utenfor listen blir ikke lenger gjort om til en art i biblioteket via et norsk alias.
- Historikk lagret før denne endringen får varselet om eldre artsdata (versjon 3).

## Uutgitt – M9: trygg veiledning for ekskrementer

Ingen tekst ber lenger brukeren knuse, trykke på eller ta på ekskrementer, heller ikke med hansker.
AI-modeller og analyseprompter er uendret.

- Tipset og eksempelteksten i ekskrementflyten ber om å beskrive utseende og funnsted, og
  anbefaler et nærbilde med mynt eller linjal. Tipset sier «Ikke ta på ekskrementene.»
- Forbeholdet om mus og flaggermus beskriver forskjellen uten å be brukeren knuse noe.
- «Slik bekrefter du funnet» for flaggermus- og museekskrementer bygger på utseendet.
- Ny boks «Trygg opprydding» (FHI: hansker og munnbind, fukt med såpevann, tørk opp med klut,
  ikke fei eller støvsug) for mus, rotte, flaggermus og ukjente ekskrementer, på skjermen og i
  PDF-en. Mårdyrekskrementer og bilder av selve dyret får den ikke.

## Uutgitt – tekniske rettelser etter uavhengig revisjon

Gjelder funn H2, L1, M3, M4, M5, L2 og L4. AI-modeller, artsbibliotek og faglige prompter er uendret.

- H2: Et analysesvar som kommer etter at brukeren har åpnet et annet funn, overtar ikke lenger
  visningen. Det legges i historikken med eget bilde.
- L1: Ødelagt eller gammel lokal lagring (historikk og chat) krasjer ikke lenger siden.
- M3: Alternativer tolker prosent som hovedforslaget, og et alternativ som er minst like
  sannsynlig vises med nivå og merknad på skjermen og i PDF-en.
- M4: Ukjente ekskrementfunn beholder typen, med råd og forbehold om ekskrementer.
- M5: Tidligere chatsvar sendes i sin helhet til modellen (ikke kuttet til 500 tegn).
- L2: Chatboblen sammenligner rektangler i stedet for tusenvis av punktsøk (ingen hakking).
- L4: Funn-chatten har 16 px skrift på mobil (ingen zoom på iPhone), og mobilchatten er en
  modal dialog med fokus som holdes inne.

## Uutgitt – opprydding i avhengigheter

- Fjernet ubrukte pakker: `dotenv`, `clsx` og `tailwind-merge` (ingen kode, konfigurasjon,
  skript eller andre pakker bruker dem).
- Dependabot: React, React DOM og typene oppdateres samlet. Ingen store versjonshopp for
  TypeScript, ESLint og `@types/node` (Node 22) før verktøyene støtter dem. Sikkerhets-
  oppdateringer lages fortsatt. Ingen andre versjoner er endret.

## Uutgitt – PDF-rapport og chatboble

Detaljer: [docs/pdf-rapport.md](docs/pdf-rapport.md). AI-logikken, promptene, modellene og
artsbiblioteket er uendret.

- «Last ned PDF-rapport» etter analyse og fra historikken. Lages lokalt i nettleseren fra det
  eksisterende resultatet (ny avhengighet: `pdf-lib`).
- PDF-dialog med valgfri samtale som vedlegg – bare meldinger fra «Spør om dette funnet» for funnet
  som vises (koblet med visningsnummer og chat-billett, ikke tidspunkt). Bedre sideskift.
- Chatboblen dekker aldri knapper eller skjemafelt: blir kompakt, flytter seg til ledig plass eller
  tones ut, og skjules mens tastaturet er oppe.
- Forsiden: ny tekst om skadedyr og ekskrementer.

## Uutgitt – Artsorakel 2.0

Detaljer: [docs/artsorakel-2.md](docs/artsorakel-2.md). Bildeanalysen, modellene, promptene og
artsbiblioteket er uendret.

- Offisiell Ocab-logo i toppfelt og bunntekst (fra original-PNG), lys plate i mørk modus.
- «Spør Artsorakel»: flytende chatboble og skadedyrassistent uten bilde, med fagstoff fra
  artsbiblioteket, oppfølgingsspørsmål og kontaktkort til Ocab ved behov.
- Samme chatmodell, delte grenser og samme kostnadsramme som funn-chatten. Ingen nye miljøvariabler.
- Historikk: tre siste på forsiden, og «Se alle tidligere funn».
- Personvern: nytt avsnitt om chatten (til godkjenning).
- Tetteråd for gnagere: ny hovedregel (sikre åpninger, undersøk om det er gnagere inne, fangst
  eller bekjempelse, skadedyrbekjemper ved omfattende aktivitet) i artsbiblioteket og begge
  chattene. Den gamle regelen om ikke å tette en aktiv inngang er fjernet. Størrelsene er beholdt.
- Spør Artsorakel: knappen «Analyser bilde» når et bilde kan gi sikrere artsbestemmelse.
- Kontaktkortet vises bare ved konkrete grunner, og ikke to svar på rad.
- Faglig rettelse (FHI): brun tremaur er *Lasius brunneus*, ikke *Camponotus ligniperda*
  (jordstokkmaur). Rettet størrelse, utseende, utbredelse, tiltak og FHI-lenke for brun tremaur,
  størrelse og latinsk navn for stokkmaur, maur-nøkkelen og assistentens eksempel. Se
  [docs/faglig-rettelse-maur.md](docs/faglig-rettelse-maur.md).
- Maurartene kontrollert mot FHIs felthåndbok 2023 (s. 79–87): svart jordmaur kan skade
  råteskadet treverk og isopor, rettede utbredelser, størrelser, sverming og kjennetegn, eitermaur
  og *Formica rufa*-gruppen, og ingen ren størrelsesregel for stokkmaur i bildeanalysen.
- Faglig kvalitetssikring av maur: godkjent formulering om fukt, råte og vannskader i
  bygningskonstruksjoner (stokkmaur, brun tremaur, svart tremaur, svart jordmaur og begge chattene),
  rettede størrelser og forvekslinger, ingen løfter om forsikringsdekning, og et diskret varsel ved
  eldre lagrede funn.
- Spør Artsorakel: store maur og utkast/sagflis ved en bygningskonstruksjon gir mistanke om
  stokkmaur, med forbehold om at andre maurarter ikke kan utelukkes (bare chat-instruksen er endret).
- Mobil: mer kompakt toppfelt og personverntekst i chatten, og skrivefeltet holdes synlig over
  tastaturet på iPhone.

## Uutgitt – justeringer etter test i Preview

- Artsavhengige tetteråd: mus fra omtrent 4–6 mm, rotte fra omtrent 10–14 mm, og
  kartlegging før en aktiv inngang tettes (bare tiltak-tekster – identifiseringen er uendret).
- Chat: helt irrelevante spørsmål får et fast svar uten AI-kall. Skjerpet chat-instruks.
- Ekskrementer: forbehold om mus og flaggermus, og tips om størrelse og beskrivelse når de mangler.
- Bilder uten skadedyr vises som «Ingen skadedyr på bildet».
- Chat: timegrensen per IP er hevet fra 10 til 120 (konfigurerbar), med ny spamgrense på 10 per
  minutt. Taket per analyse er hevet fra 20 til 60. Døgnbudsjett og kostnadsramme er uendret.
- Stokkmaur: nye råd om fukt og råte (ikke en nødvendig betingelse) og om reir i isolasjon og
  polystyren. Bare tiltakene for stokkmaur – andre maurarter og identifiseringen er uendret.

## Uutgitt – leveranse A: sikkerhet, kostnadskontroll og stabilitet

Detaljer, tester og driftssteg: [docs/leveranse-a.md](docs/leveranse-a.md).
Artsbiblioteket, promptene og AI-modellene er uendret.

### Sikkerhet
- Alle API-felter valideres. Feltet «storrelse» kunne før sende ubegrenset tekst til AI-en.
- Next.js 16.4.5 og sharp 0.35.5 (kjente sårbarheter). Bildeoptimaliseringen er slått av.
- Bildets faktiske format sjekkes før bildemotoren, og antall piksler har fått et tak.
  Originalfilen sendes aldri videre.
- For store forespørsler avvises før de leses inn.
- Valgfri tilgangskode for ansatte (`ARTSORAKEL_TILGANGSKODE`).
- Bruksgrenser per enhet og IP, og felles døgnbudsjett. Tellerne ligger i Upstash (se Kostnadskontroll).
- Chatten krever en signert billett fra en analyse, og falsk samtalehistorikk avvises.
- Sikkerhetsheadere (CSP, rammevern, HSTS på Vercel). `X-Powered-By` er fjernet.

### Kostnadskontroll (tre lag)
- Antallsgrenser: per enhet, per IP og per døgn. Hindrer misbruk, men sier ingenting om kroner.
- Kostnadsramme i USD per døgn: beløpet reserveres før hvert AI-kall og avregnes mot faktisk
  kostnad etterpå. Når rammen er nådd, avvises nye AI-kall.
- OpenRouter-saldo uten automatisk påfyll: siste barriere, utenfor appen.
- Alle tellere er atomiske Lua-skript i Redis. Testet med samtidige forespørsler mot ekte Redis.
- Er Upstash satt opp, men nede, avvises AI-kall midlertidig med norsk melding (ingen reserve i minnet).
- Rettet: en teller kunne i sjeldne tilfeller bli liggende uten utløpstid.
- IP-adresser lagres bare som anonymisert verdi (HMAC) i Upstash.

### Ferdigstilling av leveranse A
- Vercel Production/Preview bruker aldri tellere i minnet. Mangler Upstash, avvises AI-kall.
- Påkrevde innstillinger i Vercel Production/Preview: `ARTSORAKEL_HEMMELIGHET`
  og Upstash. Ellers `503 ikke_konfigurert`. Tilgangskoden er valgfri.
- Tom OpenRouter-saldo gir en egen norsk melding.
- Veiledningen anbefaler ikke å slå av sikkerhetsfunksjoner som nødløsning.

### Stabilitet og drift
- Logging av forbruk per AI-kall (tokens, kostnad, tid) uten personopplysninger.
- Tidsgrense og norske feilmeldinger ved dårlig dekning.
- Varsel når bildet er for stort for Vercel (over 4 MB etter komprimering).
- Ny chatsamtale for hver analyse.

### Personvern
- Ny personverntekst i bunnen av siden og **utkast** til `/personvern` (må godkjennes av Ocab).

### Kvalitet
- Testoppsett: Vitest (94 tester, hvorav 10 mot ekte Redis) og Playwright (7 UI-tester), alle mot en falsk AI.
- `.env.example` dokumenterer alle miljøvariabler.
- `scripts/sjekk-upstash.mjs` sjekker Upstash-oppsettet med appens egne Lua-skript.
- Veiledning for oppsett i OpenRouter og Vercel: docs/veiledning-vercel-openrouter.md.
