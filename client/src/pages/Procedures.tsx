import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";

function normalizeUrl(url?: string | null) {
  const value = url?.trim();

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export default function Procedures() {
  const { data: procedures = [], isLoading } = trpc.procedures.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Smartboarding">Smartboarding</span>
        </h1>
        <p className="mono-sub">// SMARTBOARDING_LINKS</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-20" />
          ))}
        </div>
      ) : procedures.length > 0 ? (
        <div className="grid gap-3">
          {procedures.map((item) => {
            const url = normalizeUrl(item.description);

            return (
              <a
                key={item.id}
                href={url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`cyber-border rounded-lg p-4 bg-card text-left transition-all group flex items-center justify-between ${
                  url ? "hover:bg-card/80" : "opacity-60 pointer-events-none"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LinkIcon className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {item.title}
                    </h3>
                    {!url && (
                      <p className="text-xs text-muted-foreground mt-1">
                        リンクURLが未設定です
                      </p>
                    )}
                  </div>
                </div>

                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </a>
            );
          })}
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Smartboardingリンクが登録されていません</p>
          <p className="mono-sub mt-2">// NO_SMARTBOARDING_LINKS_FOUND</p>
        </div>
      )}
    </div>
  );
}
