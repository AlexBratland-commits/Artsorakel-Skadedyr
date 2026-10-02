import type { Severity } from "./types";

/**
 * Hovedgrupper. Steg 1 i artsbestemmelsen velger én av disse, og steg 2 får
 * bare artene i den gruppen. Det er dette som gjør at et pattedyr ikke lenger
 * konkurrerer med 40 insekter om modellens oppmerksomhet.
 */
export const GROUPS = [
  "Gnagere",
  "Andre pattedyr",
  "Fugler",
  "Kakerlakker",
  "Kre",
  "Maur",
  "Veps og bier",
  "Biller",
  "Møll",
  "Fluer og mygg",
  "Lus, lopper og midd",
  "Edderkoppdyr",
  "Andre småkryp",
  "Ekskrementer",
] as const;

export type PestGroup = (typeof GROUPS)[number];

export interface Pest {
  norsk: string;
  latin: string;
  /** Brukes til FHI-lenke. Se fhiUrl() nederst. */
  slug: string;
  gruppe: PestGroup;
  /** Kort visuell kjennetegn-tekst – dette er det modellen matcher mot. */
  kjennetegn: string;
  utbredelse: string;
  sesong: string;
  alvorlighet: Severity;
  tiltak: string[];
  /** Andre skrivemåter modellen kan finne på å bruke. */
  aliaser?: string[];
  /** Arter dette lett forveksles med, og hva som skiller dem. */
  forveksles?: string[];
  /** Ekstra kjennetegn som bekrefter funnet – brukt for ekskrement-arter. */
  bekreftelse?: string[];
  /** Kort, viktig varsel som fremheves i resultatvisningen. */
  notat?: string;
}

/**
 * Artsliste for de vanligste skadedyrene i norske bygg og uteområder.
 * Fakta bør kvalitetssikres mot FHIs skadedyrhåndbok og Ocabs eget
 * fagmateriale før appen brukes mot kunde.
 */
