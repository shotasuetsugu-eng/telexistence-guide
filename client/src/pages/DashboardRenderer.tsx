import { trpc } from "@/lib/trpc";
import Home from "@/pages/Home";
import { useMemo } from "react";
import { useLocation } from "wouter";

const LEGACY_PUBLISHED_KEY = "siteBuilder.dashboard.published";
const SITE_PUBLISHED_KEY = "siteBuilder.pages.published";

type PublishedPage = {
  id: string;
  title: string;
  path: string;
  html: string;
  css: string;
};

type PublishedNavItem = {
  id: string;
  title: string;
  type: "page" | "url";
  pageId?: string;
  url?: string;
  enabled: boolean;
};

type PublishedSite = {
  pages: PublishedPage[];
  navItems?: PublishedNavItem[];
};

function normalizeUrl(value = "") {
  const url = value.trim();
  if (!url) return "#";
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function navHref(item: PublishedNavItem, pages: PublishedPage[]) {
  if (item.type === "url") return normalizeUrl(item.url);
  const page = pages.find((entry) => entry.id === item.pageId);
  return page?.path || "/";
}

export default function DashboardRenderer() {
  const [location] = useLocation();
  const { data: settings = [], isLoading } = trpc.linkSettings.list.useQuery();

  const saved = useMemo(() => new Map(settings.map((item) => [item.key, item.url] as const)), [settings]);
  const site = useMemo(() => {
    const raw = saved.get(SITE_PUBLISHED_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as PublishedSite;
      if (!Array.isArray(data.pages) || data.pages.length === 0) return null;
      return data;
    } catch {
      return null;
    }
  }, [saved]);

  const legacy = useMemo(() => {
    const raw = saved.get(LEGACY_PUBLISHED_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as { html?: string; css?: string };
    } catch {
      return null;
    }
  }, [saved]);

  if (isLoading) return <Home />;

  if (site) {
    const pages = site.pages;
    const currentPath = location === "" ? "/" : location;
    const page = pages.find((entry) => entry.path === currentPath) || pages.find((entry) => entry.path === "/") || pages[0];
    const navItems = (site.navItems || [])
      .filter((item) => item.enabled)
      .filter((item) => item.type === "url" || pages.some((pageItem) => pageItem.id === item.pageId));

    return (
      <div className="min-h-screen bg-[#050807] text-white">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050807]/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <a href="/" className="text-sm font-black tracking-[0.18em] text-[#00e5c8] no-underline">
              TX SITE
            </a>
            <nav className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={navHref(item, pages)}
                  className={`rounded-full px-3 py-2 text-sm font-bold no-underline transition ${
                    navHref(item, pages) === page.path
                      ? "bg-[#00e5c8] text-[#001b18]"
                      : "text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                  target={item.type === "url" && normalizeUrl(item.url).startsWith("http") ? "_blank" : undefined}
                  rel={item.type === "url" && normalizeUrl(item.url).startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="public-site-page">
          <style>{page.css || ""}</style>
          <div dangerouslySetInnerHTML={{ __html: page.html || "" }} />
        </main>
      </div>
    );
  }

  if (legacy?.html) {
    return (
      <div className="visual-dashboard">
        <style>{legacy.css || ""}</style>
        <div dangerouslySetInnerHTML={{ __html: legacy.html }} />
      </div>
    );
  }

  return <Home />;
}
