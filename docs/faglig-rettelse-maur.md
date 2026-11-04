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

## Forslag til andre arter (ikke endret – til godkjenning)

1. Svart tremaur og svart jordmaur: «Stokkmaur – mye større (6–18 mm)» → «arbeidere ca. 5–14 mm».
2. Svart jordmaur: legg til forveksling «Brun tremaur – gulbrun mellomkropp og bein».
3. Stokkmaur: to nesten like forvekslinger med svart jordmaur kan slås sammen.
4. Stokkmaur: FHI nevner sotstokkmaur (sjelden, helt svart). Vurder å nevne den i kjennetegnene.
5. Flere maurarter har tiltaket «Maur inne skyldes som oftest fukt eller vannskade». Bør
   kontrolleres mot FHI, som sier at tørre, godt vedlikeholdte bygg har færre maurproblemer.
6. Stokkmaur: «ofte dekket av boligforsikring» bør kontrolleres.
