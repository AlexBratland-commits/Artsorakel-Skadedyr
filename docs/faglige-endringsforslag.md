# Faglige endringsforslag – til godkjenning

**Ingenting i denne listen er endret i appen.** Artsbiblioteket (`src/lib/pests.ts`), promptene og
bekjempelsesrådene er uendret til du har godkjent punkt for punkt. Svar gjerne med
«godkjent / avslått / endre slik» per nummer.

Kildegrunnlag: FHI (Skadedyrhåndboka), Store norske leksikon (SNL), biodiversity.no og EPPO.
«Ikke verifisert» betyr at jeg ikke fant en pålitelig norsk kilde. Da er det ditt faglige skjønn
som avgjør.

## A. Norske og latinske navn

| # | I appen i dag | Forslag | Kilde | Status |
|---|---|---|---|---|
| 1 | «Brun tremaur» = *Camponotus ligniperda*, 6–18 mm (`pests.ts:487`) | Gi oppføringen navnet **jordstokkmaur** (*C. ligniperda*). Navnet «brun tremaur» hører til *Lasius brunneus*, en liten maur på 3,2–4,5 mm. | [FHI – stokkmaur](https://fhi.no/sk/skadedyrhandboka/maur/stokkmaur), [FHI – brun tremaur](https://fhi.no/sk/skadedyrhandboka/maur/brun-tremaur), [SNL](https://snl.no/brun_tremaur) | Verifisert |
| 2 | Stokkmaur har kallenavnet «tremaur» (`:469`) | Fjern kallenavnet. «Tremaur» kan bety både svart og brun tremaur, og AI-svaret «Tremaur» blir i dag til stokkmaur. | Som 1 | Verifisert |
| 3 | «Stokkmaur» = *C. herculeanus* | Vurder «stokkmaur (skogstokkmaur)», eller legg «skogstokkmaur» til som kallenavn | [FHI – stokkmaur](https://fhi.no/sk/skadedyrhandboka/maur/stokkmaur) | Verifisert |
| 4 | «Jordveps» = *Vespula germanica* (`:613`) | *V. germanica* heter **tysk veps**. «Jordveps» brukes trolig om *V. vulgaris*. | [SNL – tysk veps](https://snl.no/tysk_veps); Wikispecies for *V. vulgaris* | Delvis verifisert |
| 5 | «Treveps» = *Dolichovespula media* (`:627`) | **Buskveps**. FHI bruker «treveps» om kjempetreveps og blå treveps (Siricidae), som ikke er i biblioteket. | [biodiversity.no](https://biodiversity.no/Pages/200589/?Key=116), [FHI – kjempetreveps](https://fhi.no/sk/skadedyrhandboka/veps-og-bier/kjempetreveps) | Verifisert |
| 6 | «Vindusflue» = *Pollenia rudis*, kallenavn «klyngeflue» (`:979`) | **Loftsflue**. «Klyngeflue» er dansk. | [FHI – loftsfluer](https://www.fhi.no/nettpub/skadedyrveilederen/fluer-og-mygg/loftsfluer/), [SNL](https://snl.no/loftsflue) | Verifisert |
| 7 | Klatremus har kallenavnet «rødmus» (`:147`) | Fjern kallenavnet. Rødmus (*Myodes rutilus*) er en egen art i Nord-Norge. | [FHI – rødmus](https://fhi.no/sk/skadedyrhandboka/gnagere/rodmus), [SNL](https://snl.no/r%C3%B8dmus) | Verifisert |
| 8 | Brun pelsbille har kallenavnene «pelsbille» og «attagenus pellio» (`:721`) | Fjern begge. *Attagenus pellio* (pelsbille) er en egen art. | [FHI – pelsbille](https://fhi.no/sk/skadedyrhandboka/biller/pelsbille), [FHI – brun pelsbille](https://fhi.no/sk/skadedyrhandboka/biller/brun-pelsbille) | Verifisert |
| 9 | «Soppmygg» = Sciaridae (`:1007`) | FHI bruker **sørgemygg (hærmygg)**. Forslag: sørgemygg som hovednavn og soppmygg som kallenavn. | [FHI – sørgemygg](https://fhi.no/sk/skadedyrhandboka/fluer-og-mygg/harmygg-sorgemygg) | Verifisert |
| 10 | Kattelopp har kallenavnet «hundelopp» (`:1044`) | Vurder å fjerne det. Hundelopp (*Ctenocephalides canis*) er en egen art. | – | Ikke verifisert |
| 11 | «Tepperbille» = *Anthrenus verbasci* | Kontroller norsk navn. EPPO bruker «teppebille» om *A. scrophulariae*. | [EPPO](https://gd.eppo.int/taxon/ANTRSC) | Ikke verifisert |

## B. Kjennetegn og tekst

| # | I appen i dag | Forslag | Status |
|---|---|---|---|
| 12 | Stokkmaur, forvekslinger: «Svart jordmaur» står to ganger (`:474–475`) | Slå sammen til én linje. | **Rettet** (godkjent av fagansvarlig, PR #15) |
| 13 | Rødbrun rismelbille: «køllefformede antenner» (`:831`) | Rett skrivefeilen til «kølleformede» | Bekreftet i koden |

## C. Ekskrementbeskrivelser

| # | I appen i dag | Forslag | Kilde / status |
|---|---|---|---|
| 14 | Mus: 3–8 mm (`:1259`) | FHI oppgir 3–6 mm for husmus. Øvre grense 8 mm øker overlappet mot ung rotte. Behold 3–8 hvis det samler skogmus bevisst. | [FHI – husmus](https://fhi.no/sk/skadedyrhandboka/gnagere/husmus). Ditt skjønn |
| 15 | Ekskrementnøkkelen sier «Under 1 cm → mus eller flaggermus», mens Brunrotte sier «unge rotter … 6–10 mm» | Gjør nøkkelen konsistent, for eksempel «Under 1 cm → oftest mus eller flaggermus, men ung rotte kan gi 6–10 mm». **Dette er promptinnhold og testes i leveranse C før bruk.** | Intern motsigelse |
| 16 | Størrelsesvalgene for ekskrementer: «6–15 mm» dekker både mus og rotte, og «15 mm eller mer» blander rotte og mår (`types.ts:88–93`) | Nye intervaller, for eksempel under 3 mm, 3–8 mm, 8–12 mm («grensesone»), 12–25 mm og 3–10 cm. **Påvirker prompten og testes i C.** | Ditt skjønn |
| 17 | Svartrotte er sperret i ekskrementmodus. Appen viser nå forbeholdet «Ekskrementer alene gir ikke alltid sikkert grunnlag for å skille brunrotte fra svartrotte. I Norge er brunrotte langt vanligst.» | Godkjenn eller juster formuleringen (innført i leveranse B, etter din beskrivelse) | Til godkjenning |

## D. Bekjempelsesråd

Rådene er gjennomgående forsiktige og henviser til godkjent skadedyrbekjemper. Jeg har ikke funnet
noe som bør fjernes. Følgende bør du likevel se over:

| # | Punkt | Status |
|---|---|---|
| 18 | Husmus: «Tett sprekker fra 6 mm og opp» | Ikke verifisert mot FHI |
| 19 | Fulle tiltak vises også ved «Mulig X» (lav sikkerhet), for eksempel «Krever profesjonell behandling» ved mulig veggedyr | Forslag til visning i leveranse C. Selve rådene er ikke endret. |
| 20 | Fredede arter og nyttearter (flaggermus, mår, pinnsvin, humle, honningbie) har ingen egen merking utover tiltaksteksten | Forslag: et eget felt «Fredet / nytteart» som vises som merke. Krever din godkjenning av hvilke arter. |

## E. FHI-lenker

| # | Forslag | Status |
|---|---|---|
| 21 | I dag har bare 3 av 81 arter direkte FHI-lenke. Disse sidene fant jeg hos FHI og kan legges inn: husmus, brunrotte, klatremus, rødmus, pelsbille, brun pelsbille, sørgemygg, loftsfluer, kjempetreveps. Hver lenke kontrolleres manuelt før bruk. | Til godkjenning |
