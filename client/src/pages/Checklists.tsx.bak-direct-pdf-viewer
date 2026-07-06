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
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");

    if (!printWindow) {
      alert("ポップアップがブロックされました。PDFを開いてから印刷してください。");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PDF印刷</title>
          <style>
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              background: #1f2f2f;
              color: #fff;
              font-family: sans-serif;
            }
            .bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 2;
              padding: 10px 14px;
              background: #0f1f1f;
              border-bottom: 1px solid rgba(0,255,220,.35);
              display: flex;
              gap: 10px;
              align-items: center;
              justify-content: space-between;
              font-size: 13px;
            }
            button {
              background: #00f5d4;
              border: 0;
              border-radius: 8px;
              padding: 8px 12px;
              font-weight: 700;
              cursor: pointer;
            }
            iframe {
              position: fixed;
              top: 46px;
              left: 0;
              width: 100%;
              height: calc(100% - 46px);
              border: 0;
              background: #fff;
            }
            @media print {
              .bar { display: none; }
              iframe {
                top: 0;
                height: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="bar">
            <span id="status">PDFを読み込み中です。少し待ってから印刷画面を開きます...</span>
            <button onclick="window.print()">印刷</button>
          </div>
          <iframe id="pdfFrame" src="${pdfUrl}"></iframe>
          <script>
            const frame = document.getElementById("pdfFrame");
            const status = document.getElementById("status");

            frame.addEventListener("load", function () {
              status.textContent = "PDF読み込み完了。印刷画面を開いています...";
              setTimeout(function () {
                window.focus();
                window.print();
              }, 2500);
            });

            setTimeout(function () {
              status.textContent = "印刷画面が出ない場合は、右の「印刷」ボタンを押してください。";
            }, 6000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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


