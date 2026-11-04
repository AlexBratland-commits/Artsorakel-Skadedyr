/**
 * Ocabs offisielle logo, fra den originale PNG-filen (gjennomsiktig bakgrunn,
 * originale farger og proporsjoner – bare beskåret og skalert ned).
 *
 * - variant "merke": «Ocab» uten slagord (toppfeltet)
 * - variant "slagord": hele logoen med «Saving value, helping people» (bunnteksten)
 *
 * I mørk modus får logoen en diskret lys plate bak seg. Ocab-blått mot appens
 * mørke bakgrunn gir bare 2,65:1 i kontrast; på platen er det 7,1:1. Fargene
 * i logoen endres ikke.
 */

const VARIANTER = {
  merke: { src: "/icons/ocab-logo-merke.png", bredde: 480, hoyde: 168 },
  slagord: { src: "/icons/ocab-logo-slagord.png", bredde: 560, hoyde: 258 },
} as const;

export default function OcabLogo({
  className = "",
  height = 28,
  variant = "merke",
}: {
  className?: string;
  height?: number;
  variant?: keyof typeof VARIANTER;
}) {
  const v = VARIANTER[variant];
  const width = Math.round((height * v.bredde) / v.hoyde);
  return (
    <span
      className={`inline-flex items-center rounded-md dark:bg-white dark:px-2 dark:py-1 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v.src} alt="Ocab" width={width} height={height} style={{ width, height }} decoding="async" />
    </span>
  );
}
