import { useEffect, useState } from "react";
import {
  ExternalLink,
  LayoutDashboard,
  Link as LinkIcon,
  Save,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

type IntegrationKey =
  | "shiftFs"
  | "shiftTs"
  | "storeList"
  | "dashboardProd"
  | "dashboardStg"
  | "autailProd"
  | "autailStg";

type IntegrationLink = {
  label: string;
  url: string;
};

type IntegrationLinks = Record<IntegrationKey, IntegrationLink>;

const storageKey = "tx-integrations-links";

const defaultLinks: IntegrationLinks = {
  shiftFs: { label: "FS", url: "https://docs.google.com/spreadsheets/d/1P1kcKNJvlr8uA0XWxfFdpKU2RWFt8bj1RQUD6hH9Zhg/edit?gid=1323337038#gid=1323337038" },
  shiftTs: { label: "TS", url: "https://docs.google.com/spreadsheets/d/1MyrxpLeKCLu1KNdfWLTGio38mFkDhPmpVNn-hLTgSWw/edit?gid=1212632163#gid=1212632163" },
  storeList: { label: "店舗一覧", url: "https://docs.google.com/spreadsheets/d/1Y4Cw1XcLdb-EZhklHkgq8v2LO9ma8PRnqCnPNJW-aVE/edit?gid=1336532237#gid=1336532237" },

  dashboardProd: { label: "PROD", url: "https://portal.telexistence.org/stores" },
  dashboardStg: { label: "STG", url: "https://stg.portal.telexistence.org/stores" },

  autailProd: { label: "PROD", url: "https://retail.telexistence.org/deployment" },
  autailStg: { label: "STG", url: "https://retail.stg.telexistence.org/deployment" },
};

function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function loadLinks(): IntegrationLinks {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");

    return {
      shiftFs: { ...defaultLinks.shiftFs, ...(saved.shiftFs ?? {}) },
      shiftTs: { ...defaultLinks.shiftTs, ...(saved.shiftTs ?? {}) },
      storeList: { ...defaultLinks.storeList, ...(saved.storeList ?? {}) },

      dashboardProd: {
        ...defaultLinks.dashboardProd,
        ...(saved.dashboardProd ?? saved.dashboard ?? {}),
      },
      dashboardStg: {
        ...defaultLinks.dashboardStg,
        ...(saved.dashboardStg ?? {}),
      },

      autailProd: {
        ...defaultLinks.autailProd,
        ...(saved.autailProd ?? saved.autail ?? {}),
      },
      autailStg: {
        ...defaultLinks.autailStg,
        ...(saved.autailStg ?? {}),
      },
    };
  } catch {
    return defaultLinks;
  }
}

function openUrl(url: string) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Integrations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [links, setLinks] = useState<IntegrationLinks>(defaultLinks);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLinks(loadLinks());
  }, []);

  const updateLink = (key: IntegrationKey, field: keyof IntegrationLink, value: string) => {
    setLinks((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const save = () => {
    const nextLinks: IntegrationLinks = {
      ...links,
      dashboardProd: {
        ...links.dashboardProd,
        url: normalizeUrl(links.dashboardProd.url),
      },
      dashboardStg: {
        ...links.dashboardStg,
        url: normalizeUrl(links.dashboardStg.url),
      },
      autailProd: {
        ...links.autailProd,
        url: normalizeUrl(links.autailProd.url),
      },
      autailStg: {
        ...links.autailStg,
        url: normalizeUrl(links.autailStg.url),
      },
    };

    setLinks(nextLinks);
    window.localStorage.setItem(storageKey, JSON.stringify(nextLinks));
    setStatus("保存しました");
    setTimeout(() => setStatus(""), 2000);
  };

  const renderUserButtons = (
    prodKey: IntegrationKey,
    stgKey: IntegrationKey,
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => openUrl(links[prodKey].url)}
        disabled={!links[prodKey].url}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ExternalLink className="h-4 w-4" />
        {links[prodKey].label || "PROD"}
      </button>

      <button
        type="button"
        onClick={() => openUrl(links[stgKey].url)}
        disabled={!links[stgKey].url}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ExternalLink className="h-4 w-4" />
        {links[stgKey].label || "STG"}
      </button>
    </div>
  );

  const renderAdminSetting = (
    title: string,
    Icon: typeof LayoutDashboard,
    prodKey: IntegrationKey,
    stgKey: IntegrationKey,
  ) => (
    <div className="rounded-lg border border-border bg-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[120px_220px_1fr_auto]">
          <div className="flex items-center text-sm font-semibold text-primary">
            PROD
          </div>

          <input
            value={links[prodKey].label}
            onChange={(event) => updateLink(prodKey, "label", event.target.value)}
            placeholder="表示名"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
          />

          <input
            value={links[prodKey].url}
            onChange={(event) => updateLink(prodKey, "url", event.target.value)}
            placeholder="PROD URL"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={() => openUrl(links[prodKey].url)}
            disabled={!links[prodKey].url}
            className="inline-flex items-center justify-center gap-2 rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:text-primary disabled:opacity-40"
          >
            <ExternalLink className="h-4 w-4" />
            開く
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[120px_220px_1fr_auto]">
          <div className="flex items-center text-sm font-semibold text-primary">
            STG
          </div>

          <input
            value={links[stgKey].label}
            onChange={(event) => updateLink(stgKey, "label", event.target.value)}
            placeholder="表示名"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
          />

          <input
            value={links[stgKey].url}
            onChange={(event) => updateLink(stgKey, "url", event.target.value)}
            placeholder="STG URL"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={() => openUrl(links[stgKey].url)}
            disabled={!links[stgKey].url}
            className="inline-flex items-center justify-center gap-2 rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:text-primary disabled:opacity-40"
          >
            <ExternalLink className="h-4 w-4" />
            開く
          </button>
        </div>
      </div>
    </div>
  );

  const renderUserSection = (
    title: string,
    Icon: typeof LayoutDashboard,
    prodKey: IntegrationKey,
    stgKey: IntegrationKey,
  ) => (
    <div className="rounded-lg border border-border bg-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {renderUserButtons(prodKey, stgKey)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Integrations">Integrations</span>
        </h1>
        <p className="mono-sub">
          {isAdmin ? "// PROD_STG_LINK_SETTINGS" : "// PROD_STG_LINKS"}
        </p>
      </div>

      <div className="cyber-border rounded-lg bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">
            {isAdmin ? "外部リンク設定" : "外部リンク"}
          </h2>
        </div>

        {isAdmin ? (
          <div className="grid gap-4">
            {renderAdminSetting(
              "Dashboard",
              LayoutDashboard,
              "dashboardProd",
              "dashboardStg",
            )}

            {renderAdminSetting(
              "Autail",
              Sparkles,
              "autailProd",
              "autailStg",
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                保存
              </button>

              {status && (
                <span className="text-sm text-primary">
                  {status}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {renderUserSection(
              "Dashboard",
              LayoutDashboard,
              "dashboardProd",
              "dashboardStg",
            )}

            {renderUserSection(
              "Autail",
              Sparkles,
              "autailProd",
              "autailStg",
            )}
          </div>
        )}
      </div>
    </div>
  );
}

