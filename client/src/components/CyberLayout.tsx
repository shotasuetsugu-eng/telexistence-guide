import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {BookOpen,
  CheckSquare,
  FileText,
  Search,
  Shield,
  Home,
  Menu,
  X,
  LogOut,
  HardDrive,
  Map,
  LayoutDashboard,
	  Sparkles,
	  Wifi,
	  CalendarDays,
	  ExternalLink,
  ClipboardList,
  Pencil} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import LivePageEditor, { applyLiveOverrides } from "./LivePageEditor";

type ManagedLinkKey = "updateSchedule" | "portal" | "progressSheet" | "manualDiscrepancyReport";

const managedLinkDefaults: Record<ManagedLinkKey, { label: string; url: string; icon: typeof CalendarDays }> = {
  updateSchedule: { label: "update schedule", url: "", icon: CalendarDays },
  portal: { label: "portal", url: "", icon: ExternalLink },
  progressSheet: { label: "進捗状況引継ぎシート", url: "", icon: ClipboardList },
  manualDiscrepancyReport: { label: "マニュアル相違報告", url: "", icon: FileText },
};

const publicNavItems = [
  { icon: Home, label: "ダッシュボード", path: "/" },
  { icon: CalendarDays, label: "FS Team Calendar", path: "/fs-team-calendar" },
  { icon: BookOpen, label: "Smartboarding", path: "/procedures" },
  { icon: CheckSquare, label: "チェックリスト", path: "/checklists" },
  { icon: CalendarDays, label: "update schedule", linkKey: "updateSchedule" as ManagedLinkKey },
  { icon: ExternalLink, label: "portal", linkKey: "portal" as ManagedLinkKey },
  { icon: ClipboardList, label: "進捗状況引継ぎシート", linkKey: "progressSheet" as ManagedLinkKey },
  { icon: FileText, label: "マニュアル相違報告", linkKey: "manualDiscrepancyReport" as ManagedLinkKey },
  { icon: Search, label: "検索", path: "/search" },
];

const integrationNavItems = [
    { path: "/Wifi-setup", label: "ルーター設定", icon: Wifi },
  { icon: FileText, label: "メジャメント数値", path: "/measurement-values" },
{ icon: LayoutDashboard, label: "Shift", path: "/shift" },
	  { icon: HardDrive, label: "店舗一覧", path: "/stores" },
	  { icon: Map, label: "マップ", path: "/map" },
	  { icon: LayoutDashboard, label: "Dashboard", path: "/integrations" },
  { icon: Sparkles, label: "Autail", path: "/integrations" },
];

const adminNavItems = [
  { icon: Shield, label: "管理者パネル", path: "/admin" },
];

const navNoticeStorageKey = "tx.navNotice.readSignatures";

function compactSignature(items: any[]) {
  return JSON.stringify(
    items.map((item) => ({
      id: item?.id,
      title: item?.title ?? item?.name ?? item?.storeName ?? item?.deployDate ?? "",
      updatedAt: item?.updatedAt ?? item?.updated_at ?? item?.createdAt ?? item?.created_at ?? "",
    }))
  );
}

