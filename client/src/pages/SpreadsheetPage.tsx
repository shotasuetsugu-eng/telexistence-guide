import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

type IntegrationKey = "dashboard" | "autail" | "shiftFs" | "shiftTs" | "storeList";
type SheetKey = "shiftFs" | "shiftTs" | "storeList";

type IntegrationLink = {
  label: string;
  url: string;
};

type StorePreviewLink = {
  id: string;
  label: string;
  url: string;
};

type ViewerSettings = {
  height: number;
  zoom: number;
};

const storageKey = "tx-integrations-links";
const viewerStorageKey = "tx-spreadsheet-viewer-settings";
const storePreviewLinksStorageKey = "tx-store-preview-links";

const defaultLinks: Record<IntegrationKey, IntegrationLink> = {
  dashboard: { label: "Dashboard", url: "" },
  autail: { label: "Autail", url: "" },
  shiftFs: { label: "FS", url: "https://docs.google.com/spreadsheets/d/1P1kcKNJvlr8uA0XWxfFdpKU2RWFt8bj1RQUD6hH9Zhg/edit?gid=1323337038#gid=1323337038" },
  shiftTs: { label: "TS", url: "https://docs.google.com/spreadsheets/d/1MyrxpLeKCLu1KNdfWLTGio38mFkDhPmpVNn-hLTgSWw/edit?gid=1212632163#gid=1212632163" },
  storeList: { label: "店舗一覧", url: "https://docs.google.com/spreadsheets/d/1Y4Cw1XcLdb-EZhklHkgq8v2LO9ma8PRnqCnPNJW-aVE/edit?gid=1336532237#gid=1336532237" },
};

const defaultViewerSettings: ViewerSettings = {
  height: 900,
  zoom: 100,
};

function loadLinks(): Record<IntegrationKey, IntegrationLink> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");

    return {
      dashboard: { ...defaultLinks.dashboard, ...(saved.dashboard ?? {}) },
      autail: { ...defaultLinks.autail, ...(saved.autail ?? {}) },
      shiftFs: { ...defaultLinks.shiftFs, ...(saved.shiftFs ?? {}) },
      shiftTs: { ...defaultLinks.shiftTs, ...(saved.shiftTs ?? {}) },
      storeList: { ...defaultLinks.storeList, ...(saved.storeList ?? {}) },
    };
  } catch {
    return defaultLinks;
  }
}

function saveLinks(nextLinks: Record<IntegrationKey, IntegrationLink>) {
  window.localStorage.setItem(storageKey, JSON.stringify(nextLinks));
}

function loadViewerSettings(): ViewerSettings {
  try {
    const saved = JSON.parse(window.localStorage.getItem(viewerStorageKey) ?? "{}");

    return {
      height: Number(saved.height ?? defaultViewerSettings.height),
      zoom: Number(saved.zoom ?? defaultViewerSettings.zoom),
    };
  } catch {
    return defaultViewerSettings;
  }
}

function saveViewerSettings(nextSettings: ViewerSettings) {
  window.localStorage.setItem(viewerStorageKey, JSON.stringify(nextSettings));
}

function normalizeExternalUrl(url: string) {
  const value = url.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function loadStorePreviewLinks(): StorePreviewLink[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storePreviewLinksStorageKey) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveStorePreviewLinks(nextLinks: StorePreviewLink[]) {
  window.localStorage.setItem(storePreviewLinksStorageKey, JSON.stringify(nextLinks));
}

function toInlinePreviewUrl(url: string) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return "";

  const spreadsheetMatch = normalized.match(/\/spreadsheets\/d\/([^/]+)/);
  if (spreadsheetMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/preview`;
  }

  const documentMatch = normalized.match(/\/document\/d\/([^/]+)/);
  if (documentMatch?.[1]) {
    return `https://docs.google.com/document/d/${documentMatch[1]}/preview`;
  }

  const presentationMatch = normalized.match(/\/presentation\/d\/([^/]+)/);
  if (presentationMatch?.[1]) {
    return `https://docs.google.com/presentation/d/${presentationMatch[1]}/preview`;
  }

  return normalized;
}

function toSpreadsheetEmbedUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) return "";

  const match = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);

  if (match?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/preview`;
  }

  return trimmed;
}

export default function SpreadsheetPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const isShiftPage = window.location.pathname.includes("/shift");
  const isStorePage = !isShiftPage;
  const [activeShift, setActiveShift] = useState<"shiftFs" | "shiftTs">("shiftFs");
  const [links, setLinks] = useState<Record<IntegrationKey, IntegrationLink>>(defaultLinks);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(defaultViewerSettings);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState("");
  const [viewerKey, setViewerKey] = useState(0);
  const [storePreviewLinks, setStorePreviewLinks] = useState<StorePreviewLink[]>([]);
  const [storePreviewDraft, setStorePreviewDraft] = useState({ label: "", url: "" });
  const [selectedStorePreviewId, setSelectedStorePreviewId] = useState("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setLinks(loadLinks());
    setViewerSettings(loadViewerSettings());

    const savedStorePreviewLinks = loadStorePreviewLinks();
    setStorePreviewLinks(savedStorePreviewLinks);
    setSelectedStorePreviewId(savedStorePreviewLinks[0]?.id ?? "");
  }, []);

  const currentKey: SheetKey = isShiftPage ? activeShift : "storeList";
  const current = links[currentKey];
  const embedUrl = toSpreadsheetEmbedUrl(current.url);
  const selectedStorePreview = storePreviewLinks.find((item) => item.id === selectedStorePreviewId) ?? null;
  const selectedStorePreviewUrl = selectedStorePreview ? toInlinePreviewUrl(selectedStorePreview.url) : "";

  const zoomScale = viewerSettings.zoom / 100;
  const iframeWidth = `${100 / zoomScale}%`;
  const iframeHeight = `${viewerSettings.height / zoomScale}px`;

  const updateCurrent = (field: keyof IntegrationLink, value: string) => {
    setLinks((prev) => ({
      ...prev,
      [currentKey]: {
        ...prev[currentKey],
        [field]: value,
      },
    }));
  };

  const updateViewerSettings = (nextSettings: ViewerSettings) => {
    setViewerSettings(nextSettings);
    saveViewerSettings(nextSettings);
  };

  const handleSave = () => {
    saveLinks(links);
    setStatus("保存しました");
    setTimeout(() => setStatus(""), 2000);
  };

  const resetViewerSize = () => {
    updateViewerSettings(defaultViewerSettings);
  };

  const goBackInViewer = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      setStatus("埋め込み画面内では戻れません");
      setTimeout(() => setStatus(""), 2000);
    }
  };

  const reloadViewer = () => {
    setViewerKey((current) => current + 1);
  };

  const addStorePreviewLink = () => {
    const label = storePreviewDraft.label.trim();
    const url = normalizeExternalUrl(storePreviewDraft.url);

    if (!label || !url) {
      setStatus("リンク名とURLを入力してください");
      setTimeout(() => setStatus(""), 2000);
      return;
    }

    const item: StorePreviewLink = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      url,
    };

    const nextLinks = [...storePreviewLinks, item];
    setStorePreviewLinks(nextLinks);
    saveStorePreviewLinks(nextLinks);
    setSelectedStorePreviewId(item.id);
    setStorePreviewDraft({ label: "", url: "" });
    setStatus("店舗関連リンクを追加しました");
    setTimeout(() => setStatus(""), 2000);
  };

  const deleteStorePreviewLink = (id: string) => {
    const nextLinks = storePreviewLinks.filter((item) => item.id !== id);
    setStorePreviewLinks(nextLinks);
    saveStorePreviewLinks(nextLinks);

    if (selectedStorePreviewId === id) {
      setSelectedStorePreviewId(nextLinks[0]?.id ?? "");
    }
  };

  const sheetViewer = (
    <div
      className={
        isFullscreen
          ? "fixed inset-3 z-50 cyber-border rounded-lg bg-background p-3 shadow-2xl"
          : "cyber-border rounded-lg bg-card p-3"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">
          {current.label || (isShiftPage ? "Shift" : "店舗一覧")}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goBackInViewer}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-primary hover:border-primary/50"
          >
            戻る
          </button>

          <button
            type="button"
            onClick={reloadViewer}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-primary hover:border-primary/50"
          >
            シートに戻る
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary"
          >
            {isFullscreen ? "通常表示" : "全画面表示"}
          </button>

          <button
            type="button"
            onClick={resetViewerSize}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            サイズ初期化
          </button>
        </div>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">高さ</span>
            <span className="font-semibold text-primary">{viewerSettings.height}px</span>
          </div>
          <input
            type="range"
            min="500"
            max="1600"
            step="50"
            value={viewerSettings.height}
            onChange={(event) =>
              updateViewerSettings({
                ...viewerSettings,
                height: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">表示倍率</span>
            <span className="font-semibold text-primary">{viewerSettings.zoom}%</span>
          </div>
          <input
            type="range"
            min="75"
            max="130"
            step="5"
            value={viewerSettings.zoom}
            onChange={(event) =>
              updateViewerSettings({
                ...viewerSettings,
                zoom: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </div>
      </div>

      {embedUrl ? (
        <div
          className="w-full overflow-auto rounded-md border border-border bg-white"
          style={{
            height: isFullscreen ? "calc(100vh - 150px)" : `${viewerSettings.height}px`,
          }}
        >
          <iframe
            key={`${embedUrl}-${viewerKey}`}
            ref={iframeRef}
            src={embedUrl}
            title={current.label || "Spreadsheet"}
            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
            className="border-0 bg-white"
            style={{
              width: iframeWidth,
              height: isFullscreen ? `calc((100vh - 150px) / ${zoomScale})` : iframeHeight,
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-6 text-sm text-muted-foreground">
          スプレッドシートURLが未設定です。上の設定欄に表示名とURLを入力して保存してください。
        </div>
      )}
    </div>
  );


  const storePreviewViewer = isStorePage ? (
    <section className="cyber-border rounded-lg bg-card p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-foreground">店舗関連リンク</h2>
        <p className="text-xs text-muted-foreground">
          シート内リンクで別タブが勝手に増えないように制限しています。必要なリンクはここから選択すると、下の画面に表示されます。
        </p>
      </div>

      {isAdmin && (
        <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <input
            value={storePreviewDraft.label}
            onChange={(event) => setStorePreviewDraft((current) => ({ ...current, label: event.target.value }))}
            placeholder="表示名 例 店舗マップ"
            className="rounded bg-background border border-border px-3 py-2 text-sm"
          />
          <input
            value={storePreviewDraft.url}
            onChange={(event) => setStorePreviewDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://..."
            className="rounded bg-background border border-border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addStorePreviewLink}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            追加
          </button>
        </div>
      )}

      {storePreviewLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {storePreviewLinks.map((item) => {
            const isActive = item.id === selectedStorePreviewId;
            return (
              <div key={item.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedStorePreviewId(item.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteStorePreviewLink(item.id)}
                    className="rounded-md border border-border px-2 py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                    title="削除"
                  >
                    削除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
          店舗一覧用の関連リンクはまだ登録されていません。管理者でログインすると追加できます。
        </div>
      )}

      {selectedStorePreview && selectedStorePreviewUrl && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">{selectedStorePreview.label}</h3>
              <p className="text-xs text-muted-foreground break-all">{selectedStorePreview.url}</p>
            </div>
            <a
              href={selectedStorePreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-primary hover:border-primary/50"
            >
              表示できない場合だけ別タブで開く
            </a>
          </div>

          <div className="h-[760px] overflow-hidden rounded-md border border-border bg-white">
            <iframe
              src={selectedStorePreviewUrl}
              title={selectedStorePreview.label}
              sandbox="allow-same-origin allow-scripts allow-forms allow-downloads"
              className="h-full w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </section>
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {isShiftPage ? "Shift" : links.storeList.label || "店舗一覧"}
        </h1>
        <p className="mono-sub">// SPREADSHEET_VIEW</p>
      </div>

      {isShiftPage && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveShift("shiftFs")}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
              activeShift === "shiftFs"
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {links.shiftFs.label || "FS"}
          </button>

          <button
            type="button"
            onClick={() => setActiveShift("shiftTs")}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
              activeShift === "shiftTs"
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {links.shiftTs.label || "TS"}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="cyber-border rounded-lg bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground">
            スプレッドシート設定
          </h2>

          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground">
              表示名
            </label>
            <input
              value={current.label}
              onChange={(event) => updateCurrent("label", event.target.value)}
              placeholder={isShiftPage ? "FS / TS" : "店舗一覧"}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground">
              スプレッドシートURL
            </label>
            <input
              value={current.url}
              onChange={(event) => updateCurrent("url", event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit?usp=sharing"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              保存
            </button>

            {status && (
              <span className="text-sm text-primary">
                {status}
              </span>
            )}
          </div>
        </div>
      )}

      {sheetViewer}

      {storePreviewViewer}
    </div>
  );
}






