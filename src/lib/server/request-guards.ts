import { NextRequest, NextResponse } from "next/server";
import { erVercel } from "./config";

/**
 * Felles vern for API-rutene: opprinnelse, klientens IP-adresse og
 * størrelse på forespørselen.
 */

/**
 * CSRF-vern: skjemaposter fra andre nettsteder utløser ikke preflight, så
 * vi sjekker Origin mot Host selv. Stopper nettlesere – ikke skript, som
 * kan utelate Origin. Er derfor ikke et vern mot misbruk i seg selv.
 */
export function sjekkOpprinnelse(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return null;
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* ugyldig Origin behandles som fremmed */
  }
  return NextResponse.json({ error: "Ugyldig opprinnelse." }, { status: 403 });
}

/**
 * Klientens IP-adresse.
 *
 * På Vercel settes x-real-ip og x-forwarded-for av plattformen selv, og en
 * verdi klienten har sendt med blir ikke brukt. Andre steder (lokal kjøring)
 * stoler vi på x-forwarded-for som før – da må en foranliggende proxy
 * overskrive headeren for at grensene skal være til å stole på.
 */
export function klientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = erVercel() ? realIp || forwarded : forwarded || realIp;
  return ip || "ukjent";
}

/** Utvider en IPv6-adresse til åtte grupper, eller null hvis ugyldig. */
function utvidIpv6(ip: string): string[] | null {
  const ren = ip.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(ren) || !ren.includes(":")) return null;
  const deler = ren.split("::");
  if (deler.length > 2) return null;
  const venstre = deler[0] ? deler[0].split(":") : [];
  const hoyre = deler.length === 2 && deler[1] ? deler[1].split(":") : [];
  // IPv4 til slutt (f.eks. ::ffff:1.2.3.4) teller som to grupper
  const siste = (hoyre.length ? hoyre : venstre).at(-1) ?? "";
  if (siste.includes(".")) {
    const oktetter = siste.split(".").map(Number);
    if (oktetter.length !== 4 || oktetter.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
    const grupper = [
      ((oktetter[0] << 8) | oktetter[1]).toString(16),
      ((oktetter[2] << 8) | oktetter[3]).toString(16),
    ];
    if (hoyre.length) hoyre.splice(-1, 1, ...grupper);
    else venstre.splice(-1, 1, ...grupper);
  }
  const mangler = 8 - venstre.length - hoyre.length;
  if (deler.length === 1 && mangler !== 0) return null;
  if (mangler < 0) return null;
  const alle = [...venstre, ...Array(mangler).fill("0"), ...hoyre];
  if (alle.length !== 8 || alle.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return alle.map((g) => g.replace(/^0+(?=.)/, ""));
}

/**
 * Nøkkel for bruksgrenser. IPv6 grupperes per /64-nett, fordi én kunde
 * eller angriper typisk har et helt /64 (milliarder av adresser) til
 * rådighet. IPv4-adresser i IPv6-form (::ffff:1.2.3.4) behandles som IPv4.
 */
export function ipNokkel(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip.trim());
  if (v4) return `v4:${v4[1]}`;
  const grupper = utvidIpv6(ip.trim());
  if (grupper) {
    if (grupper.slice(0, 6).join(":") === "0:0:0:0:0:ffff") {
      const a = parseInt(grupper[6], 16);
      const b = parseInt(grupper[7], 16);
      return `v4:${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
    }
    return `v6:${grupper.slice(0, 4).join(":")}::/64`;
  }
  return `annet:${ip.replace(/[^0-9a-zA-Z.:_-]/g, "").slice(0, 45) || "ukjent"}`;
}

/**
 * Sant hvis forespørselen oppgir en størrelse over taket. Sjekkes før
 * innholdet leses inn, så store forespørsler ikke fyller minnet.
 * (Vercel avviser i tillegg alt over 4,5 MB selv.)
 */
export function forStorForesporsel(request: NextRequest, maksBytes: number): boolean {
  const lengde = Number(request.headers.get("content-length"));
  return Number.isFinite(lengde) && lengde > maksBytes;
}

/**
 * M2 (revisjon): leser kroppen, men aldri mer enn `maksBytes`. Bytene telles
 * mens de kommer inn, så grensen gjelder også når Content-Length mangler
 * (chunked) eller er feil. Går den over, avbrytes lesingen og resten av
 * opplastingen leses ikke. Gir null ved for stor kropp.
 */
export async function lesBegrensetKropp(request: Request, maksBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array(0);
  const leser = request.body.getReader();
  const deler: Uint8Array[] = [];
  let totalt = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    totalt += value.byteLength;
    if (totalt > maksBytes) {
      await leser.cancel().catch(() => {});
      return null;
    }
    deler.push(value);
  }
  const ut = new Uint8Array(totalt);
  let pos = 0;
  for (const d of deler) {
    ut.set(d, pos);
    pos += d.byteLength;
  }
  return ut;
}

/** Feil ved begrenset lesing: for stor kropp eller ugyldig innhold. */
export type BegrensetFeil = "for_stor" | "ugyldig";

/** JSON-kropp med størrelsesgrense (M2). */
export async function lesBegrensetJson(
  request: Request,
  maksBytes: number
): Promise<{ ok: true; data: unknown } | { ok: false; feil: BegrensetFeil }> {
  const kropp = await lesBegrensetKropp(request, maksBytes);
  if (!kropp) return { ok: false, feil: "for_stor" };
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(kropp)) };
  } catch {
    return { ok: false, feil: "ugyldig" };
  }
}

/** Skjemadata (multipart) med størrelsesgrense (M2). */
export async function lesBegrensetSkjema(
  request: Request,
  maksBytes: number
): Promise<{ ok: true; data: FormData } | { ok: false; feil: BegrensetFeil }> {
  const kropp = await lesBegrensetKropp(request, maksBytes);
  if (!kropp) return { ok: false, feil: "for_stor" };
  try {
    const type = request.headers.get("content-type") ?? "";
    const data = await new Response(kropp, { headers: { "content-type": type } }).formData();
    return { ok: true, data };
  } catch {
    return { ok: false, feil: "ugyldig" };
  }
}
