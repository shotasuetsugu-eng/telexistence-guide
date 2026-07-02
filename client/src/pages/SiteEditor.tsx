import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import { ArrowLeft, Eye, ImagePlus, Monitor, Redo2, Save, Smartphone, Undo2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const DRAFT_KEY = "siteBuilder.dashboard.draft";
const PUBLISHED_KEY = "siteBuilder.dashboard.published";

const initialComponents = `
  <section style="position:relative;min-height:260px;padding:40px;background:#061b18;border:1px solid #00bfa6;">
    <h1 style="font-size:36px;color:#fff;margin:0 0 16px;">Dashboard</h1>
    <p style="font-size:16px;color:#a8b8b4;">左の部品をドラッグして、自由にページを編集できます。</p>
  </section>
`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SiteEditor() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: settings = [], isLoading: settingsLoading } = trpc.linkSettings.list.useQuery();
  const utils = trpc.useUtils();

  const saveMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      toast.success("保存しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.assets.upload.useMutation({
    onSuccess: ({ url }) => {
      editorRef.current?.AssetManager.add({ src: url });
      editorRef.current?.AssetManager.open();
      toast.success("画像・動画を追加しました");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (userLoading || settingsLoading || user?.role !== "admin") return;
    if (!canvasRef.current || !blocksRef.current || !stylesRef.current || !traitsRef.current) return;

    const saved = new Map(settings.map((item) => [item.key, item.url]));
    const editor = grapesjs.init({
      container: canvasRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      dragMode: "absolute",
      fromElement: false,
      components: initialComponents,
      blockManager: { appendTo: blocksRef.current },
      styleManager: {
        appendTo: stylesRef.current,
        sectors: [
          { name: "サイズ・位置", open: true, buildProps: ["width", "height", "min-height", "position", "top", "left", "padding", "margin"] },
          { name: "文字", open: true, buildProps: ["font-size", "font-weight", "color", "line-height", "text-align"] },
          { name: "背景・枠線", open: true, buildProps: ["background-color", "background", "border", "border-radius", "box-shadow", "opacity"] },
        ],
      },
      traitManager: { appendTo: traitsRef.current },
      deviceManager: {
        devices: [
          { id: "desktop", name: "PC", width: "" },
          { id: "mobile", name: "Mobile", width: "390px", widthMedia: "480px" },
        ],
      },
      panels: { defaults: [] },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Noto+Sans+JP:wght@400;600;700;900&display=swap",
        ],
      },
    });

    editor.BlockManager.add("section", {
      label: "Section",
      category: "レイアウト",
      content: '<section style="position:relative;min-height:240px;padding:32px;background:#07110f;border:1px solid #0b655b;"></section>',
    });
    editor.BlockManager.add("text", {
      label: "テキスト",
      category: "基本",
      content: '<div data-gjs-type="text" style="position:absolute;top:30px;left:30px;font-size:16px;color:#fff;">テキストを編集</div>',
    });
    editor.BlockManager.add("heading", {
      label: "見出し",
      category: "基本",
      content: '<h2 style="position:absolute;top:30px;left:30px;font-size:28px;color:#fff;">見出し</h2>',
    });
    editor.BlockManager.add("image", {
      label: "画像",
      category: "基本",
      activate: true,
      content: { type: "image", style: { position: "absolute", width: "320px", height: "200px", top: "30px", left: "30px", "object-fit": "cover" } },
    });
    editor.BlockManager.add("button", {
      label: "ボタン",
      category: "基本",
      content: '<a href="#" style="position:absolute;top:30px;left:30px;padding:12px 20px;background:#00e5c8;color:#001b18;text-decoration:none;border-radius:4px;font-weight:700;">ボタン</a>',
    });
    editor.BlockManager.add("divider", {
      label: "区切り線",
      category: "基本",
      content: '<div style="position:absolute;top:30px;left:30px;width:300px;height:1px;background:#00bfa6;"></div>',
    });
    editor.BlockManager.add("two-columns", {
      label: "2列レイアウト",
      category: "レイアウト",
      content: `
        <section style="display:grid;grid-template-columns:1fr 1fr;gap:20px;min-height:260px;padding:24px;background:#07110f;">
          <div style="position:relative;min-height:210px;padding:20px;border:1px dashed #0b655b;">左のエリア</div>
          <div style="position:relative;min-height:210px;padding:20px;border:1px dashed #0b655b;">右のエリア</div>
        </section>`,
    });
    editor.BlockManager.add("three-columns", {
      label: "3列レイアウト",
      category: "レイアウト",
      content: `
        <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;min-height:240px;padding:24px;background:#07110f;">
          <div style="min-height:190px;padding:18px;border:1px dashed #0b655b;">エリア1</div>
          <div style="min-height:190px;padding:18px;border:1px dashed #0b655b;">エリア2</div>
          <div style="min-height:190px;padding:18px;border:1px dashed #0b655b;">エリア3</div>
        </section>`,
    });
    editor.BlockManager.add("card", {
      label: "カード",
      category: "レイアウト",
      content: '<article style="position:absolute;top:30px;left:30px;width:320px;padding:24px;background:#061b18;border:1px solid #00bfa6;border-radius:6px;color:#fff;"><h3 style="font-size:22px;margin:0 0 10px;">カード見出し</h3><p style="color:#a8b8b4;">説明文を入力してください。</p></article>',
    });
    editor.BlockManager.add("video", {
      label: "動画",
      category: "メディア",
      content: '<video controls style="position:absolute;top:30px;left:30px;width:480px;height:270px;background:#000;"><source src="" type="video/mp4"></video>',
    });
    editor.BlockManager.add("video-hero", {
      label: "背景動画＋文字",
      category: "メディア",
      content: `
        <section style="position:relative;min-height:520px;overflow:hidden;background:#000;">
          <video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
            <source src="" type="video/mp4">
          </video>
          <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);"></div>
          <div style="position:relative;z-index:2;display:flex;min-height:520px;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;color:#fff;">
            <h1 style="font-size:48px;margin:0 0 16px;">タイトルを入力</h1>
            <p style="font-size:18px;max-width:720px;">背景動画の上に表示する文章です。</p>
            <a href="#" style="margin-top:20px;padding:12px 24px;background:#00e5c8;color:#001b18;text-decoration:none;font-weight:700;">詳しく見る</a>
          </div>
        </section>`,
    });
    editor.BlockManager.add("link", {
      label: "リンク",
      category: "基本",
      content: '<a href="https://" style="position:absolute;top:30px;left:30px;color:#00e5c8;text-decoration:underline;">リンク文字</a>',
    });

    const draft = saved.get(DRAFT_KEY);
    if (draft) {
      try {
        editor.loadProjectData(JSON.parse(draft));
      } catch {
        toast.error("下書きデータを読み込めませんでした");
      }
    }

    editorRef.current = editor;
    setReady(true);
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [userLoading, settingsLoading, user?.role]);

  const saveDraft = () => {
    const editor = editorRef.current;
    if (!editor) return;
    saveMutation.mutate([{ key: DRAFT_KEY, label: "Dashboard draft", url: JSON.stringify(editor.getProjectData()) }]);
  };

  const publish = () => {
    const editor = editorRef.current;
    if (!editor) return;
    saveMutation.mutate([
      { key: DRAFT_KEY, label: "Dashboard draft", url: JSON.stringify(editor.getProjectData()) },
      { key: PUBLISHED_KEY, label: "Dashboard published", url: JSON.stringify({ html: editor.getHtml(), css: editor.getCss() }) },
    ]);
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    uploadMutation.mutate({
      folder: "procedures",
      fileName: file.name,
      mimeType: file.type,
      fileData: await fileToBase64(file),
    });
  };

  if (!userLoading && user?.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">管理者権限が必要です。</div>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050807] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-primary/30 px-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" title="戻る" onClick={() => setLocation("/admin")}><ArrowLeft /></Button>
          <strong>Dashboard Visual Editor</strong>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="元に戻す" onClick={() => editorRef.current?.runCommand("core:undo")}><Undo2 /></Button>
          <Button size="icon" variant="ghost" title="やり直す" onClick={() => editorRef.current?.runCommand("core:redo")}><Redo2 /></Button>
          <Button size="icon" variant="ghost" title="PC表示" onClick={() => editorRef.current?.setDevice("desktop")}><Monitor /></Button>
          <Button size="icon" variant="ghost" title="モバイル表示" onClick={() => editorRef.current?.setDevice("mobile")}><Smartphone /></Button>
          <Button size="icon" variant="ghost" title="画像・動画追加" onClick={() => fileRef.current?.click()}><ImagePlus /></Button>
          <input ref={fileRef} hidden type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => uploadImage(event.target.files?.[0])} />
          <Button variant="outline" onClick={saveDraft} disabled={!ready || saveMutation.isPending}><Save className="mr-2 h-4 w-4" />下書き</Button>
          <Button onClick={publish} disabled={!ready || saveMutation.isPending}><Upload className="mr-2 h-4 w-4" />公開</Button>
          <Button variant="outline" onClick={() => window.open("/", "_blank")}><Eye className="mr-2 h-4 w-4" />確認</Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="overflow-y-auto border-r border-primary/20 bg-[#07110f] p-2">
          <p className="mb-2 text-xs font-bold text-primary">部品</p>
          <div ref={blocksRef} />
        </aside>
        <main className="min-w-0 bg-[#121817] p-3">
          <div ref={canvasRef} className="h-full overflow-hidden border border-primary/30 bg-white" />
        </main>
        <aside className="overflow-y-auto border-l border-primary/20 bg-[#07110f]">
          <div className="border-b border-primary/20 p-3">
            <p className="mb-2 text-xs font-bold text-primary">リンク・内容</p>
            <div ref={traitsRef} />
          </div>
          <div className="p-3">
            <p className="mb-2 text-xs font-bold text-primary">スタイル</p>
            <div ref={stylesRef} />
          </div>
        </aside>
      </div>
    </div>
  );
}
