import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();
const OFFLINE_CACHE_NAME = "tx-guide-offline-v4";

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

async function cacheOfflineAppShell() {
  if (!("caches" in window) || !navigator.onLine) return;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const urls = new Set<string>(["/", "/Wifi-setup", "/router-setup"]);

  document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]").forEach((element) => {
    const assetUrl = element instanceof HTMLScriptElement ? element.src : element.href;
    const url = new URL(assetUrl, window.location.origin);

    if (url.origin === window.location.origin && !url.pathname.startsWith("/api/")) {
      urls.add(`${url.pathname}${url.search}`);
    }
  });

  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn("[OfflineCache] Failed to cache", url, error);
      }
    })
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => cacheOfflineAppShell())
      .catch((error) => {
        console.warn("[ServiceWorker] Registration failed", error);
      });
  });

  window.addEventListener("online", () => {
    void cacheOfflineAppShell();
  });
}
