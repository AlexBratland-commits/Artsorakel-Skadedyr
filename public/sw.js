// Minimal service worker: gjør appen installerbar og gir en enkel offline-side.
// Ingen caching av API-svar – artsbestemmelse skal alltid gå mot serveren.
// v2: lagrer bare vellykkede svar fra egen side, og holder lageret lite (F11).
const CACHE = "ocab-artsbestemmer-v2";
const SHELL = ["/", "/manifest.webmanifest"];
const MAKS_FILER = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function lagre(request, response) {
  const c = await caches.open(CACHE);
  await c.put(request, response);
  // Fjern de eldste filene (utenom app-skallet) når lageret blir for stort.
  const nokler = await c.keys();
  const overflodige = nokler.filter((r) => !SHELL.includes(new URL(r.url).pathname));
  for (const r of overflodige.slice(0, Math.max(0, nokler.length - MAKS_FILER))) await c.delete(r);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          lagre(request, response.clone()).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
  );
});