export const PESTS: Pest[] = [
  // ── Gnagere ──────────────────────────────────────────────────────────
  {
    norsk: "Brunrotte", latin: "Rattus norvegicus", slug: "rotte", gruppe: "Gnagere",
    kjennetegn: "Kraftig kropp 20–27 cm, butt snute, små ører, hale kortere enn kroppen",
    utbredelse: "Hele landet, tettest i byer og langs kysten",
    sesong: "Hele året, søker innendørs på høsten",
    alvorlighet: "høy",
    aliaser: ["brun rotte", "rotte"],
    forveksles: ["Husmus – langt mindre, og ørene er store i forhold til hodet", "Vånd – har svært kort hale og nesten skjulte ører"],
    tiltak: [
      "Tett alle åpninger på 12 mm eller mer rundt rør, dører og luftventiler",
      "Fjern matkilder: fuglemat, kompost, åpne avfallsbeholdere",
      "Sjekk avløp og kummer – brunrotte kommer ofte opp via kloakk",
      "Rotteangrep i bolig bør håndteres av godkjent skadedyrbekjemper",
    ],
  },
  {
    norsk: "Svartrotte", latin: "Rattus rattus", slug: "rotte", gruppe: "Gnagere",
    kjennetegn: "Slankere enn brunrotte, spiss snute, store ører, hale lengre enn kroppen",
    utbredelse: "Sjelden i Norge, hovedsakelig havnestrøk",
    sesong: "Hele året",
    alvorlighet: "høy",
    aliaser: ["svart rotte", "takrotte"],
    forveksles: ["Brunrotte – tyngre bygd, kortere hale, holder til lavt i bygget"],
    tiltak: [
      "Sikre loft og hulrom – arten klatrer godt og holder til høyt i bygget",
      "Tett innganger og fjern klatreveier langs fasade og kabler",
      "Tett alle åpninger på 12 mm eller mer rundt rør, dører og luftventiler",
      "Kontakt skadedyrbekjemper for artsbestemmelse og tiltak",
    ],
  },
  {
    norsk: "Husmus", latin: "Mus musculus", slug: "mus", gruppe: "Gnagere",
    kjennetegn: "6–10 cm kropp, gråbrun, store ører, hale omtrent like lang som kroppen",
    utbredelse: "Hele landet, svært vanlig innendørs",
    sesong: "Hele året, flest innerapporter september–november",
    alvorlighet: "middels",
    aliaser: ["mus"],
    forveksles: ["Skogmus – større øyne, hvitere buk, holder mest til ute", "Ung brunrotte – kraftigere poter og tykkere hale"],
    tiltak: [
      "Tett sprekker fra 6 mm og opp med stålull og fugemasse",
      "Oppbevar tørrvarer i tette bokser",
      "Sett ut slagfeller langs vegger der du ser ekskrementer",
      "Gnag på kabler gir brannrisiko – sjekk el-skap og hulrom",
    ],
  },
  {
    norsk: "Liten skogmus", latin: "Apodemus sylvaticus", slug: "mus", gruppe: "Gnagere",
    kjennetegn: "Store øyne og ører, gulbrun rygg, hvit buk, lang hale",
    utbredelse: "Sør- og Østlandet, vanlig i hytter og uthus",
    sesong: "Trekker inn sent på høsten",
    alvorlighet: "lav",
    aliaser: ["skogmus", "liten skogsmus"],
    forveksles: [
      "Husmus – gråbrun nesten helt rundt uten skarpt avgrenset hvit buk, mindre øyne og ører",
      "Stor skogmus – større, med gult bånd som går helt over brystet (liten skogmus har høyst en liten gul flekk)",
    ],
    tiltak: [
      "Tett innganger i grunnmur, kledning og ventiler",
      "Rydd ved, løv og busker inntil veggen",
      "Sett feller på loft og i kjeller før vinteren",
    ],
  },
  {
    norsk: "Stor skogmus", latin: "Apodemus flavicollis", slug: "mus", gruppe: "Gnagere",
    kjennetegn: "Som liten skogmus, men større og med gult halsbånd over brystet",
    utbredelse: "Sørøstlandet",
    sesong: "Trekker inn sent på høsten",
    alvorlighet: "lav",
    aliaser: ["halsbåndmus", "stor skogsmus"],
    forveksles: [
      "Liten skogmus – mindre, og har høyst en liten gul flekk på brystet, ikke et sammenhengende bånd",
    ],
    tiltak: [
      "Samme tiltak som for liten skogmus: tetting og feller",
      "Sjekk hytteloft etter avføring og reirmateriale",
    ],
  },
  {
    norsk: "Klatremus", latin: "Myodes glareolus", slug: "mus", gruppe: "Gnagere",
    kjennetegn: "Rødbrun rygg, butt snute, korte ører, kort hale",
    utbredelse: "Hele landet i skogsnære områder",
    sesong: "Topper seg i smågnagerår, ofte innendørs om høsten",
    alvorlighet: "middels",
    aliaser: ["rødmus"],
    forveksles: [
      "Markmus – gråbrun i stedet for rødbrun, og ørene er nesten skjult i pelsen",
      "Skogmus – spiss snute, store øyne og ører og lang hale",
    ],
    tiltak: [
      "Tett bygget – arten kan bære smitte som gir musepest (nephropathia epidemica)",
      "Bruk støvmaske og fukt flatene ved rengjøring av avføring – ikke tørrfeiing",
      "Luft godt i hytter som har stått tomme",
    ],
  },
  {
    norsk: "Markmus", latin: "Microtus agrestis", slug: "mus", gruppe: "Gnagere",
    kjennetegn: "Kompakt og gråbrun, butt snute, ører nesten skjult i pelsen, kort hale",
    utbredelse: "Hele landet, i gress og eng",
    sesong: "Skader på plen og bark er mest synlige etter snøsmelting",
    alvorlighet: "lav",
    forveksles: [
      "Klatremus – tydelig rødbrun rygg og litt lengre hale",
      "Vånd – mye større og mørkere",
    ],
    tiltak: [
      "Gnag på bark kan drepe unge frukttrær – sett gnagerbeskyttelse rundt stammen",
      "Klipp gresset kort inn mot bed og trær før vinteren",
    ],
  },
  {
    norsk: "Vånd", latin: "Arvicola amphibius", slug: "vand", gruppe: "Gnagere",
    kjennetegn: "12–20 cm, tett mørkebrun pels, butt snute, svært små ører, kort behåret hale",
    utbredelse: "Hele landet, i hager og dyrket mark",
    sesong: "Skader synes mest vår og høst",
    alvorlighet: "middels",
    aliaser: ["jordrotte", "vannrotte"],
    forveksles: ["Brunrotte – lengre naken hale og tydelige ører"],
    tiltak: [
      "Ganger like under bakken og døde planter i bed er typiske tegn",
      "Sett nett i bunnen av høybed og rundt røtter på nye trær",
    ],
  },
  {
    norsk: "Ekorn", latin: "Sciurus vulgaris", slug: "ekorn", gruppe: "Gnagere",
    kjennetegn: "20–25 cm kropp, rødbrun til nesten svart, buskete hale, øredusker om vinteren",
    utbredelse: "Hele landet",
    sesong: "Tar seg inn på loft særlig høst og vinter",
    alvorlighet: "middels",
    tiltak: [
      "Gnag på kabler på loftet gir brannrisiko – sjekk el-anlegget",
      "Steng inngangen først når du er sikker på at dyret er ute og det ikke er unger inne",
      "Kapp greiner som gir klatrevei til taket",
    ],
  },

  // ── Andre pattedyr ───────────────────────────────────────────────────
  {
    norsk: "Mink", latin: "Neogale vison", slug: "mink", gruppe: "Andre pattedyr",
    kjennetegn: "30–45 cm kropp, jevnt mørk brun til nesten svart, liten hvit flekk under haken, kort buskete hale, lav og langstrakt kropp",
    utbredelse: "Hele landet, nesten alltid nær vann",
    sesong: "Hele året",
    alvorlighet: "middels",
    aliaser: ["neovison vison", "amerikansk mink"],
    forveksles: [
      "Mår – større, med stor gulhvit strupeflekk og kraftig busket hale",
      "Røyskatt – mindre, hvit buk sommerstid og svart halespiss hele året",
      "Ilder – lys underull som skinner gjennom, mørk ansiktsmaske",
    ],
    tiltak: [
      "Fremmed art som tar fugl, egg og fisk – sikre hønsehus og fuglebur med finmasket netting",
      "Tett innganger under naust, brygge, terrasse og uthus",
      "Fangst krever kjennskap til regelverket – ta kontakt med kommunen eller Ocab",
    ],
  },
  {
    norsk: "Mår", latin: "Martes martes", slug: "mar", gruppe: "Andre pattedyr",
    kjennetegn: "45–58 cm kropp, brun med stor gulhvit strupeflekk, lang og kraftig busket hale, store runde ører",
    utbredelse: "Hele landet i skogsområder",
    sesong: "Hele året, mest bråk på loft om vinteren",
    alvorlighet: "middels",
    aliaser: ["skogmår"],
    forveksles: ["Mink – mindre, mørkere og uten stor strupeflekk"],
    tiltak: [
      "Mår er fredet – den skal ikke avlives uten tillatelse",
      "Steng inngangen på loftet når du er sikker på at dyret er ute",
      "Fjern klatreveier: greiner, kabler og stiger inntil huset",
    ],
  },
  {
    norsk: "Røyskatt", latin: "Mustela erminea", slug: "royskatt", gruppe: "Andre pattedyr",
    kjennetegn: "20–30 cm, svært slank, brun med skarpt avgrenset hvit buk om sommeren, helt hvit om vinteren, alltid svart halespiss",
    utbredelse: "Hele landet",
    sesong: "Hele året, skifter pelsfarge",
    alvorlighet: "lav",
    aliaser: ["hermelin"],
    forveksles: ["Snømus – enda mindre og uten svart halespiss", "Mink – mørkere, tyngre og knyttet til vann"],
    tiltak: [
      "Arten jakter mus og gjør sjelden skade – vurder om tiltak trengs i det hele tatt",
      "Tett åpninger i grunnmur hvis den holder til under huset",
    ],
  },
  {
    norsk: "Snømus", latin: "Mustela nivalis", slug: "snomus", gruppe: "Andre pattedyr",
    kjennetegn: "13–20 cm, Norges minste rovdyr, brun med hvit buk, kort hale uten svart spiss",
    utbredelse: "Hele landet",
    sesong: "Hele året",
    alvorlighet: "lav",
    forveksles: ["Røyskatt – større, og halen har alltid svart spiss"],
    tiltak: [
      "Jakter mus og er sjelden et problem i seg selv",
      "Tett innganger hvis den kommer inn i uthus eller hønsehus",
    ],
  },
  {
    norsk: "Grevling", latin: "Meles meles", slug: "grevling", gruppe: "Andre pattedyr",
    kjennetegn: "60–80 cm, tung og lav kropp, grå rygg, svart-hvit stripet ansikt",
    utbredelse: "Sør- og Midt-Norge",
    sesong: "Aktiv mars–november, mest nattaktiv",
    alvorlighet: "middels",
    tiltak: [
      "Graver hi under terrasser og uthus – tett igjen først når hiet er tomt",
      "Fjern fallfrukt og fuglemat som trekker den til hagen",
      "Grevling er fredet i store deler av året – sjekk regelverket før tiltak",
    ],
  },
  {
    norsk: "Rødrev", latin: "Vulpes vulpes", slug: "rev", gruppe: "Andre pattedyr",
    kjennetegn: "60–90 cm kropp, rødbrun, spiss snute, hvit halespiss, svarte bein",
    utbredelse: "Hele landet, også i byer",
    sesong: "Hele året",
    alvorlighet: "lav",
    aliaser: ["rev"],
    tiltak: [
      "Fjern matkilder: åpent avfall, fallfrukt og kattemat ute",
      "Sikre hønsehus med nedgravd netting",
      "Ikke mat rev – tamme rev blir et større problem for alle",
    ],
  },
  {
    norsk: "Pinnsvin", latin: "Erinaceus europaeus", slug: "pinnsvin", gruppe: "Andre pattedyr",
    kjennetegn: "20–30 cm, dekket av korte pigger, brun underside",
    utbredelse: "Sør-Norge",
    sesong: "Aktiv april–oktober, i dvale om vinteren",
    alvorlighet: "lav",
    aliaser: ["piggsvin"],
    tiltak: [
      "Pinnsvin er fredet og er en nytteart i hagen – det er ikke et skadedyr",
      "La løvhauger ligge om høsten, de brukes til vinterdvale",
      "Sjekk under gressklipperen før du starter",
    ],
  },
  {
    norsk: "Flaggermus", latin: "Chiroptera", slug: "flaggermus", gruppe: "Andre pattedyr",
    kjennetegn: "Brun pels, store ører, hudvinger spent ut mellom svært lange fingre, ofte funnet sammenfoldet; vingespenn 20–30 cm",
    utbredelse: "Hele landet",
    sesong: "Aktiv april–oktober, dvale om vinteren",
    alvorlighet: "lav",
    tiltak: [
      "Alle flaggermus er fredet i Norge – de kan ikke fjernes eller avlives",
      "Utestenging kan bare gjøres utenfor yngle- og dvaletiden",
      "Ikke ta i dyret med bare hender – kontakt kommunen eller BatLife Norge",
    ],
  },

  // ── Fugler ───────────────────────────────────────────────────────────
  {
    norsk: "Bydue", latin: "Columba livia domestica", slug: "due", gruppe: "Fugler",
    kjennetegn: "30–35 cm, grå med to mørke vingebånd, stor fargevariasjon",
    utbredelse: "Byer og tettsteder over hele landet",
    sesong: "Hele året, hekker året rundt",
    alvorlighet: "middels",
    aliaser: ["due"],
    tiltak: [
      "Fjern reirplasser og steng åpninger på loft, balkong og under takstein",
      "Ikke mat duer i nærheten av bygget",
      "Avføring er helsefarlig å tørrfeie – bruk maske og fukt flatene",
    ],
  },
  {
    norsk: "Gråspurv", latin: "Passer domesticus", slug: "spurv", gruppe: "Fugler",
    kjennetegn: "14–16 cm, hannen har grå isse og svart hakesmekke",
    utbredelse: "Hele landet",
    sesong: "Hekker april–august",
    alvorlighet: "lav",
    aliaser: ["spurv"],
    tiltak: [
      "Steng åpninger i kledning og ventiler etter hekketiden",
      "Gamle reir gir følgeangrep av pelsbiller og møll – rydd dem ut",
    ],
  },
  {
    norsk: "Gråmåke", latin: "Larus argentatus", slug: "make", gruppe: "Fugler",
    kjennetegn: "55–65 cm, hvit med lysegrå rygg, gult nebb med rød flekk, rosa bein",
    utbredelse: "Kysten og bynære strøk",
    sesong: "Hekker april–juli, mest aggressiv i juni",
    alvorlighet: "middels",
    aliaser: ["måke", "måse"],
    tiltak: [
      "Måker er fredet i hekketiden – reir kan ikke fjernes uten tillatelse",
      "Forebygg med pigger, wire eller nett på tak før hekkesesongen starter",
      "Hold avfall lukket og la være å mate",
    ],
  },
  {
    norsk: "Skjære", latin: "Pica pica", slug: "skjaere", gruppe: "Fugler",
    kjennetegn: "44–48 cm, svart og hvit med lang grønnskimrende hale",
    utbredelse: "Hele landet",
    sesong: "Hekker mars–juni",
    alvorlighet: "lav",
    tiltak: [
      "Fjern reirmateriale i pipeløp og ventiler utenom hekketiden",
      "Sett nett over ventilåpninger",
    ],
  },
  {
    norsk: "Stær", latin: "Sturnus vulgaris", slug: "staer", gruppe: "Fugler",
    kjennetegn: "20–23 cm, mørk med metallglans og lyse prikker, gult nebb om våren",
    utbredelse: "Hele landet",
    sesong: "Hekker april–juli",
    alvorlighet: "lav",
    tiltak: [
      "Hekker gjerne i vegghulrom – tett åpningen etter at ungene har flydd ut",
      "Rydd ut gammelt reirmateriale, det trekker biller og møll",
    ],
  },

  // ── Kakerlakker ──────────────────────────────────────────────────────
  {
    norsk: "Tysk kakerlakk", latin: "Blattella germanica", slug: "tysk-kakerlakk", gruppe: "Kakerlakker",
    kjennetegn: "10–15 mm, lys brun med to mørke lengdestriper bak hodet",
    utbredelse: "Hele landet, oftest i restaurantkjøkken og leilighetsbygg",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    aliaser: ["kakerlakk", "kakkerlakk"],
    forveksles: ["Brunbåndet kakerlakk – tverrbånd i stedet for lengdestriper"],
    tiltak: [
      "Ikke sprøyt selv – det sprer bestanden til nabolokaler",
      "Sett ut limfeller for å kartlegge omfanget før behandling",
      "Vask bort matsøl, tørk opp vann og tett sprekker ved kjøkkeninnredning",
      "Meld fra til huseier eller styret – kakerlakk sprer seg mellom boenheter",
    ],
  },
  {
    norsk: "Amerikansk kakerlakk", latin: "Periplaneta americana", slug: "kakerlakk", gruppe: "Kakerlakker",
    kjennetegn: "30–40 mm, rødbrun og blank, lange vinger som dekker hele bakkroppen, lys gulaktig kant rundt ryggskjoldet",
    utbredelse: "Sjelden, knyttet til varme bygg, drivhus og havner",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    forveksles: [
      "Orientalsk kakerlakk – nesten svart og matt, korte vinger",
    ],
    tiltak: [
      "Kartlegg med limfeller i varme, fuktige rom og tekniske sjakter",
      "Tett gjennomføringer mot kjeller og avløp",
      "Bruk godkjent skadedyrbekjemper – arten krever åtebehandling",
    ],
  },
  {
    norsk: "Orientalsk kakerlakk", latin: "Blatta orientalis", slug: "kakerlakk", gruppe: "Kakerlakker",
    kjennetegn: "20–25 mm, nesten svart og matt, hunnen har korte stumpvinger",
    utbredelse: "Sjelden, oftest kjellere og fyrrom",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    forveksles: [
      "Amerikansk kakerlakk – rødbrun og blank, større, med lange vinger",
    ],
    tiltak: [
      "Sjekk fuktige kjellere, sluk og rørsjakter",
      "Utbedre fuktskader – arten trives i fukt",
      "Kontakt skadedyrbekjemper for åtebehandling",
    ],
  },
  {
    norsk: "Brunbåndet kakerlakk", latin: "Supella longipalpa", slug: "kakerlakk", gruppe: "Kakerlakker",
    kjennetegn: "10–14 mm, lys brun med to lyse tverrbånd over vingene",
    utbredelse: "Sjelden, spres med møbler og elektronikk",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    forveksles: [
      "Tysk kakerlakk – to mørke lengdestriper på ryggskjoldet i stedet for lyse tverrbånd over vingene",
    ],
    tiltak: [
      "Sjekk bak elektronikk, bilderammer og høyt på veggen i varme rom",
      "Kontakt skadedyrbekjemper – arten sprer seg over hele boligen",
    ],
  },

  // ── Kre ──────────────────────────────────────────────────────────────
  {
    norsk: "Skjeggkre", latin: "Ctenolepisma longicaudata", slug: "skjeggkre", gruppe: "Kre",
    kjennetegn: "15–20 mm uten haletråder, mørkegrå og spraglete, tydelig behåring langs kroppen, svært lange haletråder",
    utbredelse: "Etablert i store deler av landet, kun innendørs",
    sesong: "Hele året, mest synlig om natten",
    alvorlighet: "middels",
    aliaser: ["skjegkre"],
    forveksles: ["Sølvkre – mindre, blankere, glattere og kortere haletråder; holder seg til fuktige rom"],
    tiltak: [
      "Sett ut limfeller i flere rom for å kartlegge omfanget før behandling",
      "Forgiftet åte plassert riktig gir best effekt – dette er en jobb for fagfolk",
      "Sjekk esker, bøker og møbler du tar inn i boligen",
      "Meld fra til forsikringsselskapet – skjeggkre dekkes ofte av boligforsikring",
    ],
  },
  {
    norsk: "Sølvkre", latin: "Lepisma saccharinum", slug: "solvkre", gruppe: "Kre",
    kjennetegn: "8–12 mm, blank sølvgrå, glatt kropp, kortere haletråder enn skjeggkre",
    utbredelse: "Hele landet, i fuktige rom",
    sesong: "Hele året",
    alvorlighet: "lav",
    aliaser: ["sølvfisk", "solvkre"],
    forveksles: ["Skjeggkre – større, mattere og med lengre haletråder; klarer seg også i tørre rom"],
    tiltak: [
      "Reduser fukten – arten trenger høy luftfuktighet for å overleve",
      "Utbedre lekkasjer og bedre ventilasjonen på bad og vaskerom",
      "Sjelden behov for profesjonell bekjempelse",
    ],
  },

  // ── Maur ─────────────────────────────────────────────────────────────
  {
    norsk: "Stokkmaur", latin: "Camponotus herculeanus", slug: "stokkmaur", gruppe: "Maur",
    kjennetegn: "6–18 mm, helt svart hode, rødbrun mellomkropp og svart bakkropp, jevnt buet rygg sett fra siden. Norges største maur. Rolig og sky – trekker seg unna når den forstyrres. Legger igjen sagflis av trefibre ved lister, vinduer og terskler",
    utbredelse: "Hele landet, vanlig i skogsnære boliger",
    sesong: "Aktiv mars–oktober, sverming i mai–juni",
    alvorlighet: "høy",
    aliaser: ["stokkemaur", "tremaur"],
    forveksles: [
      "Rød skogsmaur – tofarget hode og humpete rygg, aggressiv og sprayer maursyre, bygger tue av barnåler",
      "Brun tremaur – fremste del av bakkroppen er rødbrun, stokkmaur har helt svart bakkropp",
      "Svart tremaur – bare 4–6 mm, skinnende svart og lukter sitrus/appelsin når den knuses",
      "Svart jordmaur – liten (3–5 mm), og haugene den legger igjen er fine og melaktige, ikke sagflis av trefibre",
      "Svart jordmaur – bare 3–5 mm og gjør ikke bygningsskade",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Gnager ganger i fuktig konstruksjonsvirke og kan gi bygningsskade",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Se etter finmalt sagflis ved lister, terskler og vinduer",
      "Følg maurstien for å finne reiret – ofte i vegg eller i en stubbe utenfor",
      "Bør utbedres av skadedyrbekjemper, ofte dekket av boligforsikring",
    ],
  },
  {
    norsk: "Brun tremaur", latin: "Camponotus ligniperda", slug: "stokkmaur", gruppe: "Maur",
    kjennetegn: "6–18 mm, som stokkmaur, men fremste del av bakkroppen er rødbrun og kroppen er blankere. Rolig og sky som stokkmaur",
    utbredelse: "Sør-Norge",
    sesong: "Aktiv mars–oktober",
    alvorlighet: "høy",
    forveksles: [
      "Stokkmaur – bakkroppen er helt svart",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Samme håndtering som stokkmaur – finn reiret, ikke bare stien",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Kontroller fuktskadet virke i bunnsvill og terrasse",
    ],
  },
  {
    norsk: "Svart tremaur", latin: "Lasius fuliginosus", slug: "svart-tremaur", gruppe: "Maur",
    kjennetegn: "4–6 mm, skinnende blank svart med bredt hode som har buet bakkant (hjerteformet). Lukter tydelig sitrus/appelsin når den knuses mellom fingrene – et sikkert kjennetegn",
    utbredelse: "Hele landet, i gamle hule trær og i hulrom i vegger",
    sesong: "Aktiv vår til høst",
    alvorlighet: "middels",
    aliaser: ["sort tremaur"],
    forveksles: [
      "Svart jordmaur – matt, ikke blank, med mindre hode og uten sitrus-/appelsinlukt",
      "Stokkmaur – mye større (6–18 mm) med rødbrun mellomkropp",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Bygger reir av en papplignende masse i hulrom – let i vegger, under gulv og i gamle trær nær huset",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Følg maurstien for å finne reiret",
    ],
  },
  {
    norsk: "Svart jordmaur", latin: "Lasius niger", slug: "maur", gruppe: "Maur",
    kjennetegn: "3–5 mm, mørk brunsvart og matt. Kan også legge igjen små hauger ved lister og sprekker, men det er finere og mer melaktig enn stokkmaurens sagflis av trefibre",
    utbredelse: "Hele landet, svært vanlig i hager",
    sesong: "Aktiv april–september, sverming i juli–august",
    alvorlighet: "lav",
    aliaser: ["jordmaur", "sort jordmaur"],
    forveksles: [
      "Svart tremaur – skinnende blank (ikke matt) med bredt hjerteformet hode, og lukter sitrus/appelsin når den knuses",
      "Stokkmaur – mye større (6–18 mm) med rødbrun mellomkropp",
      "Faraomaur – bare 2 mm og blek gulbrun",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Vask bort duftsporene med såpevann der de går inn",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Tett sprekker i grunnmur og rundt vinduer",
      "Fjern matsøl og søtsaker – arten går mest på sukker",
    ],
  },
  {
    norsk: "Faraomaur", latin: "Monomorium pharaonis", slug: "faraomaur", gruppe: "Maur",
    kjennetegn: "1,5–2 mm, gulbrun og nesten gjennomskinnelig",
    utbredelse: "Sjelden, i oppvarmede bygg som sykehus og blokker",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    forveksles: [
      "Svart jordmaur – dobbelt så stor og mørk",
      "Rødmaur – større og rustrød",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Ikke sprøyt – bestanden splitter seg og sprer seg videre i bygget",
      "Bruk kun åtebehandling gjennom godkjent skadedyrbekjemper",
      "Meld fra til huseier – arten sprer seg mellom leiligheter",
    ],
  },
  {
    norsk: "Rødmaur", latin: "Myrmica rubra", slug: "maur", gruppe: "Maur",
    kjennetegn: "4–6 mm, rustrød, har brodd og kan stikke",
    utbredelse: "Hele landet, i plen og bed",
    sesong: "Aktiv mai–september",
    alvorlighet: "lav",
    forveksles: [
      "Rød skogsmaur – større og tofarget med rød forkropp og svart bakkropp",
      "Faraomaur – mye mindre og blekere",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Stikker hvis den forstyrres – vær forsiktig ved luking",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Vann og luft opp tuer i plenen, eller flytt bedet",
    ],
  },
  {
    norsk: "Rød skogsmaur", latin: "Formica rufa", slug: "maur", gruppe: "Maur",
    kjennetegn: "5–9 mm, rød mellomkropp, svart bakkropp og tofarget hode (rødt og svart), humpete rygg sett fra siden. Aggressiv – angriper og sprayer maursyre når den forstyrres. Bygger store tuer av barnåler og kvister",
    utbredelse: "Hele landet i skog",
    sesong: "Aktiv april–oktober",
    alvorlighet: "lav",
    aliaser: ["skogmaur", "rød skogmaur", "skogsmaur"],
    forveksles: [
      "Stokkmaur – helt svart hode og jevnt buet rygg, rolig og sky, og bygger ikke tue",
      "Rødmaur – mindre og ensfarget rustrød",
    ],
    notat: "Ikke bruk gift eller andre kjemikalier før du har snakket med en godkjent skadedyrbekjemper i Ocab.",
    tiltak: [
      "Arten er nyttig i skogen og bør ikke bekjempes uten grunn",
      "Maur inne skyldes som oftest fukt eller vannskade – kontroller nøye rundt bad, vinduer, terskler, bunnsvill og tak der de kommer inn",
      "Hold tuer på avstand fra bygg og fjern klatreveier",
    ],
  },

  // ── Veps og bier ─────────────────────────────────────────────────────
  {
    norsk: "Vanlig veps", latin: "Vespula vulgaris", slug: "veps", gruppe: "Veps og bier",
    kjennetegn: "12–17 mm, gul og svart, ankerformet tegning i ansiktet",
    utbredelse: "Hele landet",
    sesong: "Bol bygges mai–juni, mest plagsom august–september",
    alvorlighet: "middels",
    aliaser: ["veps"],
    forveksles: [
      "Jordveps – tre små svarte prikker i ansiktet i stedet for ankerformet tegning",
      "Honningbie – lodden og brunere, uten skarpt gult mønster",
    ],
    tiltak: [
      "Ikke slå etter dyret – det utløser angrep fra resten av bolet",
      "Bol nær inngang, lekeplass eller soverom bør fjernes",
      "Fjerning gjøres tryggest i mørket, av noen med verneutstyr",
      "Ved kjent allergi: avtal beredskap med lege før sesongen",
    ],
  },
  {
    norsk: "Jordveps", latin: "Vespula germanica", slug: "veps", gruppe: "Veps og bier",
    kjennetegn: "12–17 mm, gul og svart, tre svarte prikker i ansiktet, bygger bol i bakken",
    utbredelse: "Hele landet",
    sesong: "Mest plagsom august–september",
    alvorlighet: "middels",
    forveksles: [
      "Vanlig veps – ankerformet svart tegning i ansiktet i stedet for tre prikker",
    ],
    tiltak: [
      "Merk hullet i bakken så ingen tråkker i det",
      "Bol i plen eller ved inngang bør fjernes av fagfolk",
    ],
  },
  {
    norsk: "Treveps", latin: "Dolichovespula media", slug: "veps", gruppe: "Veps og bier",
    kjennetegn: "15–20 mm, gul og svart, bygger synlig papirbol i busk eller under takutstikk",
    utbredelse: "Sør-Norge",
    sesong: "Mai–september",
    alvorlighet: "middels",
    forveksles: [
      "Vanlig veps og jordveps – litt mindre, og bolet ligger oftest skjult i hulrom eller i bakken",
    ],
    tiltak: [
      "Hold avstand og merk området hvis bolet henger lavt",
      "Bol som ikke er i veien kan stå til frosten tar det",
    ],
  },
  {
    norsk: "Geithams", latin: "Vespa crabro", slug: "veps", gruppe: "Veps og bier",
    kjennetegn: "25–35 mm, Norges største veps, brunrød forkropp og gul bakkropp med brune tegninger, tydelig større enn vanlig veps",
    utbredelse: "Sørøstlandet",
    sesong: "Mai–oktober",
    alvorlighet: "middels",
    aliaser: ["hornet", "stor veps", "gjeithams"],
    forveksles: ["Vanlig veps – halvparten så stor og med rent gult og svart mønster"],
    tiltak: [
      "Arten er fredelig hvis den ikke forstyrres ved bolet, og er en nytteart",
      "Bol i vegg eller pipe bør fjernes av fagfolk",
      "Ikke steng flygehullet – da graver de seg inn i rommet i stedet",
    ],
  },
  {
    norsk: "Honningbie", latin: "Apis mellifera", slug: "bie", gruppe: "Veps og bier",
    kjennetegn: "12–15 mm, brungul og lodden, samler pollen i kurver på bakbeina",
    utbredelse: "Hele landet",
    sesong: "April–september, sverming i mai–juni",
    alvorlighet: "lav",
    aliaser: ["bie"],
    forveksles: [
      "Humle – større, rundere og mye mer lodden",
      "Veps – glatt og skarpt gul og svart, tydelig innsnevret midje",
    ],
    tiltak: [
      "Bier skal ikke bekjempes – kontakt lokal birøkter ved sverm",
      "En sverm på veggen flytter seg som regel videre i løpet av et døgn",
    ],
  },
  {
    norsk: "Humle", latin: "Bombus sp.", slug: "humle", gruppe: "Veps og bier",
    kjennetegn: "15–25 mm, kraftig og lodden, gule og svarte bånd, ofte hvit bakende",
    utbredelse: "Hele landet",
    sesong: "April–september",
    alvorlighet: "lav",
    forveksles: [
      "Honningbie – mindre, slankere, brunere og mindre lodden",
    ],
    tiltak: [
      "Humler er viktige pollinatorer og bør få stå i fred",
      "Bol i isolasjon dør ut av seg selv om høsten",
    ],
  },

  // ── Biller ───────────────────────────────────────────────────────────
  {
    norsk: "Husbukk", latin: "Hylotrupes bajulus", slug: "husbukk", gruppe: "Biller",
    kjennetegn: "8–25 mm, brunsvart og avlang, lange antenner, grå hårflekker på dekkvingene; ovale flygehull på 6–10 mm og fint borkaks i treverket",
    utbredelse: "Kyststrøk på Sør- og Østlandet",
    sesong: "Voksne biller svermer juni–august",
    alvorlighet: "høy",
    forveksles: [
      "Stripet borebille – bare 2,5–5 mm og lager runde hull på 1–2 mm, ikke ovale hull på 6–10 mm",
    ],
    tiltak: [
      "Larvene gnager i tørt bartrevirke og kan svekke takkonstruksjonen",
      "Se etter ovale flygehull på ca. 5 × 10 mm og gnagelyd fra loftet",
      "Få tilstanden vurdert profesjonelt – dette er en bygningsskade",
    ],
  },
  {
    norsk: "Stripet borebille", latin: "Anobium punctatum", slug: "borebille", gruppe: "Biller",
    kjennetegn: "2,5–5 mm, brun, hjelmformet forkropp som skjuler hodet, runde flygehull på 1–2 mm",
    utbredelse: "Hele landet, vanlig i eldre trehus",
    sesong: "Voksne biller mai–august",
    alvorlighet: "middels",
    aliaser: ["borebille", "treorm"],
    forveksles: ["Brødbille – lever i matvarer, ikke i treverk"],
    tiltak: [
      "Sjekk om hullene er ferske: lyst, rent boremel betyr aktivt angrep",
      "Senk luftfuktigheten – arten trives i fuktig virke",
      "Vurder utskifting av kraftig angrepet virke",
    ],
  },
  {
    norsk: "Brun pelsbille", latin: "Attagenus smirnovi", slug: "pelsbille", gruppe: "Biller",
    kjennetegn: "2,5–5 mm, ensfarget brun og avlang med mørkere hode. Larven er gyllenbrun, gulrotformet, opptil 8 mm, med en lang hårdusk bakerst",
    utbredelse: "Vanlig i byer, særlig Oslo-området",
    sesong: "Voksne biller mest synlige mai–juli",
    alvorlighet: "lav",
    aliaser: ["pelsbille", "attagenus pellio", "majorstubille"],
    forveksles: [
      "Museumsbille og tepperbille – runde og spraglete, ikke ensfarget brune",
      "Fleskeklanner – mye større, svart med lyst bånd",
    ],
    tiltak: [
      "Støvsug grundig under senger, sofaer og bak lister der støv og hår samles",
      "Larvene lever av hår, tekstilfibre og matrester i støv",
      "Sjelden behov for kjemisk behandling – renhold er hovedtiltaket",
    ],
  },
  {
    norsk: "Museumsbille", latin: "Anthrenus museorum", slug: "museumsbille", gruppe: "Biller",
    kjennetegn: "2–3 mm, rund, spraglet i brunt, gult og hvitt uten tydelige bånd. Larven er kort, bred og bust-hårete",
    utbredelse: "Hele landet",
    sesong: "Voksne biller mai–juli, ofte i vinduskarmer",
    alvorlighet: "lav",
    aliaser: ["anthrenus"],
    forveksles: [
      "Tepperbille – tre tydelige lyse bølgebånd over dekkvingene, og de to er svært vanskelige å skille på foto",
      "Brun pelsbille – ensfarget brun og mer avlang",
    ],
    tiltak: [
      "Sjekk ull, pels, utstoppede dyr og gamle insektsamlinger",
      "Støvsug og frys angrepne gjenstander i minst 72 timer",
    ],
  },
  {
    norsk: "Tepperbille", latin: "Anthrenus verbasci", slug: "tepperbille", gruppe: "Biller",
    kjennetegn: "2–3,5 mm, rund, spraglet i hvitt, gulbrunt og svart med tre lyse bølgebånd over dekkvingene. Larven er kort, bred og hårete med hårdusker bakerst",
    utbredelse: "Hele landet, vanlig i boliger",
    sesong: "Voksne biller vår og sommer, ofte i vinduskarmer; larver hele året",
    alvorlighet: "lav",
    aliaser: ["teppebille", "vanlig tepperbille"],
    forveksles: [
      "Museumsbille – mer jevnt spraglete uten tydelige bånd, og de to er svært vanskelige å skille på foto",
      "Brun pelsbille – ensfarget brun og mer avlang",
    ],
    tiltak: [
      "Det er larvene som gjør skade – let etter dem i ull, pels, tepper og under møbler og lister",
      "Støvsug grundig langs lister og i hjørner, og kast posen etterpå",
      "Frys angrepne tekstiler i minst 72 timer, eller vask på 60 °C",
      "Sjekk fuglereir og døde insekter i vinduer og på loft – de er vanlige kilder",
    ],
  },
  {
    norsk: "Fleskeklanner", latin: "Dermestes lardarius", slug: "fleskeklanner", gruppe: "Biller",
    kjennetegn: "7–9 mm, svart med et bredt lyst bånd med mørke prikker over fremre del av dekkvingene. Larven er brun og hårete, opptil 15 mm, med to små bakoverbøyde torner bakerst",
    utbredelse: "Hele landet",
    sesong: "Voksne biller vår og forsommer",
    alvorlighet: "lav",
    forveksles: [
      "Brun pelsbille – mye mindre og ensfarget brun",
    ],
    tiltak: [
      "Let etter kilden: død fugl, mus eller gammel mat i hulrom, pipeløp eller ventiler",
      "Fjern kilden – da forsvinner billene av seg selv",
      "Støvsug og vask der du finner larvehud og avføring",
    ],
  },
  {
    norsk: "Melbille", latin: "Tenebrio molitor", slug: "melbille", gruppe: "Biller",
    kjennetegn: "12–18 mm, mørk brunsvart og blank, larven er den kjente melormen",
    utbredelse: "Hele landet, i lager og bakerier",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    aliaser: ["melorm"],
    forveksles: [
      "Rødbrun rismelbille – bare 3–4 mm",
    ],
    tiltak: [
      "Gå gjennom melvarer og fuglemat – kast det som er angrepet",
      "Vask og støvsug lagerhyller, også sprekker og hjørner",
      "Kontroller om det finnes fuglereir i nærheten",
    ],
  },
  {
    norsk: "Brødbille", latin: "Stegobium paniceum", slug: "brodbille", gruppe: "Biller",
    kjennetegn: "2–3,5 mm, rødbrun, hjelmformet forkropp, tydelige lengderiller på dekkvingene",
    utbredelse: "Hele landet innendørs",
    sesong: "Hele året",
    alvorlighet: "lav",
    forveksles: [
      "Tobakksbille – glatte dekkvinger uten lengderiller og sagtakkede antenner",
      "Stripet borebille – lever i treverk, ikke i mat",
    ],
    tiltak: [
      "Gå gjennom tørrvarer, krydder, kjeks og tørrfôr til dyr",
      "Kast det som er angrepet og vask skapet, også skruehull og hjørner",
    ],
  },
  {
    norsk: "Tobakksbille", latin: "Lasioderma serricorne", slug: "tobakksbille", gruppe: "Biller",
    kjennetegn: "2–3 mm, rund og lys rødbrun, hodet bøyd inn under forkroppen, glatte dekkvinger uten lengderiller, sagtakkede antenner",
    utbredelse: "Hele landet innendørs, kommer ofte inn med varer",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    aliaser: ["lasioderma"],
    forveksles: [
      "Brødbille – tydelige lengderiller på dekkvingene",
      "Stripet borebille – lever i treverk, ikke i mat",
    ],
    tiltak: [
      "Gå gjennom krydder, te, tørrvarer og tobakk",
      "Kast angrepne varer og vask skapet grundig",
      "Oppbevar tørrvarer i tette bokser",
    ],
  },
  {
    norsk: "Rødbrun rismelbille", latin: "Tribolium castaneum", slug: "rismelbille", gruppe: "Biller",
    kjennetegn: "3–4 mm, flat, rødbrun og blank, køllefformede antenner",
    utbredelse: "Hele landet, i mel og kornvarer",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    forveksles: [
      "Sagtannet kornbille – smalere, med seks sagtenner langs hver side av forkroppen",
      "Brødbille og tobakksbille – runde, med hodet bøyd inn under forkroppen",
    ],
    tiltak: [
      "Kast angrepne melvarer og vask skapet grundig",
      "Oppbevar mel i tette bokser, ikke i papirposen",
    ],
  },
  {
    norsk: "Sagtannet kornbille", latin: "Oryzaephilus surinamensis", slug: "sagtannet-kornbille", gruppe: "Biller",
    kjennetegn: "2,5–3,5 mm, smal, flat og brun, seks sagtenner langs hver side av forkroppen",
    utbredelse: "Hele landet innendørs, kommer ofte inn med varer",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    aliaser: ["oryzaephilus"],
    forveksles: [
      "Rødbrun rismelbille – bredere og uten sagtenner på forkroppen",
      "Tobakksbille – rund med hodet bøyd inn under seg",
    ],
    tiltak: [
      "Gå gjennom tørrvarer: korn, frokostblanding, tørket frukt og nøtter",
      "Kast angrepne varer og vask skapet grundig",
      "Oppbevar tørrvarer i tette bokser",
    ],
  },
  {
    norsk: "Kornsnutebille", latin: "Sitophilus granarius", slug: "kornsnutebille", gruppe: "Biller",
    kjennetegn: "3–5 mm, mørk brun med tydelig langt snuteparti",
    utbredelse: "Hele landet, i korn og ris",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    forveksles: [
      "Andre lagerbiller – mangler den lange snuten",
    ],
    tiltak: [
      "Kast angrepet korn og ris – larvene utvikler seg inne i kornet",
      "Frys nye kornvarer i tre døgn hvis du har hatt angrep før",
    ],
  },

  // ── Møll ─────────────────────────────────────────────────────────────
  {
    norsk: "Klesmøll", latin: "Tineola bisselliella", slug: "klesmoll", gruppe: "Møll",
    kjennetegn: "6–9 mm, ensfarget glinsende gyllen-beige uten prikker, rødgul hårdusk på hodet. Larven er hvit med brunt hode, opptil 10 mm, og spinner silketråder og ganger i ull og pels",
    utbredelse: "Hele landet innendørs",
    sesong: "Hele året, mest synlig vår og sensommer",
    alvorlighet: "middels",
    aliaser: ["møll"],
    forveksles: [
      "Pelsmøll – mørke prikker på vingene, og larven bærer en sekk",
      "Matmøll – tofarget vinge, og holder til i matskapet",
    ],
    tiltak: [
      "Det er larvene som spiser ull – se etter hull og larvehus i tekstilene",
      "Vask på 60 °C eller frys plagg i minst 72 timer",
      "Støvsug garderobe, lister og bak skap grundig, og kast posen ute",
      "Oppbevar ullplagg rene og i tette poser",
    ],
  },
  {
    norsk: "Pelsmøll", latin: "Tinea pellionella", slug: "pelsmoll", gruppe: "Møll",
    kjennetegn: "6–9 mm, brungrå med tre utydelige mørke prikker på vingene. Larven bor i en flyttbar sekk av spinn og fibre som den drar med seg",
    utbredelse: "Hele landet, også utendørs i fuglereir",
    sesong: "Hele året innendørs",
    alvorlighet: "middels",
    forveksles: [
      "Klesmøll – ensfarget gyllen uten prikker, larven har ingen sekk",
    ],
    tiltak: [
      "Samme tiltak som for klesmøll: vask, frys og grundig støvsuging",
      "Sjekk fuglereir på loft og i ventiler – de er ofte kilden",
    ],
  },
  {
    norsk: "Matmøll", latin: "Plodia interpunctella", slug: "matmoll", gruppe: "Møll",
    kjennetegn: "8–10 mm lang, ytre halvdel av vingen kobberbrun, indre del lys grå. Larven er hvitaktig, opptil 12 mm, og etterlater spinn og klumper i tørrvarer",
    utbredelse: "Hele landet innendørs",
    sesong: "Hele året, raskest utvikling i varme rom",
    alvorlighet: "lav",
    aliaser: ["tørrfruktmøll", "indisk melmøll"],
    forveksles: [
      "Melmøll – større og grå med mørke sikksakklinjer, uten kobberbrun ytterdel",
      "Klesmøll – ensfarget gyllen, holder til i tekstiler",
    ],
    tiltak: [
      "Gå gjennom alle tørrvarer – se etter spinntråder i mel, nøtter og tørrfrukt",
      "Kast infisert mat og vask skapet med såpevann, også i hjørner og skruehull",
      "Oppbevar tørrvarer i tette glass eller bokser",
      "Feromonfeller viser om du fortsatt har voksne individer igjen",
    ],
  },
  {
    norsk: "Melmøll", latin: "Ephestia kuehniella", slug: "melmoll", gruppe: "Møll",
    kjennetegn: "Vingespenn 20–25 mm, grå forvinger med mørke sikksakklinjer på tvers, lyse bakvinger. Larven er hvitaktig og spinner tett spinn i mel",
    utbredelse: "Hele landet, særlig i bakerier, møller og matlagre",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    aliaser: ["middelhavsmelmøll"],
    forveksles: [
      "Matmøll – mindre, og ytre halvdel av vingen er kobberbrun",
    ],
    tiltak: [
      "Gå gjennom mel og kornvarer – se etter spinn og klumper",
      "Kast angrepne varer og vask skapet grundig, også i hjørner og skruehull",
      "Oppbevar tørrvarer i tette glass eller bokser",
      "Angrep i bakeri eller matlager bør håndteres av godkjent skadedyrbekjemper",
    ],
  },

  // ── Fluer og mygg ────────────────────────────────────────────────────
  {
    norsk: "Husflue", latin: "Musca domestica", slug: "flue", gruppe: "Fluer og mygg",
    kjennetegn: "6–8 mm, grå med fire mørke lengdestriper på ryggen. Larvene er hvite, beinløse makk",
    utbredelse: "Hele landet",
    sesong: "Mai–oktober",
    alvorlighet: "lav",
    aliaser: ["flue"],
    forveksles: [
      "Vindusflue – gyllen hårete forkropp uten tydelige striper",
      "Spyflue – større, med metallisk blå bakkropp",
    ],
    tiltak: [
      "Finn klekkestedet: avfall, kompost, gjødsel eller dødt dyr i hulrom",
      "Sett opp insektnett og hold avfallsbeholdere lukket",
      "Mange fluer i ett rom kan bety en kilde inne i konstruksjonen",
    ],
  },
  {
    norsk: "Spyflue", latin: "Calliphora vicina", slug: "flue", gruppe: "Fluer og mygg",
    kjennetegn: "10–14 mm, kraftig, metallisk blå bakkropp med sølvskjær, oransjerøde kinn. Larvene er hvite, beinløse makk",
    utbredelse: "Hele landet",
    sesong: "Mars–november",
    alvorlighet: "lav",
    aliaser: ["kjøttflue", "blåflue"],
    forveksles: [
      "Husflue – mindre og grå med striper på ryggen",
    ],
    tiltak: [
      "Let etter dødt dyr på loft, i pipeløp eller i vegghulrom",
      "Fjern kilden og luft ut – da stopper klekkingen",
    ],
  },
  {
    norsk: "Vindusflue", latin: "Pollenia rudis", slug: "vindusflue", gruppe: "Fluer og mygg",
    kjennetegn: "7–9 mm, matt mørkegrå, gyllen krøllete behåring på forkroppen, vingene ligger overlappende over bakkroppen i hvile",
    utbredelse: "Hele landet",
    sesong: "Samles i vinduskarmer om høsten og på varme vinterdager",
    alvorlighet: "lav",
    aliaser: ["klyngeflue"],
    forveksles: [
      "Husflue – fire mørke striper på ryggen og ingen gylne hår",
    ],
    tiltak: [
      "Overvintrer i hundrevis i hulrom og på loft – de gjør ingen skade",
      "Støvsug dem opp og tett sprekker rundt vinduer og takutstikk",
    ],
  },
  {
    norsk: "Bananflue", latin: "Drosophila melanogaster", slug: "bananflue", gruppe: "Fluer og mygg",
    kjennetegn: "2–4 mm, gulbrun med knallrøde øyne og mørke tverrstriper på bakkroppen",
    utbredelse: "Hele landet innendørs",
    sesong: "Flest sensommer og høst",
    alvorlighet: "lav",
    aliaser: ["fruktflue"],
    forveksles: ["Soppmygg – mørkere, slankere og kommer fra potteplanter, ikke fra frukt"],
    tiltak: [
      "Fjern moden frukt, tøm og vask avfallsbøtta og skyll pantflasker",
      "Rens sluk og vannlås – larvene lever i belegget",
    ],
  },
  {
    norsk: "Soppmygg", latin: "Sciaridae", slug: "soppmygg", gruppe: "Fluer og mygg",
    kjennetegn: "2–4 mm, svart eller mørkegrå og slank, lange bein og antenner, røykfargede vinger",
    utbredelse: "Hele landet innendørs",
    sesong: "Hele året, verst i fuktig jord om vinteren",
    alvorlighet: "lav",
    aliaser: ["sørgemygg", "planteflue"],
    forveksles: [
      "Bananflue – gulbrun med røde øyne og kompakt kropp",
      "Avløpsflue – hårete, hjerteformede vinger",
    ],
    tiltak: [
      "Larvene lever i fuktig potteplantejord – vann sjeldnere og la jorda tørke opp",
      "Gule limfeller i potten fanger de voksne",
    ],
  },
  {
    norsk: "Avløpsflue", latin: "Psychodidae", slug: "avlopsflue", gruppe: "Fluer og mygg",
    kjennetegn: "2–5 mm, grå, kropp og hjerteformede vinger dekket av hår, ligner en bitteliten møll",
    utbredelse: "Hele landet",
    sesong: "Hele året innendørs",
    alvorlighet: "lav",
    aliaser: ["sommerfuglmygg"],
    forveksles: [
      "Soppmygg – smal med glatte vinger, ikke hårete",
    ],
    tiltak: [
      "Rens sluk og vannlås mekanisk – larvene lever i slamlaget",
      "Sjekk om vannlåsen har tørket ut i lite brukte sluk",
    ],
  },

  // ── Lus, lopper og midd ──────────────────────────────────────────────
  {
    norsk: "Kattelopp", latin: "Ctenocephalides felis", slug: "loppe", gruppe: "Lus, lopper og midd",
    kjennetegn: "2–3 mm, mørk rødbrun, uten vinger, sammentrykt fra siden (smal sett ovenfra), kraftige hoppebein",
    utbredelse: "Hele landet der det er katt eller hund",
    sesong: "Hele året innendørs, flest om sommeren",
    alvorlighet: "middels",
    aliaser: ["loppe", "hundelopp"],
    forveksles: ["Veggedyr – flat ovenfra og hopper ikke"],
    tiltak: [
      "Behandle dyret hos veterinær samtidig som boligen behandles – ellers kommer de tilbake",
      "Støvsug daglig i to uker, også under møbler, og kast posen ute",
      "Vask tekstiler på 60 °C",
    ],
  },
  {
    norsk: "Hodelus", latin: "Pediculus humanus capitis", slug: "hodelus", gruppe: "Lus, lopper og midd",
    kjennetegn: "2–3 mm, grå, seks bein med klør, egg (gnitter) limt fast til hårstrå",
    utbredelse: "Hele landet",
    sesong: "Hele året, flest utbrudd ved skolestart",
    alvorlighet: "lav",
    forveksles: [
      "Kattelopp – sammentrykt fra siden og med kraftige hoppebein",
    ],
    tiltak: [
      "Kjemmes ut med lusekam på vått hår med balsam, annenhver dag i to uker",
      "Sjekk alle i husstanden samtidig, og gi beskjed til skole eller barnehage",
      "Behandlingsmidler fås på apotek – følg bruksanvisningen nøye",
    ],
  },
  {
    norsk: "Husstøvmidd", latin: "Dermatophagoides sp.", slug: "midd", gruppe: "Lus, lopper og midd",
    kjennetegn: "0,2–0,4 mm, ikke synlig for det blotte øye – kan ikke artsbestemmes fra bilde",
    utbredelse: "Hele landet, i senger og tekstiler",
    sesong: "Hele året, flest på høsten",
    alvorlighet: "lav",
    aliaser: ["midd", "støvmidd"],
    tiltak: [
      "Vask sengetøy på 60 °C annenhver uke",
      "Hold soveromstemperaturen lav og luft daglig",
      "Ved mistanke om middallergi: ta det opp med fastlegen",
    ],
  },
  {
    norsk: "Fuglemidd", latin: "Dermanyssus gallinae", slug: "fuglemidd", gruppe: "Lus, lopper og midd",
    kjennetegn: "Under 1 mm, åtte bein, grå eller hvitaktig når den er sulten og rød etter blodmåltid; ofte mange sammen",
    utbredelse: "Hele landet, der fugler hekker på eller i bygget",
    sesong: "Vår og sommer, ofte når fugleungene har forlatt reiret",
    alvorlighet: "middels",
    aliaser: ["rød hønsemidd", "hønsemidd", "blodmidd"],
    forveksles: [
      "Skogflått – større (1–5 mm) og dråpeformet",
      "Husstøvmidd – ikke synlig med det blotte øye",
    ],
    tiltak: [
      "Let etter fuglereir under takstein, i ventiler og takrenner nær stedet midden kommer inn",
      "Fjern reiret når hekkingen er over – aktive reir er fredet",
      "Støvsug grundig rundt vinduer og vegger der midden sees",
      "Midden kan bite, men lever ikke lenge på mennesker; ved mange midd bør godkjent skadedyrbekjemper kontaktes",
    ],
  },

  // ── Edderkoppdyr ─────────────────────────────────────────────────────
  {
    norsk: "Husedderkopp", latin: "Eratigena atrica", slug: "edderkopp", gruppe: "Edderkoppdyr",
    kjennetegn: "Kropp 10–18 mm, brun med mønstret bakkropp, svært lange bein",
    utbredelse: "Hele landet",
    sesong: "Mest synlig august–oktober når hannene leter etter make",
    alvorlighet: "lav",
    aliaser: ["edderkopp", "tegenaria"],
    forveksles: [
      "Vevkjerring – kroppen i ett stykke og ekstremt tynne bein",
    ],
    tiltak: [
      "Ufarlig for mennesker, og den spiser andre insekter",
      "Støvsug spinn i kjeller og bak møbler hvis du vil ha færre",
      "Tett sprekker rundt kjellervinduer",
    ],
  },
  {
    norsk: "Skogflått", latin: "Ixodes ricinus", slug: "flatt", gruppe: "Edderkoppdyr",
    kjennetegn: "1–5 mm, åtte bein, flat dråpeform, blir kulerund når den er full av blod",
    utbredelse: "Kysten fra Østfold til Helgeland, i gress og kratt",
    sesong: "Mars–november, mest aktiv mai–september",
    alvorlighet: "middels",
    aliaser: ["flått", "skogsflått"],
    forveksles: [
      "Fuglemidd – under 1 mm, mye mindre",
      "Edderkopp – kroppen er delt i to tydelige deler",
    ],
    tiltak: [
      "Fjern flåtten så raskt som mulig med pinsett – dra rett ut, ikke vri",
      "Følg med på bittstedet i fire uker: ringformet utslett bør vurderes av lege",
      "Kontakt lege ved feber, hodepine eller lammelser etter flåttbitt",
      "Klipp gresset kort og hold kratt unna lekeområder",
    ],
  },
  {
    norsk: "Vevkjerring", latin: "Opiliones", slug: "vevkjerring", gruppe: "Edderkoppdyr",
    kjennetegn: "Liten rund kropp i ett stykke og ekstremt lange tynne bein, spinner ikke nett",
    utbredelse: "Hele landet",
    sesong: "Mest synlig sensommer og høst",
    alvorlighet: "lav",
    aliaser: ["langbein"],
    forveksles: [
      "Husedderkopp – kroppen er delt i to, og beina er tykkere og hårete",
    ],
    tiltak: [
      "Helt ufarlig og uten gift – den er ingen edderkopp og gjør ingen skade",
      "Sett den ut hvis du ikke vil ha den inne",
    ],
  },

  // ── Andre småkryp ────────────────────────────────────────────────────
  {
    norsk: "Støvlus", latin: "Psocoptera", slug: "stovlus", gruppe: "Andre småkryp",
    kjennetegn: "1–2 mm, blek grå eller brun, myk kropp, stort hode med lange antenner, oftest uten vinger",
    utbredelse: "Hele landet",
    sesong: "Flest om sommeren og i nye eller fuktige bygg",
    alvorlighet: "lav",
    aliaser: ["bokelus", "bøkerens", "liposcelis"],
    forveksles: [
      "Fuglemidd – åtte bein, og blir rød etter blodmåltid",
      "Hodelus – finnes i hår, ikke i bøker, mat og fuktige rom",
    ],
    tiltak: [
      "Arten lever av muggsopp – den er et tegn på for høy luftfuktighet",
      "Luft og tørk ut rommet, og sjekk for byggfukt i nye hus",
      "Forsvinner som regel når fukten er under kontroll",
    ],
  },
  {
    norsk: "Skrukketroll", latin: "Oniscidea", slug: "skrukketroll", gruppe: "Andre småkryp",
    kjennetegn: "5–15 mm, grå og leddelt skall, sju beinpar, ruller seg ofte sammen",
    utbredelse: "Hele landet",
    sesong: "Hele året, søker inn i fuktige kjellere",
    alvorlighet: "lav",
    aliaser: ["kjellerassett", "gråsugge"],
    forveksles: [
      "Tusenbein – lang og sylindrisk med mange flere bein",
    ],
    tiltak: [
      "Arten trenger fukt for å overleve – tørker det opp, forsvinner den",
      "Mange inne kan bety en fuktskade i grunnmur eller under gulv",
    ],
  },
  {
    norsk: "Tusenbein", latin: "Julida", slug: "tusenbein", gruppe: "Andre småkryp",
    kjennetegn: "20–50 mm, sylindrisk og mørk, to beinpar per ledd, ruller seg sammen i spiral",
    utbredelse: "Hele landet",
    sesong: "Flest inne om høsten",
    alvorlighet: "lav",
    forveksles: [
      "Skrukketroll – kort og bred med bare sju beinpar",
    ],
    tiltak: [
      "Lever av dødt plantemateriale og gjør ingen skade inne",
      "Tett sprekker mot grunnmur og fjern løv inntil veggen",
    ],
  },
  {
    norsk: "Ørentvist", latin: "Forficula auricularia", slug: "orentvist", gruppe: "Andre småkryp",
    kjennetegn: "10–15 mm, brun og avlang med kraftig tang bakerst",
    utbredelse: "Hele landet",
    sesong: "Juli–oktober",
    alvorlighet: "lav",
    aliaser: ["saksedyr"],
    forveksles: [
      "Skjeggkre og sølvkre – tre lange haletråder i stedet for tang",
    ],
    tiltak: [
      "Tangen er ufarlig for mennesker, og arten spiser bladlus",
      "Rist ut blomster og grønnsaker før du tar dem inn",
    ],
  },
  {
    norsk: "Veggedyr", latin: "Cimex lectularius", slug: "veggedyr", gruppe: "Andre småkryp",
    kjennetegn: "4–6 mm, flat og oval sett ovenfra, rustbrun, blir mørk og oppsvulmet etter blodmåltid, hopper ikke",
    utbredelse: "Hele landet, oftest der mange overnatter",
    sesong: "Hele året innendørs",
    alvorlighet: "høy",
    aliaser: ["veggdyr", "sengelus", "veggelus"],
    forveksles: ["Loppe – smal sett ovenfra og hopper", "Brun pelsbille – hard billekropp med dekkvinger"],
    tiltak: [
      "Ikke flytt møbler eller tekstiler til andre rom – det sprer angrepet",
      "Se etter små svarte prikker langs sømmene i madrassen og bak sengegavlen",
      "Vask tekstiler på 60 °C eller frys dem i minst 72 timer",
      "Krever profesjonell behandling – meld fra til huseier eller hotellet",
    ],
  },

  // ── Ekskrementer ─────────────────────────────────────────────────────
  {
    norsk: "Brunrotte", latin: "Rattus norvegicus", slug: "rotte-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "12–20 mm, tykke og pølseformede med butte ender, mørkebrun, ofte i klynger på faste toalettplasser",
    utbredelse: "Hele landet, tettest i byer og langs kysten",
    sesong: "Hele året",
    alvorlighet: "høy",
    aliaser: ["rotteekskrementer", "rotteavføring"],
    forveksles: [
      "Mus – mye mindre (3–8 mm) og smalere, med spisse ender, mange og spredt",
      "Mår – større (5–10 cm), avlange og finnes gjerne på steiner eller i trær, ikke i klynger på gulvet",
    ],
    bekreftelse: [
      "Tykke og pølseformede med butte ender – musekskrementer er smale og spisse",
      "Mørkebrun, blir gråere når den tørker",
      "Finnes ofte i klynger på ett eller få faste steder, ikke spredt",
      "Ofte langs vegger, i skap, på loft eller i kjeller",
    ],
    notat: "Rotter lager faste toaletter – ekskrementer finnes derfor ofte i klynger på utvalgte steder, ikke spredt rundt i rommet.",
    tiltak: [
      "Bruk hansker og støvmaske ved opprydding – rotteekskrementer kan smitte",
      "Fukt området før rengjøring – ikke tørrfei eller støvsug direkte",
      "Rotter lager faste toaletter – let etter flere klynger, ikke bare den du så først",
      "Kontakt Ocab for kartlegging og sanering ved funn innendørs",
    ],
  },
  {
    norsk: "Mus", latin: "Mus musculus / Apodemus sp.", slug: "mus-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "3–8 mm, smale og stavformede med spisse ender, mørke; mange og spredt langs vegger og ganger, ikke samlet på faste toaletter. Skogmus har ofte synlige frørester. Ofte sterk, stikkende muselukt",
    utbredelse: "Hele landet",
    sesong: "Hele året, flest inne fra sen høst til vår",
    alvorlighet: "middels",
    aliaser: ["husmus", "skogmus", "skogsmus", "liten skogsmus", "stor skogsmus", "liten skogmus", "stor skogmus", "halsbåndmus", "musekskrementer", "museskitt", "museavføring"],
    forveksles: [
      "Brunrotte – mye større (12–20 mm) og tykkere, med butte ender, og ofte samlet i klynger på faste steder",
      "Flaggermus – samme størrelse, men smuldrer til glitrende pulver ved berøring og inneholder insektskall",
    ],
    bekreftelse: [
      "3–8 mm lange, smale, spisse i begge ender",
      "Faste og harde – smuldrer ikke ved berøring",
      "Mange og spredt langs vegger, i skuffer, skap og isolasjon",
      "Ofte stikkende muselukt der de holder til",
    ],
    notat: "Vi skiller ikke mellom husmus og skogmus på ekskrementer – tiltakene er de samme. Det viktigste er å skille mus fra rotte.",
    tiltak: [
      "Mus kommer gjennom svært små åpninger – tett rundt rør, kabler, ventiler og i grunnmur",
      "Bruk hansker og munnbind, og fukt ekskrementene før opprydding – ikke tørrfei eller støvsug direkte",
      "Sett feller langs vegger der ekskrementene ligger tettest",
      "Ved mange funn eller mus i flere rom: kontakt Ocab",
    ],
  },
  {
    norsk: "Mink", latin: "Neogale vison", slug: "mink-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "5–10 cm, avlang og ofte vridd, inneholder fiskebein, fiskeskjell, skall av krepsdyr eller pels; svært vond lukt; ligger ved vann – på steiner, brygger og i naust",
    utbredelse: "Hele landet, nesten alltid nær vann",
    sesong: "Hele året",
    alvorlighet: "middels",
    aliaser: ["neovison vison", "minkekskrementer"],
    forveksles: [
      "Mår – like store, men inneholder oftere frø og bær og finnes gjerne i trær eller på loft, ikke ved vann",
      "Røyskatt – mindre (3–6 cm) og finnes ofte i haug ved reiret",
    ],
    bekreftelse: [
      "Avlang form, ofte 5–10 cm lang",
      "Kan inneholde pels, fiskebein eller skjell",
      "Funnet ved vann, på steiner, brygger eller naust",
      "Skarp, ubehagelig lukt",
    ],
    tiltak: [
      "Fremmed art som tar fugl, egg og fisk – sikre hønsehus og fuglebur med finmasket netting",
      "Tett innganger under naust, brygge, terrasse og uthus",
      "Fangst krever kjennskap til regelverket – ta kontakt med kommunen eller Ocab",
    ],
  },
  {
    norsk: "Mår", latin: "Martes martes", slug: "mar-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "5–10 cm, avlang og vridd i endene, inneholder ofte bær, frø, insektdeler eller pels; legges synlig som markering på stein, bjelke, mønekam eller loft. Loft alene er ikke nok – mus, rotte og flaggermus finnes også der",
    utbredelse: "Hele landet i skogsområder",
    sesong: "Hele året, mest bråk på loft om vinteren",
    alvorlighet: "middels",
    aliaser: ["skogmår", "mårekskrementer"],
    forveksles: [
      "Mink – like store, men inneholder oftere fiskebein og finnes ved vann, ikke på loft",
      "Røyskatt – mindre (3–6 cm) og finnes ofte i haug ved reiret",
    ],
    bekreftelse: [
      "Avlang form, ofte 5–10 cm lang, gjerne vridd i endene",
      "Kan inneholde pels, frørester eller bærkjerner",
      "Funnet på loft, mønekam, steiner eller i trær",
      "Ofte plassert synlig, som markeringssted",
    ],
    tiltak: [
      "Mår er fredet – den skal ikke avlives uten tillatelse",
      "Steng inngangen på loftet når du er sikker på at dyret er ute",
      "Fjern klatreveier: greiner, kabler og stiger inntil huset",
    ],
  },
  {
    norsk: "Røyskatt", latin: "Mustela erminea", slug: "royskatt-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "3–6 cm, avlang, inneholder ofte pels eller bein, finnes gjerne i haug ved reiret",
    utbredelse: "Hele landet",
    sesong: "Hele året",
    alvorlighet: "lav",
    aliaser: ["hermelin", "royskattekskrementer"],
    forveksles: [
      "Mink og mår – begge tydelig større (5–10 cm)",
    ],
    bekreftelse: [
      "Avlang og tynn, 3–6 cm lang",
      "Kan inneholde pels og små beinrester fra byttedyr",
      "Ofte funnet samlet i haug nær reiret, for eksempel i steinrøys eller under uthus",
    ],
    tiltak: [
      "Arten jakter mus og gjør sjelden skade – vurder om tiltak trengs i det hele tatt",
      "Tett åpninger i grunnmur hvis den holder til under huset",
    ],
  },
  {
    norsk: "Flaggermus", latin: "Chiroptera", slug: "flaggermus-ekskrementer", gruppe: "Ekskrementer",
    kjennetegn: "3–5 mm, ligner musavføring, men smuldrer lett ved berøring og glinser av uknuste insektskall",
    utbredelse: "Hele landet",
    sesong: "Aktiv april–oktober, dvale om vinteren",
    alvorlighet: "lav",
    aliaser: ["flaggermusekskrementer", "flaggermusguano"],
    forveksles: [
      "Mus – faste og harde, smuldrer ikke, og inneholder frørester i stedet for insektskall",
    ],
    bekreftelse: [
      "3–5 mm, ligner et lite riskorn",
      "Smuldrer lett til pulver mellom fingrene (bruk hansker)",
      "Glinser av uknuste insektskall i bruddflaten",
      "Finnes ofte i hauger under en fast oppholdsplass, f.eks. på loft eller under takutstikk",
    ],
    notat: "Flaggermus-ekskrementer smuldrer lett ved berøring og inneholder insektskall. Mus-ekskrementer er faste og inneholder frørester.",
    tiltak: [
      "Alle flaggermus er fredet i Norge – de kan ikke fjernes eller avlives",
      "Utestenging kan bare gjøres utenfor yngle- og dvaletiden",
      "Bruk hansker og munnbind ved rengjøring, og luft godt – kontakt kommunen eller BatLife Norge ved usikkerhet",
    ],
  },
];

