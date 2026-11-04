import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { Page } from "@playwright/test";

/** Lager et testbilde på disk (unike piksler per seed, så cachen ikke slår inn). */
export async function testbilde(seed: number): Promise<string> {
  const fil = path.join(os.tmpdir(), `artsorakel-ui-${seed}-${Date.now()}.jpg`);
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 90 + seed, g: 70, b: 50 } } })
    .jpeg()
    .toFile(fil);
  return fil;
}

/** Samler konsollfeil og CSP-brudd, så testen kan sjekke at ingenting ble blokkert. */
export function fangFeil(page: Page): string[] {
  const feil: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") feil.push(m.text());
  });
  page.on("pageerror", (e) => feil.push(e.message));
  return feil;
}

export function slettFil(fil: string) {
  fs.rmSync(fil, { force: true });
}
