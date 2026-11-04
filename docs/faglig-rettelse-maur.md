# Faglig rettelse: brun tremaur og stokkmaur

**Primærkilde:** Folkehelseinstituttets skadedyrhåndbok.
- Brun tremaur: https://www.fhi.no/sk/skadedyrhandboka/maur/brun-tremaur/
- Stokkmaur: https://www.fhi.no/sk/skadedyrhandboka/maur/stokkmaur/

FHI-sidene kunne ikke åpnes direkte fra utviklingsmiljøet. Opplysningene bygger på det
fagansvarlig har kontrollert mot FHI, og på FHIs egne sammendrag i søkeresultater.

## Feil som ble funnet

| # | Hvor | Feil |
|---|---|---|
| 1 | Artsbiblioteket, brun tremaur | Registrert som *Camponotus ligniperda* – som er **jordstokkmaur**, en stokkmaur. Brun tremaur er *Lasius brunneus* (tidligere «brun jordmaur»). |
| 2 | Artsbiblioteket, brun tremaur | Størrelse «6–18 mm, som stokkmaur». FHI: arbeidere 3,2–4,5 mm, dronninger 8–9 mm. |
| 3 | Artsbiblioteket, brun tremaur | Utseende «fremste del av bakkroppen rødbrun, blankere» – dette beskriver jordstokkmaur. FHI: gulbrun mellomkropp og bein, glatt første antenneledd. |
| 4 | Artsbiblioteket, brun tremaur | Alvorlighet «høy», tiltak «samme håndtering som stokkmaur», utbredelse «Sør-Norge» og FHI-lenke til stokkmaursiden – alt arvet fra stokkmaur. |
| 5 | Artsbiblioteket, stokkmaur | Latin *Camponotus herculeanus* alene, selv om stokkmaur omfatter flere Camponotus-arter (blant annet jordstokkmaur og skogstokkmaur). Størrelse «6–18 mm» uten skille mellom arbeidere (ca. 5–14 mm) og dronninger (opptil 18 mm). Forvekslingen med brun tremaur beskrev jordstokkmaur. |
| 6 | Bildeidentifiseringens maur-nøkkel (`GROUP_FOCUS.Maur` i artsbiblioteket) | Brun tremaur sto blant maur over 6 mm og ble skilt fra stokkmaur på rødbrun bakkropp. |
| 7 | Spør Artsorakel (instruksen) | Eksempelet «rødbrun fremre del av bakkroppen og blankere kropp hos brun tremaur» – samme sammenblanding. |

Funn-chatten og den generelle identifikasjonsprompten inneholdt ikke feilen.

## Hva som er rettet

- **Brun tremaur:** *Lasius brunneus*; arbeidere 3,2–4,5 mm, dronninger 8–9 mm; brun med
  gulbrun mellomkropp og bein; utbredelse fra Agder til Østlandet; reir i gamle, solrike trær,
  men kan bygge reir innendørs i treverk eller isolasjon; utkast av trefliser fra sprekker;
  alias «brun jordmaur»; egen FHI-lenke. Alvorlighet satt til *middels* (som svart tremaur) –
  **en faglig vurdering til godkjenning**, FHI angir ikke alvorlighet.
- **Stokkmaur:** *Camponotus spp.*; arbeidere ca. 5–14 mm, dronninger opptil 18 mm; Norges
  største maur; bakkroppen kan ha rødbrun fremre del hos jordstokkmaur; angrep i bygninger er
  vanligst i Sør-Norge; aliaser jordstokkmaur, skogstokkmaur, *C. herculeanus*, *C. ligniperda*.
  Tiltak og godkjente tekster er uendret.
- **Maur-nøkkelen:** brun tremaur flyttet til 3–6 mm og skilles på gulbrun mellomkropp og bein.
- **Spør Artsorakel:** eksempelet er rettet. Den godkjente ordlyden ved mistanke om stokkmaur er
  uendret.

Ikke endret: AI-modellene, den generelle identifikasjonsprompten og andre arter.
Grunnlinjetesten som måler lengden på hele artslisten er oppdatert (24 485 → 24 765 tegn) fordi
artsdataene er endret. Prompttekstene ellers er byte-for-byte uendret.

