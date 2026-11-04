/**
 * Leser teksten ut av en PDF laget av pdf-lib med standardskrift (WinAnsi),
 * uten ekstra avhengigheter. Brukes bare i testene.
 */
import { inflateSync } from "node:zlib";
import { PDFArray, PDFDocument, PDFName, PDFRawStream, type PDFRef } from "pdf-lib";

const WINANSI_80: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰",
  0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•",
  0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

function dekodHex(hex: string): string {
  let ut = "";
  for (let i = 0; i < hex.length; i += 2) {
    const b = parseInt(hex.slice(i, i + 2), 16);
    ut += WINANSI_80[b] ?? String.fromCharCode(b);
  }
  return ut;
}

/** Tekst per side (linjene slått sammen med linjeskift). */
export async function pdfTekst(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((side) => {
    const innhold = side.node.get(PDFName.of("Contents"));
    const refs = innhold instanceof PDFArray ? innhold.asArray() : [innhold];
    let strom = "";
    for (const ref of refs) {
      const obj = doc.context.lookup(ref as PDFRef);
      if (obj instanceof PDFRawStream) {
        const data = obj.getContents();
        const filter = obj.dict.get(PDFName.of("Filter"));
        strom += Buffer.from(filter ? inflateSync(data) : data).toString("latin1");
      }
    }
    return [...strom.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)].map((m) => dekodHex(m[1])).join("\n");
  });
}