// ── Oppslag og hjelpere ──────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

/** Slår opp art på norsk navn, latinsk navn eller alias. */
export function findPest(name?: string | null): Pest | undefined {
  if (!name) return undefined;
  const n = normalize(name);
  return PESTS.find(
    (p) =>
      normalize(p.norsk) === n ||
      normalize(p.latin) === n ||
      p.aliaser?.some((a) => normalize(a) === n)
  );
}

export function pestsInGroup(gruppe: string): Pest[] {
  const g = normalize(gruppe);
  return PESTS.filter((p) => normalize(p.gruppe) === g);
}

/**
 * Slår opp art på navn, men bare innenfor én gruppe. Flere grupper kan ha
 * en art med samme norske navn (f.eks. "Brunrotte" som dyr og som
 * ekskrement-art) – da må oppslaget vite hvilken gruppe steg 2 faktisk
 * jobbet mot, ellers kan det plukke feil oppføring (feil kjennetegn/tiltak).
 */
export function findPestInGroup(name: string | undefined | null, gruppe: string): Pest | undefined {
  if (!name) return undefined;
  const n = normalize(name);
  return pestsInGroup(gruppe).find(
    (p) =>
      normalize(p.norsk) === n ||
      normalize(p.latin) === n ||
      p.aliaser?.some((a) => normalize(a) === n)
  );
}