## Arts-ID-er og gamle funn

- Arts-ID-en er det norske navnet, og «Brun tremaur» og «Stokkmaur» er beholdt.
- Lagrede funn i historikken inneholder hele resultatet slik det var. Et gammelt funn av
  «Brun tremaur» viser derfor fortsatt det gamle latinske navnet og de gamle tiltakene til det
  slettes. Det kan ikke rettes automatisk, fordi vi ikke vet om bildet viste en stokkmaur eller en
  brun tremaur. Funn-chatten for et nytt funn bruker de rettede dataene.

## Runde 2: faglig kvalitetssikring (godkjente føringer fra fagansvarlig)

FHI-sidene kunne fortsatt ikke åpnes fra utviklingsmiljøet (proxyen avviser www.fhi.no).
Artsnavnene fra runde 1 er beholdt.

**Forvekslinger og størrelser (stokkmaur, brun tremaur, svart tremaur, svart jordmaur):**
- Svart tremaur og svart jordmaur: «Stokkmaur – mye større (6–18 mm)» → «arbeidere ca. 5–14 mm,
  dronninger opptil 18 mm».
- Brun tremaur lagt inn som forveksling hos stokkmaur, svart tremaur og svart jordmaur (gulbrun
  mellomkropp og gulbrune bein). Brun tremaur sammenlignes med svart tremaur.
- Stokkmaur: de to linjene om svart jordmaur er slått sammen til én.

**Maur og fukt:** den godkjente formuleringen
«Mauraktivitet i bygningskonstruksjoner kan være knyttet til fukt, råte eller tidligere
vannskader. Det anbefales derfor å undersøke om det finnes underliggende fuktproblemer. Maur kan
imidlertid også etablere seg i tørre konstruksjoner. Ved mistanke om maurreir i bygningen bør en
profesjonell skadedyrbekjemper vurdere forholdene og behovet for videre undersøkelser.»
- står ordrett i tiltakene for de fire artene. Hos stokkmaur erstatter den den eldre fuktteksten,
  og den har forrang. Hos svart tremaur og svart jordmaur erstatter den «Maur inne skyldes som
  oftest fukt eller vannskade …». Svart jordmaur har i tillegg en linje som skiller maur som bare
  kommer inn etter mat, fra reir i konstruksjonen.
- Begge chattene har felles regler (`src/lib/server/fagregler.ts`): formuleringen ved mistanke om
  reir i konstruksjoner, skille mellom tilfeldige maur og etablerte reir, ingen påstand om at alle
  maurproblemer skyldes vannskade eller at fravær av synlig fukt utelukker stokkmaur, ikke
  bagatellisere etablerte angrep (også brun tremaur), ingen giftinstruksjoner.

**Brun tremaur:** alvorlighet «middels» beholdt. Tiltaket er nå «Reir inne i
bygningskonstruksjoner bør undersøkes – et etablert angrep kan kreve profesjonell bekjempelse».

**Forsikring:** «ofte dekket av boligforsikring» hos stokkmaur er erstattet med «Om skaden dekkes
av forsikringen, avhenger av vilkårene i den enkelte forsikringsavtalen.» Begge chattene skal ikke
love forsikringsdekning.

**Gamle funn:** nye funn lagres med artsdataversjon 2. Funn uten versjon viser «Artsopplysninger
kan ha blitt oppdatert siden denne analysen ble utført.» når de åpnes fra historikken. Funnet og
artsnavnet endres ikke.

## Gjenstår – til senere godkjenning (ikke endret)

1. Rødmaur og rød skogsmaur har fortsatt «Maur inne skyldes som oftest fukt eller vannskade …».
2. Skjeggkre: «skjeggkre dekkes ofte av boligforsikring».
3. Sotstokkmaur – vurderes i en egen gjennomgang av artsbiblioteket.
4. Størrelsene for svart tremaur (4–6 mm) og svart jordmaur (3–5 mm) er ikke kontrollert mot FHI,
   og skiller ikke mellom arbeidere og dronninger.
5. Utbredelse for svart tremaur («Hele landet») er ikke kontrollert mot FHI.
