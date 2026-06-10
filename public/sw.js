const CACHE_NAME = "tx-guide-offline-v1";
const APP_SHELL_URLS = ["/", "/Wifi-setup", "/router-setup"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetchAndCacheNavigation(request));
    return;
  }

  event.respondWith(fetchAndCacheAsset(request));
});

async function fetchAndCacheNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/Wifi-setup")) ||
      (await cache.match("/")) ||
      Response.error()
    );
  }
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch("/");

  await cache.put("/", shellResponse.clone());

  const html = await shellResponse.text();
  const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
    .map((match) => match[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"))
    .filter((url) => !url.startsWith("/api/"));

  await cache.addAll(Array.from(new Set([...APP_SHELL_URLS, ...assetUrls])));
}

async function fetchAndCacheAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}