/** Slår opp hovedgruppe på (omtrent) navn. Null hvis ikke i listen. */
export function findGroup(name?: unknown): PestGroup | null {
  if (typeof name !== "string") return null;
  const n = normalize(name);
  return GROUPS.find((g) => normalize(g) === n) ?? null;
}

/**
 * FHIs skadedyrhåndbok bruker stier som /sk/skadedyrhandboka/<kategori>/<art>/,
 * og kategorien varierer per art. Fyll inn verifiserte stier her etter hvert –
 * alt annet faller tilbake til håndbokens forside, slik at vi aldri sender
 * brukeren til en død lenke.
 */
const FHI_PATHS: Record<string, string> = {
  skjeggkre: "https://www.fhi.no/sk/skadedyrhandboka/smadyr-andre/skjeggkre/",
  stokkmaur: "https://www.fhi.no/sk/skadedyrhandboka/maur/stokkmaur/",
  "svart-tremaur": "https://www.fhi.no/sk/skadedyrhandboka/maur/svart-tremaur/",
};

const FHI_FALLBACK = "https://www.fhi.no/sk/skadedyrhandboka/";

export function fhiUrl(slug?: string): string {
  if (slug && FHI_PATHS[slug]) return FHI_PATHS[slug];
  return FHI_FALLBACK;
}

