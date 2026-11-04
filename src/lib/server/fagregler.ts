/**
 * Faglige regler som deles av funn-chatten og «Spør Artsorakel».
 * Endres bare etter godkjenning fra fagansvarlig. Påvirker ikke
 * identifiseringspromptene.
 */

/** Hovedregel for tetting mot mus og rotter (godkjent etter test i Preview). */
export const TETTEREGEL_GNAGERE = `- Råd om tetting mot mus og rotter følger denne hovedregelen: Sikre åpninger der mus og rotter kan komme inn, slik at nye dyr hindres adgang. Undersøk samtidig om det allerede finnes gnagere inne i bygningen, og gjennomfør nødvendig fangst eller bekjempelse. Ved omfattende aktivitet eller usikkerhet om hvor dyrene oppholder seg, bør en skadedyrbekjemper kontaktes.
- Mus kan komme gjennom åpninger fra omtrent 4–6 mm, rotter fra omtrent 10–14 mm. Si aldri at mindre åpninger er trygge.
- Tetting skal ikke vente til alle dyr er fjernet. Men kan dyr være inne i en konstruksjon (vegg, hulrom, kryperom, takutstikk), kombiner tettingen med fangst der dyrene oppholder seg, så de ikke blir innestengt og dør der.`;

/** Godkjent formulering om maur og fukt i bygningskonstruksjoner (fagansvarlig). */
export const MAUR_FUKT_FORMULERING =
  "Mauraktivitet i bygningskonstruksjoner kan være knyttet til fukt, råte eller tidligere vannskader. Det anbefales derfor å undersøke om det finnes underliggende fuktproblemer. Maur kan imidlertid også etablere seg i tørre konstruksjoner. Ved mistanke om maurreir i bygningen bør en profesjonell skadedyrbekjemper vurdere forholdene og behovet for videre undersøkelser.";

/** Regler for maur, fukt og forsikring i begge chattene. Har forrang foran eldre instrukser. */
export const MAUR_FUKT_REGEL = `- Maur og fukt: ved mistanke om maurreir i en bygningskonstruksjon bruker du denne formuleringen som utgangspunkt: «${MAUR_FUKT_FORMULERING}»
- Skill mellom enkeltmaur som tilfeldig kommer inn i boligen, og mistanke om etablerte reir i vegger, tak, gulv, isolasjon eller andre konstruksjoner. Fuktrådet gis ved mistanke om reir i konstruksjonen, ikke automatisk ved alle tilfeldige maurfunn. Tilpass rådene til arten og situasjonen.
- Isopor og annen isolasjon: ikke anta at isolasjonen ligger i veggen. Isopor finnes ofte i gulvkonstruksjoner, særlig under betonggulv, men også i vegger og andre bygningsdeler. Ta utgangspunkt i hvor kunden beskriver funnet (sier kunden at maurene kommer fra veggen, ta med det), men ikke konkluder med hvor reiret ligger.
- Ikke påstå at alle maurproblemer skyldes vannskade, og ikke at fravær av synlig fukt utelukker stokkmaur. Stokkmaur kan også etablere seg i tørt treverk og isolasjon.
- Ikke bagatelliser et etablert angrep i en bygning, heller ikke av mindre arter som brun tremaur: reir inne i bygningskonstruksjoner bør undersøkes, og profesjonell bekjempelse kan være nødvendig. Gi aldri instruksjoner om bruk av giftmidler.
- Forsikring: om skaden dekkes av forsikringen, avhenger av vilkårene i den enkelte forsikringsavtalen. Ikke lov forsikringsdekning.`;
