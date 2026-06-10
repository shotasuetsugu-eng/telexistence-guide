const CACHE_NAME = "tx-guide-offline-v3";
const APP_SHELL_URLS = ["/", "/Wifi-setup", "/router-setup"];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().finally(() => self.skipWaiting()));
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
    if (response.ok) {
      await cache.put(request, response.clone());
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      (await cache.match("/Wifi-setup")) ||
      (await matchAnyCachedNavigation()) ||
      offlineFallback()
    );
  }
}

async function matchAnyCachedNavigation() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const navigationKey = keys.find((request) => request.mode === "navigate" || request.headers.get("accept")?.includes("text/html"));

  return navigationKey ? cache.match(navigationKey) : undefined;
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch("/", { cache: "no-store" });

  if (shellResponse.ok) {
    await cache.put("/", shellResponse.clone());
  }

  const html = await shellResponse.text();
  const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
    .map((match) => match[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"))
    .filter((url) => !url.startsWith("/api/"));

  const urls = Array.from(new Set([...APP_SHELL_URLS, ...assetUrls]));

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) await cache.put(url, response);
      } catch {
        // Keep installing even if one asset is temporarily unavailable.
      }
    })
  );
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

function offlineFallback() {
  return new Response(
    `<!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>オフライン</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050807; color: #e7fff9; font-family: system-ui, sans-serif; }
          main { max-width: 520px; padding: 24px; border: 1px solid #12e6c8; border-radius: 8px; background: rgba(18, 230, 200, 0.08); }
          h1 { margin: 0 0 12px; font-size: 22px; }
          p { line-height: 1.7; color: #a8b8b4; }
        </style>
      </head>
      <body>
        <main>
          <h1>オフラインです</h1>
          <p>この端末では、まだオフライン表示用のページが保存されていません。一度オンラインで https://telexistence-guide-v3.onrender.com/ を開いてから、再度オフラインでお試しください。</p>
        </main>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
