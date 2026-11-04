/**
 * Strukturert, personvernvennlig logging.
 *
 * Regler:
 * - Aldri bilder, brukerens fritekst, IP-adresser, cookies eller nøkler.
 * - Bare tall, korte faste verdier og artsnavn fra databasen.
 * - Én JSON-linje per hendelse, så loggene kan søkes og summeres i Vercel.
 */

type Felt = string | number | boolean | null | undefined;

export function loggHendelse(evt: string, felt: Record<string, Felt>): void {
  const ren: Record<string, Felt> = {};
  for (const [k, v] of Object.entries(felt)) {
    if (v === undefined) continue;
    ren[k] = typeof v === "string" ? v.slice(0, 120) : v;
  }
  console.log(JSON.stringify({ evt, ...ren }));
}