/**
 * Gruppeoversikt til steg 1 i artsbestemmelsen. Alle artene i hver gruppe
 * tas med – en art som ikke vises her (f.eks. veggedyr eller flaggermus)
 * havner lett i feil gruppe, og da kan steg 2 aldri finne den.
 * Ekskrementer er utelatt: de analyseres i et eget løp og er aldri et
 * riktig svar når brukeren har tatt bilde av et dyr.
 */
/**
 * Larver ligner ikke på det voksne dyret, og havner lett i "Andre småkryp".
 * Disse hintene sier hvilken gruppe de hører til.
 */
const GROUP_HINT: Partial<Record<PestGroup, string>> = {
  Biller: "også larver: hårete pelsbille- og tepperbillelarver, melorm",
  Møll: "også larver: hvite larver med spinn i ull eller tørrvarer, larve i sekk",
  "Fluer og mygg": "også larver: hvite, beinløse makk",
};

export const GROUP_PROMPT_LIST = GROUPS.filter((g) => g !== "Ekskrementer").map((g) => {
  const arter = pestsInGroup(g)
    .map((p) => p.norsk)
    .join(", ");
  const hint = GROUP_HINT[g] ? ` (${GROUP_HINT[g]})` : "";
  return `- ${g}: ${arter}${hint}`;
}).join("\n");

