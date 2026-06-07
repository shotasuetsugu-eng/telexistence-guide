import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Download, File, Image, FileIcon, Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSearch, useLocation } from "wouter";

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Documents() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const categoryId = params.get("category") ? Number(params.get("category")) : undefined;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState<number | "">(categoryId ?? "");
  const [file, setFile] = useState<File | null>(null);

  const { data: documents, isLoading } = trpc.documents.list.useQuery(
    categoryId ? { categoryId } : undefined
  );
  const { data: categories } = trpc.categories.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      setTitle("");
      setDescription("");
      setFile(null);
      const input = document.getElementById("public-document-upload") as HTMLInputElement | null;
      if (input) input.value = "";
      toast.success("資料をアップロードしました");
    },
    onError: (error) => toast.error(error.message),
  });
  const [, setLocation] = useLocation();

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !title || !uploadCategoryId) {
      toast.error("カテゴリ、タイトル、ファイルを指定してください");
      return;
    }
    uploadMutation.mutate({
      categoryId: Number(uploadCategoryId),
      title,
      description,
      fileName: file.name,
      fileData: await fileToBase64(file),
      mimeType: file.type,
      fileSize: file.size,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="資料管理">資料管理</span>
        </h1>
        <p className="mono-sub">// DOCUMENT_MANAGEMENT</p>
      </div>

      {isAdmin && (
        <form onSubmit={handleUpload} className="cyber-border rounded-lg p-4 bg-card space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Upload className="h-4 w-4 text-primary" />
            <span>資料アップロード</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={uploadCategoryId}
              onChange={(event) => setUploadCategoryId(event.target.value ? Number(event.target.value) : "")}
              className="bg-background border border-border rounded px-3 py-2 text-sm"
            >
              <option value="">カテゴリを選択</option>
              {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="資料タイトル"
              className="bg-background border border-border rounded px-3 py-2 text-sm"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="説明"
              className="bg-background border border-border rounded px-3 py-2 text-sm"
            />
            <input
              id="public-document-upload"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="bg-background border border-border rounded px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? "アップロード中..." : "アップロード"}
          </Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLocation("/documents")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            !categoryId ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          すべて
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setLocation(`/documents?category=${cat.id}`)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              categoryId === cat.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-20" />
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.mimeType);
            return (
              <div key={doc.id} className="cyber-border rounded-lg p-4 bg-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-cyber-red shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{doc.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{doc.fileName}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                    </div>
                    {doc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.description}</p>}
                  </div>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors" title="ダウンロード">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">資料が登録されていません</p>
          <p className="mono-sub mt-2">// NO_DOCUMENTS_FOUND</p>
        </div>
      )}
    </div>
  );
}
