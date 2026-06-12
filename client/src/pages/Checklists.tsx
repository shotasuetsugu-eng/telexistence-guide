import { ChangeEvent, useState } from "react";
import { ExternalLink, FileCheck2, Link as LinkIcon, Printer, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
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

function getUploadedPdfUrl(item: any, uploadedPdfMap: Record<string, { fileName: string; fileUrl: string }>) {
  const uploaded = uploadedPdfMap[String(item.id)];
  if (uploaded?.fileUrl) return normalizeUrl(uploaded.fileUrl);

  const uploadedFileUrl = normalizeUrl(item.fileUrl);
  if (uploadedFileUrl) return uploadedFileUrl;

  const descriptionUrl = extractChecklistUrl(item.description);
  if (descriptionUrl && isPdfUrl(descriptionUrl)) return descriptionUrl;

  const directUrl = normalizeUrl(item.url);
  if (directUrl && isPdfUrl(directUrl)) return directUrl;

  return "";
}

function getUploadedPdfName(item: any, uploadedPdfMap: Record<string, { fileName: string; fileUrl: string }>) {
  return uploadedPdfMap[String(item.id)]?.fileName || item.fileName || "";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("PDFの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

export default function Checklists() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: checklists = [], isLoading } = trpc.checklists.list.useQuery();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadedPdfMap, setUploadedPdfMap] = useState<Record<string, { fileName: string; fileUrl: string }>>({});

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

  const uploadPdf = async (item: any, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("PDFファイルを選択してください。");
      return;
    }

    try {
      setUploadingId(String(item.id));

      const dataUrl = await fileToDataUrl(file);

      const response = await fetch(`/api/checklists/${encodeURIComponent(String(item.id))}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "PDFアップロードに失敗しました");
      }

      const updated = await response.json();

      setUploadedPdfMap((current) => ({
        ...current,
        [String(item.id)]: {
          fileName: updated.fileName || file.name,
          fileUrl: updated.fileUrl,
        },
      }));

      alert("PDFをアップロードしました。印刷ボタンが使えるようになりました。");
    } catch (error: any) {
      alert(error.message ?? "PDFアップロードに失敗しました");
    } finally {
      setUploadingId(null);
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
            const openUrl = getChecklistOpenUrl(item);
            const pdfUrl = getUploadedPdfUrl(item, uploadedPdfMap);
            const pdfName = getUploadedPdfName(item, uploadedPdfMap);
            const hasAnyUrl = !!openUrl;
            const hasPdf = !!pdfUrl;
            const isUploading = uploadingId === String(item.id);

            return (
              <div
                key={item.id}
                className={`cyber-border rounded-lg p-4 bg-card transition-all ${
                  hasAnyUrl ? "hover:bg-card/80" : "opacity-80"
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

                      {hasPdf ? (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <FileCheck2 className="h-3 w-3" />
                          印刷用PDF: {pdfName || "アップロード済み"}
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-400 mt-1">
                          印刷用PDFが未アップロードです
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {isAdmin && (
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary">
                        <Upload className="h-3 w-3 mr-1" />
                        {isUploading ? "アップロード中" : "PDFアップロード"}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(event) => uploadPdf(item, event)}
                        />
                      </label>
                    )}

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