/**
 * Hva modellen skal se spesielt etter innenfor hver gruppe. Steg 2 får én av
 * disse i tillegg til artslisten, slik at et pattedyr vurderes på pels og
 * hale – ikke på antenner og vinger.
 */
export const GROUP_FOCUS: Record<PestGroup, string> = {
  Gnagere: "Vurder pelsfarge, størrelse, ører, snuteform og særlig halens lengde i forhold til kroppen.",
  "Andre pattedyr": "Vurder pelsfarge og -mønster, kroppsform, størrelse, ører og særlig halen (lengde, buskete, farge og halespiss).",
  Fugler: "Vurder størrelse, nebbform, fjærdraktens farge og atferd (sitter stille, flyr, hakker i treverk).",
  Kakerlakker: "Vurder størrelse, farge, vingedekker, antennelengde og mønster på ryggskjoldet.",
  Kre: "Vurder størrelse, skallfarge, klør, antenner og kroppsform (langstrakt vs. sammenrullet).",
  Maur: `Gå gjennom denne nøkkelen i rekkefølge:
1. Størrelse: over 6 mm → stokkmaur, brun tremaur eller rød skogsmaur. 3–6 mm → svart tremaur, svart jordmaur eller rødmaur. Rundt 2 mm og blek gul → faraomaur.
2. Store maur: helt svart hode og jevnt buet rygg → stokkmaur (svart bakkropp) eller brun tremaur (rødbrun forreste del av bakkroppen). Tofarget hode (rødt og svart) og humpete rygg → rød skogsmaur.
3. Små maur: skinnende blank svart med bredt hjerteformet hode → svart tremaur. Matt brunsvart → svart jordmaur. Ensfarget rustrød → rødmaur.
4. Spor og atferd fra brukerens tekst: sky og rolig → stokkmaur. Hissig, angriper og sprayer maursyre, tue av barnåler → rød skogsmaur. Sagflis av trefibre ved lister og vinduer → stokkmaur. Fine, melaktige hauger → svart jordmaur. Lukter sitrus eller appelsin når den knuses → svart tremaur.
Vurder også om den har vinger (sverming).`,
  "Veps og bier": "Vurder størrelse, farge og mønster (striper), behåring, midje (innsnøring) og vinger.",
  Biller: "Vurder størrelse, farge og mønster på dekkvingene, antenneform, bein og kroppsform.",
  Møll: "Vurder vingespenn, vingenes farge og mønster (flekker, bånd, prikker), og om den sitter stille med taklagte vinger.",
  "Fluer og mygg": "Vurder størrelse, farge, antall og form på vinger, øyne og kroppsform.",
  "Lus, lopper og midd": "Vurder størrelse, kroppsform (flat, smal, rund), bein og om den hopper.",
  Edderkoppdyr: "Vurder størrelse, farge, antall og lengde på bein, kroppsform og øyne.",
  "Andre småkryp": "Vurder størrelse, farge, kroppsform, antall bein og bevegelsesmønster.",
  Ekskrementer: `Gå gjennom denne nøkkelen i rekkefølge. Størrelse kommer først – sted alene avgjør aldri, fordi mus, rotte, mår og flaggermus alle kan finnes på loft.
1. Størrelse: under 1 cm → mus eller flaggermus. 1–2 cm → rotte. Over 3 cm, avlang og ofte vridd med hår eller bein → rovdyr (røyskatt, mink eller mår).
2. Under 1 cm: smuldrer til glitrende pulver med insektskall → flaggermus. Faste og harde, ofte med frørester → mus.
3. Mus eller rotte: mus er 3–8 mm, smale med spisse ender, mange og spredt langs vegger. Rotte er 12–20 mm, tykke med butte ender, og ligger ofte samlet på faste toalettsteder.
4. Rovdyr – bruk innhold, størrelse og sted sammen: tynn (3–6 cm) med fine hår og små bein, i haug ved reir eller steinrøys → røyskatt. Fiskebein, fiskeskjell eller skall av krepsdyr, svært vond lukt, ved vann → mink. Bær, frø, insektdeler og hår, lagt synlig som markering på stein, bjelke, mønekam eller annet høyt sted → mår.
Beskriv form, størrelse, farge, innhold og om de ligger spredt eller samlet.`,
};

