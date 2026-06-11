import { useAuth } from "@/_core/hooks/useAuth";
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
import { useState } from "react";

const publicNavItems = [
  { icon: Home, label: "ダッシュボード", path: "/" },
  { icon: BookOpen, label: "Smartboarding", path: "/procedures" },
  { icon: CheckSquare, label: "チェックリスト", path: "/checklists" },
  { icon: FileText, label: "資料管理", path: "/documents" },
  { icon: Search, label: "検索", path: "/search" },
];

const integrationNavItems = [
    { path: "/Wifi-setup", label: "ルーター設定", icon: Wifi },
  { icon: FileText, label: "メジャメント数値", path: "/measurement-values" },
{ icon: LayoutDashboard, label: "Shift", path: "/shift" },
	  { icon: HardDrive, label: "店舗一覧", path: "/stores" },
	  { icon: Map, label: "マップ", path: "/map" },
	  { icon: CalendarDays, label: "Deploy Calendar", path: "/deploy-calendar" },
	  { icon: LayoutDashboard, label: "Dashboard", path: "/integrations" },
  { icon: Sparkles, label: "Autail", path: "/integrations" },
];

const adminNavItems = [
  { icon: Shield, label: "管理者パネル", path: "/admin" },
];

export default function CyberLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const [progressSheetUrl, setProgressSheetUrl] = useState<string>(
    () => window.localStorage.getItem("tx.progressSheetUrl") || ""
  );
  const [editingSheet, setEditingSheet] = useState(false);
  const [sheetInput, setSheetInput] = useState("");

  return (
    <div className="min-h-screen bg-background crt-scanlines">
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="mono-sub px-3 py-2">NAVIGATION</p>
          {publicNavItems.map((item) => {
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
              </button>
            );
          })}

          <div className="group relative">
            {progressSheetUrl ? (
              <a href={progressSheetUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <ClipboardList className="h-4 w-4 shrink-0" />
                <span className="font-medium flex-1">進捗状況引継ぎシート</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ) : (
              <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4 shrink-0" />
                <span className="font-medium flex-1">進捗状況引継ぎシート</span>
              </div>
            )}
            {isAdmin && !editingSheet && (
              <button onClick={() => { setSheetInput(progressSheetUrl); setEditingSheet(true); }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-all" title="リンクを設定">
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          {isAdmin && editingSheet && (
            <div className="px-3 py-2 space-y-2">
              <input type="url" value={sheetInput} onChange={(e) => setSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/..." className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => { window.localStorage.setItem("tx.progressSheetUrl", sheetInput); setProgressSheetUrl(sheetInput); setEditingSheet(false); }} className="flex-1 px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">保存</button>
                <button onClick={() => setEditingSheet(false)} className="flex-1 px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">キャンセル</button>
              </div>
            </div>
          )}

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
          <nav className="p-4 space-y-1">
            {publicNavItems.map((item) => {
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
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
















