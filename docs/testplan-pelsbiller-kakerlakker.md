# Manuell testplan: pelsbiller og kakerlakker med ekte AI

De automatiske testene bruker falsk AI. De kontrollerer artsbiblioteket, oppslag, råd,
chat-instrukser og PDF – **ikke** at den ekte modellen artsbestemmer riktig fra foto.
Denne planen kjøres manuelt i Vercel Preview (eller lokalt med ekte nøkkel) etter avtale,
fordi hvert bilde koster et AI-kall (typisk to kall per analyse og ett per chatspørsmål).

Bruk egne, tydelige bilder med kjent fasit (helst bestemt av fagperson). Noter for hvert
bilde: art og sikkerhetsnivå på skjermen, «Kan også være», rådene, og chatsvarene.

| # | Bilde | Forventet resultat | Chat – spør … | Forventet i chatten |
|---|---|---|---|---|
| 1 | Brun pelsbille, voksen, skarpt ovenfra | «Brun pelsbille» (*Attagenus smirnovi*). Råd om støvsuging av utviklingssted, pakking; ingen kjemiske råd | «Må jeg ringe skadedyrfirma for én bille?» | Én bille er vanlig og gir ikke grunn til bekjempelse; finn utviklingssted ved gjentatte funn. Ikke «bekreftet» |
| 2 | Pelsbille, voksen (svart med hvite flekker) | «Pelsbille» (*Attagenus pellio*), ikke brun pelsbille | «Hvorfor er den i vinduskarmen?» | Kan ha fløyet inn; se etter larver/skade; varmebehandling (tåler kulde) |
| 3 | Pelsbillelarve (brun, hårete, haledusk) | Lav eller middels sikkerhet, gjerne «Mulig …», med den andre pelsbillen som alternativ – **ikke** høy sikkerhet på art | «Hvilken art er det?» | Larver av de to er nesten like; artsbestemmelse krever voksen bille/fagperson |
| 4 | Markkakerlakk (dagtid, utendørs eller i vindu) | «Markkakerlakk» (*Ectobius lapponicus*), «Lite alvorlig», notat om at den ikke skal bekjempes | «Bør jeg bruke kakerlakkåte?» | Nei – ikke et skadedyr, kan ikke formere seg inne; fjern enkeltdyr, tett ved gjentatt innvandring |
| 5 | Tysk kakerlakk (to svarte striper på halsskjoldet) | «Tysk kakerlakk» (*Blattella germanica*), «Bør håndteres raskt», limfeller/kartlegging | «Kan jeg sprøyte selv?» | Nei – ikke sprøyt selv; kartlegg med limfeller; kontakt fagfolk; ingen gift-anbefaling |
| 6 | Uklart kakerlakkbilde (uskarpt, halsskjoldet synes ikke) | «Mulig …» eller «Kunne ikke identifisere …», med alternativer; ikke høy sikkerhet | «Er det tysk kakerlakk?» | Kan ikke avgjøres fra bildet; få arten bestemt før tiltak; ingen bekjempelsesråd forutsatt |

Kontroller i tillegg for hvert bilde:
- Samme art og nivå i historikken og i PDF-en som på skjermen.
- At «Meld fra om feil bestemmelse» viser samme nivå.
- Notér avvik med bilde, svar og tidspunkt. Ekte AI er ikke testet før denne planen er kjørt.