function loadReadSignatures() {
  try {
    return JSON.parse(window.localStorage.getItem(navNoticeStorageKey) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveReadSignatures(value: Record<string, string>) {
  window.localStorage.setItem(navNoticeStorageKey, JSON.stringify(value));
}

export default function CyberLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const visualEditMode = isAdmin && new URLSearchParams(window.location.search).get("visual-edit") === "1";
  const { data: procedures = [] } = trpc.procedures.list.useQuery();
  const { data: checklists = [] } = trpc.checklists.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: documents = [] } = trpc.documents.list.useQuery();
  const { data: linkSettings = [] } = trpc.linkSettings.list.useQuery();
  const [deploySchedules, setDeploySchedules] = useState<any[]>([]);
  const [mapStores, setMapStores] = useState<any[]>([]);
  const [readSignatures, setReadSignatures] = useState<Record<string, string>>(() => loadReadSignatures());
  const [editingLinkKey, setEditingLinkKey] = useState<ManagedLinkKey | null>(null);
  const [editingLinkLabel, setEditingLinkLabel] = useState("");
  const [editingLinkUrl, setEditingLinkUrl] = useState("");
  const progressSheetMigratedRef = useRef(false);

  const saveLinkSettingsMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      setEditingLinkKey(null);
      toast.success("リンクを保存しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const managedLinks = useMemo(() => {
    const saved = new globalThis.Map(linkSettings.map((item) => [item.key, item] as const));
    return (Object.keys(managedLinkDefaults) as ManagedLinkKey[]).reduce((acc, key) => {
      const item = saved.get(key);
      acc[key] = {
        label: item?.label || managedLinkDefaults[key].label,
        url: item?.url || managedLinkDefaults[key].url,
      };
      return acc;
    }, {} as Record<ManagedLinkKey, { label: string; url: string }>);
  }, [linkSettings]);

  const appearanceStyle = useMemo(() => {
    const saved = new globalThis.Map(linkSettings.map((item) => [item.key, Number(item.url)] as const));
    const size = (key: string, fallback: number) => {
      const value = saved.get(`appearance.${key}`);
      return Number.isFinite(value) ? `${value}px` : `${fallback}px`;
    };

    return {
      "--tx-body-font-desktop": size("fontBodyDesktop", 14),
      "--tx-body-font-mobile": size("fontBodyMobile", 14),
      "--tx-page-title-desktop": size("fontPageTitleDesktop", 24),
      "--tx-page-title-mobile": size("fontPageTitleMobile", 22),
      "--tx-section-title-desktop": size("fontSectionTitleDesktop", 18),
      "--tx-section-title-mobile": size("fontSectionTitleMobile", 17),
      "--tx-nav-font-desktop": size("fontNavDesktop", 14),
      "--tx-nav-font-mobile": size("fontNavMobile", 15),
    } as React.CSSProperties;
  }, [linkSettings]);

  useEffect(() => {
    if (progressSheetMigratedRef.current) return;
    const legacyProgressSheetUrl = window.localStorage.getItem("tx.progressSheetUrl") || "";
    const currentProgressSheetUrl = normalizeUrl(managedLinks.progressSheet.url);

    if (!legacyProgressSheetUrl) {
      progressSheetMigratedRef.current = true;
      return;
    }

    if (!currentProgressSheetUrl) {
      progressSheetMigratedRef.current = true;
      saveLinkSettingsMutation.mutate([
        {
          key: "progressSheet",
          label: managedLinkDefaults.progressSheet.label,
          url: normalizeUrl(legacyProgressSheetUrl),
        },
      ]);
      return;
    }

    window.localStorage.removeItem("tx.progressSheetUrl");
    progressSheetMigratedRef.current = true;
  }, [managedLinks.progressSheet.url]);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    fetch(`/api/deploy-schedules?month=${month}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setDeploySchedules(Array.isArray(items) ? items : []))
      .catch(() => {});

    fetch("/api/map-stores", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setMapStores(Array.isArray(items) ? items : []))
      .catch(() => {});
  }, []);

  const navSignatures = useMemo(() => {
    const linkSignature = (keys: string[]) => JSON.stringify(
      linkSettings.filter((item) => keys.includes(item.key))
    );
    const dashboardSignature = JSON.stringify({
      categories: compactSignature(categories),
      procedures: compactSignature(procedures),
      checklists: compactSignature(checklists),
      documents: compactSignature(documents),
      deploySchedules: compactSignature(deploySchedules),
    });

    return {
      "/": dashboardSignature,
      "/procedures": compactSignature(procedures),
      "/checklists": compactSignature(checklists),
      "/documents": compactSignature(documents),
      "/search": JSON.stringify({ procedures: compactSignature(procedures), documents: compactSignature(documents) }),
      "/fs-team-calendar": compactSignature(deploySchedules),
      "/deploy-calendar": compactSignature(deploySchedules),
      "/map": compactSignature(mapStores),
      "/shift": linkSignature(["shiftFs", "shiftTs"]),
      "/stores": linkSignature(["storeList"]),
      "/integrations": linkSignature(["dashboardProd", "dashboardStg", "autailProd", "autailStg"]),
      "managed:updateSchedule": linkSignature(["updateSchedule"]),
      "managed:portal": linkSignature(["portal"]),
      "managed:progressSheet": linkSignature(["progressSheet"]),
      "managed:manualDiscrepancyReport": linkSignature(["manualDiscrepancyReport"]),
    };
  }, [categories, procedures, checklists, documents, deploySchedules, mapStores, linkSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => applyLiveOverrides(location, linkSettings), 0);
    return () => window.clearTimeout(timer);
  }, [location, linkSettings]);

  useEffect(() => {
    setReadSignatures((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(navSignatures).forEach(([path, signature]) => {
        if (!signature || signature === "[]") return;
        if (next[path] === undefined) {
          next[path] = signature;
          changed = true;
        }
      });

      if (changed) saveReadSignatures(next);
      return changed ? next : current;
    });
  }, [navSignatures]);

  useEffect(() => {
    const signature = navSignatures[location as keyof typeof navSignatures];
    if (!signature || signature === "[]") return;

    setReadSignatures((current) => {
      if (current[location] === signature) return current;
      const next = { ...current, [location]: signature };
      if (location === "/fs-team-calendar") next["/deploy-calendar"] = signature;
      if (location === "/deploy-calendar") next["/fs-team-calendar"] = signature;
      saveReadSignatures(next);
      return next;
    });
  }, [location, navSignatures]);

  const hasNewNotice = (path: string) => {
    const signature = navSignatures[path as keyof typeof navSignatures];
    return Boolean(signature && signature !== "[]" && readSignatures[path] !== undefined && readSignatures[path] !== signature);
  };

  const markNoticeRead = (path: string) => {
    const signature = navSignatures[path as keyof typeof navSignatures];
    if (!signature || signature === "[]") return;
    setReadSignatures((current) => {
      if (current[path] === signature) return current;
      const next = { ...current, [path]: signature };
      saveReadSignatures(next);
      return next;
    });
  };

  const normalizeUrl = (value: string) => {
    const url = value.trim();
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  const startEditingLink = (key: ManagedLinkKey) => {
    setEditingLinkKey(key);
    setEditingLinkLabel(managedLinks[key].label);
    setEditingLinkUrl(managedLinks[key].url);
  };

  const saveEditingLink = () => {
    if (!editingLinkKey) return;
    saveLinkSettingsMutation.mutate([
      {
        key: editingLinkKey,
        label: editingLinkLabel.trim() || managedLinkDefaults[editingLinkKey].label,
        url: normalizeUrl(editingLinkUrl),
      },
    ]);
  };

  const renderManagedLink = (key: ManagedLinkKey, mobile = false) => {
    const item = managedLinks[key];
    const label = item.label || managedLinkDefaults[key].label;
    const url = normalizeUrl(item.url);
    const Icon = managedLinkDefaults[key].icon;
    const baseClass = mobile
      ? "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm"
      : "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm";
    const textClass = url
      ? (mobile ? "text-foreground hover:bg-muted" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
      : (mobile ? "text-muted-foreground" : "text-muted-foreground");
    const href = url || undefined;
    const noticePath = `managed:${key}`;

    return (
      <div className="group relative">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              markNoticeRead(noticePath);
              if (mobile) setMobileMenuOpen(false);
            }}
            className={`${baseClass} ${textClass}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium flex-1 text-left">{label}</span>
            <NewBadge path={noticePath} />
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        ) : (
          <div className={`${baseClass} ${textClass}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium flex-1 text-left">{label}</span>
            <NewBadge path={noticePath} />
          </div>
        )}
        {isAdmin && !editingLinkKey && !mobile && (
          <button
            onClick={() => startEditingLink(key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-all"
            title="リンクを設定"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const NewBadge = ({ path }: { path: string }) => (
    hasNewNotice(path) ? (
      <span className="ml-auto rounded border border-amber-300/70 bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.35)]">
        New
      </span>
    ) : null
  );

  const isOfflineRouterSetup =
    !navigator.onLine && (location === "/Wifi-setup" || location === "/router-setup");

  if (authLoading && !isOfflineRouterSetup) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="mono-sub">// AUTHENTICATING...</div>
      </div>
    );
  }

  if (!user && location !== "/admin" && !isOfflineRouterSetup) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6 crt-scanlines">
        <div className="cyber-border w-full max-w-md rounded-lg bg-card p-8 text-center space-y-5">
          <h1 className="text-2xl font-black text-foreground">Telexistence Guide</h1>
          <p className="text-sm text-muted-foreground">@tx-inc.com のGoogleアカウントでログインしてください。</p>
          <button
            type="button"
            onClick={() => { window.location.href = "/app-auth"; }}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Googleでログイン
          </button>
          <button
            type="button"
            onClick={() => setLocation("/admin")}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            管理者ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-app min-h-screen bg-background crt-scanlines" style={appearanceStyle}>
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col z-40">
        {/* Logo / Title */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary neon-cyan text-xs font-bold tracking-widest">TX</span>
            <h1 className="text-base font-black text-foreground tracking-wider glitch-text" data-text="Telexistence">
              Telexistence
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-primary neon-cyan text-xs">&#91;</span>
            <span className="text-xs font-mono text-muted-foreground tracking-widest">INSTALL</span>
            <span className="text-primary neon-cyan text-xs">&#93;</span>
          </div>
          <p className="mono-sub mt-1">// installation_guide_sys</p>
        </div>

        {/* Navigation */}
        <nav className="tx-sidebar-nav flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="mono-sub px-3 py-2">NAVIGATION</p>
          {publicNavItems.map((item: any) => {
            const isActive = location === item.path;
            if (item.linkKey) {
              return (
                <div key={item.linkKey} className="relative">
                  {renderManagedLink(item.linkKey)}
                  {isAdmin && editingLinkKey === item.linkKey && (
                    <div className="px-3 py-2 space-y-2">
                      <input
                        type="text"
                        value={editingLinkLabel}
                        onChange={(e) => setEditingLinkLabel(e.target.value)}
                        placeholder="表示名"
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                      <input
                        type="url"
                        value={editingLinkUrl}
                        onChange={(e) => setEditingLinkUrl(e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditingLink}
                          className="flex-1 px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                          disabled={saveLinkSettingsMutation.isPending}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingLinkKey(null)}
                          className="flex-1 px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 neon-cyan"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
                <NewBadge path={item.path} />
              </button>
            );
          })}

          <div className="my-3 border-t border-sidebar-border" />
          <p className="mono-sub px-3 py-2">INTEGRATIONS</p>
          {integrationNavItems.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 neon-cyan"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
                <NewBadge path={item.path} />
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-sidebar-border" />
              <p className="mono-sub px-3 py-2">ADMIN</p>
              {adminNavItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-accent/20 text-accent border border-accent/30 neon-red"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer - Auth */}
        <div className="p-3 border-t border-sidebar-border">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="mono-sub truncate">{user.role === "admin" ? "ADMIN" : "USER"}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-destructive transition-colors"
                title="ログアウト"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { window.location.href = "/admin"; }}
              className="w-full px-3 py-2 text-sm rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              管理者ログイン
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar/95 backdrop-blur border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-primary neon-cyan text-xs font-bold">TX</span>
          <h1 className="text-sm font-black text-foreground tracking-wider">
            Telexistence
          </h1>
          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            <span className="text-primary">&#91;</span>INSTALL<span className="text-primary">&#93;</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded hover:bg-sidebar-accent text-foreground"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur pt-14">
          <nav className="tx-mobile-nav p-4 space-y-1">
            {publicNavItems.map((item: any) => {
              if (item.linkKey) {
                return (
                  <div key={item.linkKey} className="space-y-1">
                    {renderManagedLink(item.linkKey, true)}
                  </div>
                );
              }
              const isActive = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  <NewBadge path={item.path} />
                </button>
              );
            })}
            <div className="my-2 border-t border-border" />
            <p className="mono-sub px-4 py-1">INTEGRATIONS</p>
            {integrationNavItems.map((item) => {
              const isActive = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  <NewBadge path={item.path} />
                </button>
              );
            })}
            {isAdmin && adminNavItems.map((item) => {
              const isActive = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm ${
                    isActive ? "bg-accent/20 text-accent" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="tx-main-content p-4 lg:p-6">
          {children}
        </div>
      </main>
      {visualEditMode && <LivePageEditor pagePath={location} settings={linkSettings} />}
    </div>
  );
}

















