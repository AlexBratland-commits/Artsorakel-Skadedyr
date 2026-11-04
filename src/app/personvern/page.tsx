import type { Metadata } from "next";
import Link from "next/link";

/*
 * UTKAST – MÅ GODKJENNES AV OCAB FØR PUBLISERING.
 * Teksten beskriver bare det koden faktisk gjør (se docs/leveranse-a.md).
 * Ocab må selv vurdere behandlingsgrunnlag, databehandleravtaler og
 * overføring til land utenfor EØS, og kontrollere navnene på leverandørene
 * hvis AI-modellene endres via OPENROUTER_VISION_MODEL / OPENROUTER_CHAT_MODEL.
 */

export const metadata: Metadata = {
  title: "Personvern",
  description: "Hvordan Artsorakel behandler bilder og tekst.",
};

export default function Personvern() {
  return (
    <main id="innhold" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-muted underline underline-offset-4">
        ← Tilbake til Artsorakel
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ocab-900 dark:text-white">
        Personvern i Artsorakel
      </h1>

      <div className="mt-6 space-y-6 text-base leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Hva skjer med bildet?</h2>
          <p className="mt-2">
            Bildet skaleres ned i nettleseren og sendes til Ocabs server. Der lages en ny kopi
            uten metadata – posisjon (GPS), kamerainformasjon og tidspunkt fjernes. Kopien sendes
            til en AI-tjeneste for analyse. Bildet lagres ikke hos Ocab.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Hvem behandler opplysningene?</h2>
          <p className="mt-2">
            Analysen gjøres via OpenRouter, som videresender forespørselen til leverandøren av
            AI-modellen (i dag Google for bildeanalyse og OpenAI for spørsmål i chatten).
            Leverandørene behandler bildet og teksten etter sine egne vilkår. Appen driftes hos
            Vercel, som kan registrere tekniske opplysninger som IP-adresse i sine driftslogger.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Hva du skriver</h2>
          <p className="mt-2">
            Sted, størrelse og beskrivelsen du skriver sendes med til AI-tjenesten sammen med
            bildet. Unngå å skrive navn, adresser eller andre personopplysninger.
          </p>
        </section>

        {/* NYTT I 2.0 – MÅ GODKJENNES AV OCAB FØR PUBLISERING */}
        <section>
          <h2 className="text-lg font-semibold">Spør Artsorakel (chat uten bilde)</h2>
          <p className="mt-2">
            Det du skriver i «Spør Artsorakel» sendes til AI-tjenesten for å lage et svar. Ocab lagrer
            ikke samtalene. Samtalen lagres bare i nettleseren din, så du kan fortsette der du slapp,
            og den slettes når du trykker «Ny samtale». Ikke skriv navn, adresse, telefonnummer eller
            andre personopplysninger i chatten.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Hva Ocab logger</h2>
          <p className="mt-2">
            For drift og kostnadskontroll logger Ocab hvilken art som ble foreslått, hvor lang tid
            analysen tok og hvor mye AI-tjenesten ble brukt. Bilder, det du skriver og
            IP-adresser lagres ikke i disse loggene. For å begrense antall forespørsler brukes en
            anonymisert verdi avledet av IP-adressen, som slettes automatisk etter høyst én time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">På din enhet</h2>
          <p className="mt-2">
            De siste analysene, med små miniatyrbilder, lagres bare i nettleseren din. Du sletter
            dem med «Tøm listen». Hvis Artsorakel krever tilgangskode, lagres en nødvendig
            informasjonskapsel som husker at enheten er logget inn. Den brukes ikke til sporing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Spørsmål</h2>
          <p className="mt-2">
            Ta kontakt med Ocab på{" "}
            <a href="mailto:post@ocab.no" className="underline underline-offset-4">
              post@ocab.no
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
