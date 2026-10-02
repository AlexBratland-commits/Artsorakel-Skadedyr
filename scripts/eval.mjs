#!/usr/bin/env node
/**
 * Måler treffprosenten til /api/analyze på et testsett med kjente svar.
 *
 * Mappestruktur (mappenavnet er fasiten, og må være det norske navnet slik
 * det står i src/lib/pests.ts):
 *
 *   testbilder/
 *     dyr/
 *       Veggedyr/            bilde1.jpg, bilde2.heic, ...
 *       Brunrotte/           ...
 *     ekskrementer/
 *       Mink/                ...
 *
 * Valgfritt: legg en JSON-fil med samme navn ved siden av bildet
 * (bilde1.jpg.json) for å sende med det brukeren ville fylt inn:
 *   {"location":"kjeller","storrelse":"...","notesAnimal":"...",
 *    "droppingSize":"6-15mm","beskrivelse":"..."}
 *
 * Kjør:
 *   1. EVAL_MODE=1 npm run dev        (slår av rate limit og cache, kun i dev)
 *   2. npm run eval                   (i et annet vindu)
 *
 * Valg: --dir=testbilder  --url=http://localhost:3000  --samtidig=2
 *
 * Resultatet lagres i eval-resultater/, så du kan sammenligne før og etter
 * en endring i prompt eller modell.
 */
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);
const DIR = args.dir ?? "testbilder";
const URL_BASE = args.url ?? "http://localhost:3000";
const SAMTIDIG = Math.max(1, Number(args.samtidig ?? 2));

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

async function finnBilder() {
  const saker = [];
  for (const type of ["dyr", "ekskrementer"]) {
    const typeDir = path.join(DIR, type);
    let arter;
    try {
      arter = await fs.readdir(typeDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const art of arter.filter((d) => d.isDirectory())) {
      const artDir = path.join(typeDir, art.name);
      for (const fil of await fs.readdir(artDir)) {
        const ext = path.extname(fil).toLowerCase();
        if (!MIME[ext]) continue;
        saker.push({ type, fasit: art.name, fil: path.join(artDir, fil), mime: MIME[ext] });
      }
    }
  }
  return saker;
}

async function lesMetadata(fil) {
  try {
    return JSON.parse(await fs.readFile(`${fil}.json`, "utf8"));
  } catch {
    return {};
  }
}

async function analyser(sak) {
  const meta = await lesMetadata(sak.fil);
  const buf = await fs.readFile(sak.fil);
  const form = new FormData();
  form.append("image", new Blob([buf], { type: sak.mime }), path.basename(sak.fil));
  form.append("type", sak.type);
  form.append("location", meta.location ?? "");
  form.append("storrelse", meta.storrelse ?? "");
  if (sak.type === "ekskrementer") {
    form.append("droppingSize", meta.droppingSize ?? "");
    form.append("beskrivelse", meta.beskrivelse ?? "");
  } else {
    form.append("notesAnimal", meta.notesAnimal ?? "");
  }

  const start = Date.now();
  const res = await fetch(`${URL_BASE}/api/analyze`, { method: "POST", body: form });
  const data = await res.json().catch(() => null);
  const ms = Date.now() - start;

  if (!res.ok) return { ...sak, feil: data?.error ?? `HTTP ${res.status}`, ms };

  const svar = data.found ? data.name : "Ukjent";
  const alternativer = (data.alternativer ?? []).map((a) => a.name);
  const fasit = norm(sak.fasit);
  return {
    ...sak,
    svar,
    confidence: data.confidence,
    gruppe: data.gruppe ?? null,
    alternativer,
    treff1: norm(svar) === fasit,
    treff3: [svar, ...alternativer.slice(0, 2)].some((n) => norm(n) === fasit),
    ms,
  };
}

async function main() {
  const saker = await finnBilder();
  if (saker.length === 0) {
    console.error(`Fant ingen bilder i ${DIR}/dyr/<Art>/ eller ${DIR}/ekskrementer/<Art>/.`);
    process.exit(1);
  }
  console.log(`Analyserer ${saker.length} bilder mot ${URL_BASE} (${SAMTIDIG} om gangen) …\n`);

  const resultater = [];
  let neste = 0;
  async function arbeider() {
    while (neste < saker.length) {
      const sak = saker[neste++];
      let r;
      try {
        r = await analyser(sak);
      } catch (err) {
        r = { ...sak, feil: err instanceof Error ? err.message : String(err) };
      }
      resultater.push(r);
      const merke = r.feil ? "FEIL" : r.treff1 ? " OK " : r.treff3 ? "TOP3" : "BOM ";
      const detalj = r.feil ? r.feil : `${r.svar} (${r.confidence} %)`;
      console.log(`[${merke}] ${r.type}/${r.fasit}/${path.basename(r.fil)} → ${detalj}`);
    }
  }
  await Promise.all(Array.from({ length: SAMTIDIG }, arbeider));

  const ok = resultater.filter((r) => !r.feil);
  const pst = (n, d) => (d ? `${((100 * n) / d).toFixed(1)} %` : "–");
  const treff1 = ok.filter((r) => r.treff1).length;
  const treff3 = ok.filter((r) => r.treff3).length;
  const ukjent = ok.filter((r) => r.svar === "Ukjent" && norm(r.fasit) !== "ukjent").length;

  console.log("\n── Oppsummering ─────────────────────────────");
  console.log(`Analysert:          ${ok.length} av ${resultater.length} (${resultater.length - ok.length} feil)`);
  console.log(`Riktig hovedsvar:   ${treff1} (${pst(treff1, ok.length)})`);
  console.log(`Riktig blant topp 3: ${treff3} (${pst(treff3, ok.length)})`);
  console.log(`Svarte "Ukjent":    ${ukjent} (${pst(ukjent, ok.length)})`);

  // Per art – de svakeste først, så du ser hvor det bør jobbes.
  const perArt = new Map();
  for (const r of ok) {
    const nokkel = `${r.type}/${r.fasit}`;
    const a = perArt.get(nokkel) ?? { n: 0, treff: 0, feilSvar: {} };
    a.n += 1;
    if (r.treff1) a.treff += 1;
    else a.feilSvar[r.svar] = (a.feilSvar[r.svar] ?? 0) + 1;
    perArt.set(nokkel, a);
  }
  console.log("\n── Per art (svakest først) ──────────────────");
  [...perArt.entries()]
    .sort((x, y) => x[1].treff / x[1].n - y[1].treff / y[1].n)
    .forEach(([art, a]) => {
      const forvekslet = Object.entries(a.feilSvar)
        .sort((x, y) => y[1] - x[1])
        .map(([n, c]) => `${n} ×${c}`)
        .join(", ");
      console.log(`${pst(a.treff, a.n).padStart(7)}  ${art} (${a.treff}/${a.n})${forvekslet ? `  ← tatt for: ${forvekslet}` : ""}`);
    });

  await fs.mkdir("eval-resultater", { recursive: true });
  const ut = path.join("eval-resultater", `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(ut, JSON.stringify({ tid: new Date().toISOString(), resultater }, null, 2));
  console.log(`\nDetaljer lagret i ${ut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