/** Fokusinstruksjon for en gruppe – faller tilbake til en generisk tekst. */
export function focusForGroup(gruppe: PestGroup | null): string {
  if (gruppe && GROUP_FOCUS[gruppe]) return GROUP_FOCUS[gruppe];
  return "Vurder størrelse, farge, kroppsform og de kjennetegnene som skiller artene i denne gruppen.";
}

/** Artsliste for én gruppe, til steg 2. */
export function groupPromptList(gruppe: string): string {
  return pestsInGroup(gruppe)
    .map((p) => {
      const forveksling = p.forveksles?.length
        ? `\n    Forveksles med: ${p.forveksles.join("; ")}`
        : "";
      return `- ${p.norsk} (${p.latin}) – ${p.kjennetegn}${forveksling}`;
    })
    .join("\n");
}

/** Full artsliste (alle grupper) – brukes når bildeanalysen ikke er gruppefiltrert. */
export const PEST_PROMPT_LIST = PESTS.map((p) => {
  const forveksling = p.forveksles?.length
    ? `\n    Forveksles med: ${p.forveksles.join("; ")}`
    : "";
  return `- ${p.norsk} (${p.latin}) – ${p.kjennetegn}${forveksling}`;
}).join("\n");

export const PEST_COUNT = PESTS.length;