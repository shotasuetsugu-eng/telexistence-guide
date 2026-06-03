import { useLocation } from "wouter";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        {/* Glitch 404 */}
        <div className="space-y-2">
          <p className="mono-sub">// ERROR_CODE</p>
          <h1
            className="text-8xl font-black text-foreground glitch-text neon-cyan tracking-widest"
            data-text="404"
          >
            404
          </h1>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse" />
            <div className="relative p-4 rounded-full border border-accent/30">
              <AlertTriangle className="h-8 w-8 text-accent" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground tracking-wider">
            PAGE_NOT_FOUND
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            アクセスしようとしたページは存在しないか、<br />
            移動・削除された可能性があります。
          </p>
          <p className="mono-sub glitch-flicker">// SIGNAL_LOST</p>
        </div>

        {/* Terminal-style error block */}
        <div className="text-left bg-card border border-border/50 rounded-md p-3 text-xs font-mono space-y-1">
          <p className="text-accent">&#x25B6; system.error</p>
          <p className="text-muted-foreground">  status: 404</p>
          <p className="text-muted-foreground">  message: "resource not found"</p>
          <p className="text-muted-foreground">  path: <span className="text-primary">{window.location.pathname}</span></p>
        </div>

        {/* Home button */}
        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover:bg-primary/30 transition-all duration-150"
        >
          <Home className="h-4 w-4" />
          ダッシュボードへ戻る
        </button>
      </div>
    </div>
  );
}
