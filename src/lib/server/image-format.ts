/**
 * Gjenkjenner bildeformat ut fra filens første bytes («magiske tall»),
 * uavhengig av hva avsenderen påstår om filtypen. Brukes før filen sendes
 * til sharp, slik at for eksempel SVG eller PDF aldri når bildemotoren (S3).
 */

export type Bildeformat = "jpeg" | "png" | "gif" | "webp" | "tiff" | "heif";

/** Formatene sharp får lov å lese – samme liste som den magiske sjekken. */
export const TILLATTE_SHARP_FORMATER = new Set<string>(["jpeg", "png", "gif", "webp", "tiff", "heif"]);

const HEIF_MERKER = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "avif", "avis"]);

function ascii(buf: Uint8Array, fra: number, til: number): string {
  return String.fromCharCode(...buf.subarray(fra, til));
}

export function gjenkjennBildeformat(buf: Uint8Array): Bildeformat | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && ascii(buf, 1, 4) === "PNG" && buf[4] === 0x0d && buf[5] === 0x0a) return "png";
  if (ascii(buf, 0, 6) === "GIF87a" || ascii(buf, 0, 6) === "GIF89a") return "gif";
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return "webp";
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
      (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)) return "tiff";
  if (ascii(buf, 4, 8) === "ftyp" && HEIF_MERKER.has(ascii(buf, 8, 12))) return "heif";
  return null;
}
