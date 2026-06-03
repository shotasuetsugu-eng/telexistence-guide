import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Table,
  Presentation,
  File,
  ExternalLink,
  Download,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";

function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return Table;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return Presentation;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("archive")) return Archive;
  if (mimeType.includes("folder")) return FolderOpen;
  return File;
}

function getMimeLabel(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.folder") return "フォルダ";
  if (mimeType === "application/vnd.google-apps.document") return "Googleドキュメント";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "Googleスプレッドシート";
  if (mimeType === "application/vnd.google-apps.presentation") return "Googleスライド";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.startsWith("image/")) return "画像";
  if (mimeType.startsWith("video/")) return "動画";
  if (mimeType.startsWith("audio/")) return "音声";
  if (mimeType.includes("zip")) return "ZIP";
  return mimeType.split("/").pop()?.toUpperCase() ?? "ファイル";
}

function formatFileSize(size?: string): string {
  if (!size) return "";
  const bytes = parseInt(size, 10);
  if (isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Drive() {
  const [folderId, setFolderId] = useState("");
  const [inputFolderId, setInputFolderId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: folderInfo } = trpc.drive.getFolderInfo.useQuery({ folderId: folderId || undefined });
  const { data, isLoading, error, refetch } = trpc.drive.listFiles.useQuery(
    { folderId: folderId || undefined },
    { retry: false }
  );

  const files = data?.files ?? [];
  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const handleFolderChange = (e: React.FormEvent) => {
    e.preventDefault();
    setFolderId(inputFolderId.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Google Drive">Google Drive</span>
        </h1>
        <p className="mono-sub">// DRIVE_EXPLORER</p>
      </div>

      {/* Folder ID Input */}
      <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          フォルダ指定
        </h3>
        <p className="text-xs text-muted-foreground">
          Google DriveのフォルダURL（<code className="text-primary font-mono">drive.google.com/drive/folders/<span className="text-accent">FOLDER_ID</span></code>）からIDを入力してください。
          空欄の場合は環境変数の <code className="text-primary font-mono">GOOGLE_DRIVE_FOLDER_ID</code> を使用します。
        </p>
        <form onSubmit={handleFolderChange} className="flex gap-2">
          <input
            type="text"
            value={inputFolderId}
            onChange={(e) => setInputFolderId(e.target.value)}
            placeholder="フォルダID（例: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms）"
            className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
          >
            表示
          </button>
        </form>
      </div>

      {/* Folder Info & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">
            {folderInfo?.name ?? "Google Drive"}
          </span>
          {data?.configured === false && (
            <span className="text-xs text-accent font-mono">// 未設定</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ファイル名で絞り込み..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-52"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="再読み込み"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Not configured state */}
      {data?.configured === false && (
        <div className="cyber-border rounded-lg p-6 bg-card text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-accent mx-auto" />
          <h3 className="font-semibold text-foreground">Google Drive が未設定です</h3>
          <p className="text-sm text-muted-foreground">{data.message}</p>
          <div className="text-left bg-muted/50 rounded-md p-3 text-xs font-mono space-y-1">
            <p className="text-primary">// .env に以下を設定してください</p>
            <p className="text-foreground">GOOGLE_DRIVE_API_KEY=<span className="text-accent">your_api_key</span></p>
            <p className="text-foreground">GOOGLE_DRIVE_FOLDER_ID=<span className="text-accent">your_folder_id</span></p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="cyber-border rounded-lg p-4 bg-card border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">エラーが発生しました</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* File List */}
      {!isLoading && data?.configured !== false && !error && (
        <>
          {filteredFiles.length === 0 ? (
            <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-2">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "検索結果がありません" : "ファイルが見つかりません"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="mono-sub px-1">{filteredFiles.length} 件のファイル</p>
              <div className="cyber-border rounded-lg bg-card overflow-hidden">
                {filteredFiles.map((file, idx) => {
                  const IconComponent = getMimeIcon(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors ${
                        idx !== filteredFiles.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <IconComponent className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{getMimeLabel(file.mimeType)}</span>
                          {file.size && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                          )}
                          {file.modifiedTime && (
                            <span className="text-xs text-muted-foreground">{formatDate(file.modifiedTime)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="ブラウザで開く"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {file.webContentLink && (
                          <a
                            href={file.webContentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="ダウンロード"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
