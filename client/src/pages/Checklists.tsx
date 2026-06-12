import { useState } from "react";
import { ExternalLink, Link as LinkIcon, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

function normalizeUrl(url?: string | null) {
  const value = url?.trim();

  if (!value) return "";

  if (value.startsWith("/")) return value;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `https://${value}`;
}

function extractChecklistUrl(value?: string | null) {
  const text = value?.trim() ?? "";
  const match = text.match(/(https?:\/\/\S+|\/manus-storage\/\S+)/);
  return normalizeUrl(match?.[1] ?? text);
}

type PdfCache = Record<string, { fileName: string; fileUrl: string }>;

export default function Checklists() {
  const { data: checklists = [], isLoading } = trpc.checklists.list.useQuery();
  const [pdfCache, setPdfCache] = useState<PdfCache>({});
  const [printingId, setPrintingId] = useState<string | null>(null);

  const openLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const printPdfUrl = (pdfUrl: string) => {
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

        setTimeout(() => iframe.remove(), 5000);
      }, 800);
    };

    document.body.appendChild(iframe);
  };

  const printChecklistPdf = async (item: any) => {
    const id = String(item.id);

    try {
      setPrintingId(id);

      let pdf = pdfCache[id];

      if (!pdf) {
        const response = await fetch(`/api/checklists/${encodeURIComponent(id)}/pdf`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "印刷用PDFが未アップロードです");
        }

        pdf = await response.json();

        setPdfCache((current) => ({
          ...current,
          [id]: pdf,
        }));
      }

      if (!pdf?.fileUrl) {
        throw new Error("印刷用PDFが未アップロードです");
      }

      printPdfUrl(pdf.fileUrl);
    } catch (error: any) {
      alert(error.message ?? "印刷用PDFを取得できませんでした");
    } finally {
      setPrintingId(null);
    }
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
          {checklists.map((item: any) => {
            const url = extractChecklistUrl(item.description);
            const cachedPdf = pdfCache[String(item.id)];
            const isPrinting = printingId === String(item.id);

            return (
              <div
                key={item.id}
                className={`cyber-border rounded-lg p-4 bg-card transition-all ${
                  url ? "hover:bg-card/80" : "opacity-80"
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

                      {cachedPdf ? (
                        <p className="text-xs text-primary mt-1">
                          印刷用PDF: {cachedPdf.fileName}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          印刷は管理者パネルでアップロードしたPDFを使用します
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
                      disabled={isPrinting}
                      onClick={() => printChecklistPdf(item)}
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      {isPrinting ? "取得中" : "印刷"}
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
