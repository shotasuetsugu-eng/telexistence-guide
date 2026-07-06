import { ExternalLink, Link as LinkIcon, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

function normalizeUrl(url?: string | null) {
  const value = url?.trim();

  if (!value) return "";

  if (value.startsWith("/")) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function extractChecklistUrl(value?: string | null) {
  const text = value?.trim() ?? "";
  const match = text.match(/(https?:\/\/\S+|\/manus-storage\/\S+)/);
  return normalizeUrl(match?.[1] ?? text);
}

function isPdfUrl(url: string) {
  return /\.pdf($|[?#])/i.test(url);
}

export default function Checklists() {
  const { data: checklists = [], isLoading } = trpc.checklists.list.useQuery();

  const openLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const printLink = (url: string) => {
    if (!isPdfUrl(url)) {
      const printWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!printWindow) {
        alert("ポップアップがブロックされました。リンクを開いてから印刷してください。");
      }

      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=900");

    if (!printWindow) {
      alert("ポップアップがブロックされました。リンクを開いてから印刷してください。");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>PDF印刷</title>
          <style>
            html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; }
            body { background: #111; }
          </style>
        </head>
        <body>
          <iframe src="${url}"></iframe>
          <script>
            setTimeout(function () {
              window.focus();
              window.print();
            }, 1200);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="チェックリスト">チェックリスト</span>
        </h1>
        <p className="mono-sub">// CHECKLIST_LINKS</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-20" />
          ))}
        </div>
      ) : checklists.length > 0 ? (
        <div className="grid gap-3">
          {checklists.map((item) => {
            const url = extractChecklistUrl(item.description);

            return (
              <div
                key={item.id}
                className={`cyber-border rounded-lg p-4 bg-card transition-all ${
                  url ? "hover:bg-card/80" : "opacity-60"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => url && openLink(url)}
                    disabled={!url}
                    className="flex items-center gap-3 min-w-0 text-left group"
                  >
                    <LinkIcon className="h-5 w-5 text-cyber-green shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-cyber-green transition-colors truncate">
                        {item.title}
                      </h3>
                      {!url && (
                        <p className="text-xs text-muted-foreground mt-1">
                          リンクURLが未設定です
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!url}
                      onClick={() => url && openLink(url)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      開く
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={!url}
                      onClick={() => url && printLink(url)}
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      印刷
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">チェックリストリンクが登録されていません</p>
          <p className="mono-sub mt-2">// NO_CHECKLIST_LINKS_FOUND</p>
        </div>
      )}
    </div>
  );
}
