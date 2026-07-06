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

function getChecklistOpenUrl(item: any) {
  return (
    normalizeUrl(item.url) ||
    extractChecklistUrl(item.description) ||
    normalizeUrl(item.fileUrl)
  );
}

function getUploadedPdfUrl(item: any) {
  const uploadedFileUrl = normalizeUrl(item.fileUrl);

  if (uploadedFileUrl) {
    return uploadedFileUrl;
  }

  const descriptionUrl = extractChecklistUrl(item.description);
  if (descriptionUrl && isPdfUrl(descriptionUrl)) {
    return descriptionUrl;
  }

  const directUrl = normalizeUrl(item.url);
  if (directUrl && isPdfUrl(directUrl)) {
    return directUrl;
  }

  return "";
}

export default function Checklists() {
  const { data: checklists = [], isLoading } = trpc.checklists.list.useQuery();

  const openLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const printUploadedPdf = (pdfUrl: string) => {
    if (!pdfUrl) {
      alert("印刷できるアップロードPDFがありません。管理者画面からPDFをアップロードしてください。");
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = pdfUrl;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0.01";
    iframe.style.border = "0";
    iframe.style.pointerEvents = "none";

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          const opened = window.open(pdfUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            alert("ブラウザ制限で印刷画面を開けませんでした。PDFを開いてから印刷してください。");
          }
        }

        setTimeout(() => {
          iframe.remove();
        }, 5000);
      }, 800);
    };

    document.body.appendChild(iframe);
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
            const openUrl = getChecklistOpenUrl(item);
            const pdfUrl = getUploadedPdfUrl(item);
            const hasAnyUrl = !!openUrl;
            const hasPdf = !!pdfUrl;

            return (
              <div
                key={item.id}
                className={`cyber-border rounded-lg p-4 bg-card transition-all ${
                  hasAnyUrl ? "hover:bg-card/80" : "opacity-60"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => hasAnyUrl && openLink(openUrl)}
                    disabled={!hasAnyUrl}
                    className="flex items-center gap-3 min-w-0 text-left group"
                  >
                    <LinkIcon className="h-5 w-5 text-cyber-green shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-cyber-green transition-colors truncate">
                        {item.title}
                      </h3>

                      {!hasAnyUrl && (
                        <p className="text-xs text-muted-foreground mt-1">
                          リンクURLが未設定です
                        </p>
                      )}

                      {!hasPdf && (
                        <p className="text-xs text-yellow-400 mt-1">
                          印刷用PDFが未アップロードです
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!hasAnyUrl}
                      onClick={() => hasAnyUrl && openLink(openUrl)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      開く
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={!hasPdf}
                      onClick={() => printUploadedPdf(pdfUrl)}
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
