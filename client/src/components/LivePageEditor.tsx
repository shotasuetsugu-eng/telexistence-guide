import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, ImagePlus, MousePointer2, Move, Save, Type, Undo2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Override = {
  selector: string;
  global?: boolean;
  text?: string;
  html?: string;
  styles?: Record<string, string>;
};

function selectorFor(element: HTMLElement, root: HTMLElement) {
  if (element === root) return ":root-editor";
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    const tag = current.tagName.toLowerCase();
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((item) => item.tagName === current?.tagName)
      : [];
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LivePageEditor({ pagePath, settings }: { pagePath: string; settings: Array<{ key: string; url: string }> }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const selectedRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [moveMode, setMoveMode] = useState(false);
  const historyRef = useRef<Array<{ element: HTMLElement; html: string; style: string; overrides: Override[] }>>([]);
  const [historySize, setHistorySize] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadActionRef = useRef<"image" | "video" | "backgroundImage" | "backgroundVideo">("image");
  const utils = trpc.useUtils();
  const settingKey = `liveEditor.${pagePath}`;

  useEffect(() => {
    const saved = settings.find((item) => item.key === settingKey)?.url;
    try {
      const pageItems = saved ? JSON.parse(saved) : [];
      const globalSaved = settings.find((item) => item.key === "liveEditor.global")?.url;
      const globalItems = globalSaved ? JSON.parse(globalSaved) : [];
      setOverrides([...pageItems, ...globalItems]);
    } catch {
      setOverrides([]);
    }
  }, [settings, settingKey]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tx-app");
    if (!root) return;
    rootRef.current = root;

    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("h1,h2,h3,p,span,a,button,img,section,article,nav,aside,header,main,div");
      if (!target || !root.contains(target) || target.closest("[data-live-editor-toolbar]")) return;
      event.preventDefault();
      event.stopPropagation();
      selectedRef.current?.classList.remove("live-editor-selected");
      selectedRef.current = target;
      target.classList.add("live-editor-selected");
      setSelected(target);
    };
    root.addEventListener("click", click, true);
    return () => {
      root.removeEventListener("click", click, true);
      selectedRef.current?.classList.remove("live-editor-selected");
    };
  }, []);

  const update = (changes: Partial<Override>, recordHistory = true) => {
    const element = selectedRef.current;
    const root = rootRef.current;
    if (!element || !root) return;
    if (recordHistory) {
      historyRef.current.push({
        element,
        html: element.innerHTML,
        style: element.style.cssText,
        overrides,
      });
      if (historyRef.current.length > 100) historyRef.current.shift();
      setHistorySize(historyRef.current.length);
    }
    const selector = selectorFor(element, root);
    const global = Boolean(element.closest("aside,header"));
    if (changes.text !== undefined) element.textContent = changes.text;
    if (changes.html !== undefined) element.innerHTML = changes.html;
    if (changes.styles) Object.assign(element.style, changes.styles);
    setOverrides((current) => {
      const previous = current.find((item) => item.selector === selector && Boolean(item.global) === global) || { selector, global };
      const next = {
        ...previous,
        ...changes,
        styles: changes.styles ? { ...(previous.styles || {}), ...changes.styles } : previous.styles,
      };
      return [...current.filter((item) => !(item.selector === selector && Boolean(item.global) === global)), next];
    });
  };

  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    previous.element.innerHTML = previous.html;
    previous.element.style.cssText = previous.style;
    setOverrides(previous.overrides);
    setHistorySize(historyRef.current.length);
    toast.success("1つ前の編集に戻しました");
  };

  useEffect(() => {
    const element = selected;
    if (!element || !moveMode) return;
    element.style.cursor = "move";
    element.style.touchAction = "none";

    const pointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("input,select,button,a")) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const computed = window.getComputedStyle(element);
      const startLeft = Number.parseFloat(computed.left) || 0;
      const startTop = Number.parseFloat(computed.top) || 0;
      const startHtml = element.innerHTML;
      const startStyle = element.style.cssText;
      const startOverrides = overrides;
      if (computed.position === "static") element.style.position = "relative";

      const pointerMove = (moveEvent: PointerEvent) => {
        element.style.left = `${Math.round(startLeft + moveEvent.clientX - startX)}px`;
        element.style.top = `${Math.round(startTop + moveEvent.clientY - startY)}px`;
      };
      const pointerUp = () => {
        window.removeEventListener("pointermove", pointerMove);
        window.removeEventListener("pointerup", pointerUp);
        historyRef.current.push({ element, html: startHtml, style: startStyle, overrides: startOverrides });
        setHistorySize(historyRef.current.length);
        update({
          styles: {
            position: element.style.position || "relative",
            left: element.style.left || "0px",
            top: element.style.top || "0px",
          },
        }, false);
      };
      window.addEventListener("pointermove", pointerMove);
      window.addEventListener("pointerup", pointerUp, { once: true });
    };

    element.addEventListener("pointerdown", pointerDown, true);
    return () => {
      element.removeEventListener("pointerdown", pointerDown, true);
      element.style.cursor = "";
      element.style.touchAction = "";
    };
  }, [selected, moveMode]);

  const setBackgroundVideo = (url: string) => {
    const element = selectedRef.current;
    if (!element || !url) return;
    element.querySelector("[data-live-bg-video]")?.remove();
    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.insertAdjacentHTML(
      "afterbegin",
      `<video data-live-bg-video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none"><source src="${url.replace(/"/g, "&quot;")}"></video>`
    );
    Array.from(element.children).forEach((child) => {
      if (!(child as HTMLElement).hasAttribute("data-live-bg-video")) {
        (child as HTMLElement).style.position ||= "relative";
        (child as HTMLElement).style.zIndex ||= "1";
      }
    });
    update({ html: element.innerHTML, styles: { position: "relative", overflow: "hidden" } });
  };

  const saveMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      toast.success("現在のレイアウトを保存しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.assets.upload.useMutation({
    onSuccess: ({ url }) => {
      const element = selectedRef.current;
      if (!element) return;
      const action = uploadActionRef.current;
      if (action === "backgroundImage") {
        update({ styles: { backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center" } });
      } else if (action === "backgroundVideo") {
        setBackgroundVideo(url);
      } else if (action === "video") {
        element.insertAdjacentHTML("beforeend", `<video controls playsinline style="display:block;width:100%;max-width:720px"><source src="${url}"></video>`);
        update({ html: element.innerHTML });
      } else {
        element.insertAdjacentHTML("beforeend", `<img src="${url}" alt="" style="display:block;max-width:100%;height:auto">`);
        update({ html: element.innerHTML });
      }
      toast.success("ファイルを追加しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const chooseFile = (action: typeof uploadActionRef.current) => {
    if (!selectedRef.current) {
      toast.error("先に追加先をクリックしてください");
      return;
    }
    uploadActionRef.current = action;
    if (fileRef.current) {
      fileRef.current.accept = action.toLowerCase().includes("video") ? "video/mp4,video/webm" : "image/*";
      fileRef.current.click();
    }
  };

  const chooseGlobalFile = (action: "backgroundImage" | "backgroundVideo") => {
    const root = rootRef.current;
    if (!root) return;
    selectedRef.current?.classList.remove("live-editor-selected");
    selectedRef.current = root;
    root.classList.add("live-editor-selected");
    setSelected(root);
    chooseFile(action);
  };

  const addTextToPage = () => {
    const root = rootRef.current;
    if (!root) return;
    const main = root.querySelector<HTMLElement>(".tx-main-content") || root;
    const html = `${main.innerHTML}<div style="position:relative;z-index:2;margin:16px;padding:16px;color:#fff;font-size:32px;font-weight:700">新しい文字を入力</div>`;
    selectedRef.current = main;
    setSelected(main);
    update({ html });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    uploadMutation.mutate({
      folder: "procedures",
      fileName: file.name,
      mimeType: file.type,
      fileData: await fileToBase64(file),
    });
  };

  return (
    <div data-live-editor-toolbar className="fixed bottom-4 left-1/2 z-[200] w-[min(920px,calc(100vw-24px))] -translate-x-1/2 rounded-md border border-primary bg-[#06110f] p-3 shadow-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <MousePointer2 className="h-4 w-4" />
          {selected ? selected.tagName : "編集する場所をクリック"}
        </span>
        {selected && (
          <>
            <input
              className="min-w-[220px] flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
              value={selected.textContent || ""}
              onChange={(event) => update({ text: event.target.value })}
              aria-label="文字"
            />
            <label className="text-xs">文字色 <input type="color" onChange={(event) => update({ styles: { color: event.target.value } })} /></label>
            <label className="text-xs">背景 <input type="color" onChange={(event) => update({ styles: { backgroundColor: event.target.value } })} /></label>
            <select
              className="rounded border border-border bg-background px-2 py-2 text-sm"
              onChange={(event) => update({ styles: { fontSize: event.target.value } })}
              defaultValue=""
              aria-label="文字サイズ"
            >
              <option value="" disabled>文字サイズ</option>
              {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((size) => <option key={size} value={`${size}px`}>{size}px</option>)}
            </select>
            <details className="relative">
              <summary className="cursor-pointer rounded border border-border px-3 py-2 text-sm">レイアウト・背景</summary>
              <div className="absolute bottom-12 right-0 z-10 grid w-[420px] grid-cols-2 gap-2 rounded border border-primary/40 bg-[#06110f] p-3 shadow-2xl">
                <input placeholder="幅 例: 500px / 100%" onChange={(e) => update({ styles: { width: e.target.value } })} />
                <input placeholder="高さ 例: 300px" onChange={(e) => update({ styles: { height: e.target.value } })} />
                <input placeholder="内側余白 例: 24px" onChange={(e) => update({ styles: { padding: e.target.value } })} />
                <input placeholder="外側余白 例: 16px" onChange={(e) => update({ styles: { margin: e.target.value } })} />
                <input placeholder="角丸 例: 8px" onChange={(e) => update({ styles: { borderRadius: e.target.value } })} />
                <input placeholder="背景画像URL" onChange={(e) => update({ styles: { backgroundImage: e.target.value ? `url("${e.target.value}")` : "", backgroundSize: "cover", backgroundPosition: "center" } })} />
                <input placeholder="背景動画URL（MP4/WebM）" onBlur={(e) => setBackgroundVideo(e.target.value)} />
                <select onChange={(e) => update({ styles: { display: e.target.value } })} defaultValue="">
                  <option value="" disabled>レイアウト方式</option>
                  <option value="block">通常</option>
                  <option value="flex">横並び</option>
                  <option value="grid">グリッド</option>
                </select>
                <select onChange={(e) => update({ styles: { gridTemplateColumns: e.target.value, display: "grid" } })} defaultValue="">
                  <option value="" disabled>列数</option>
                  <option value="1fr">1列</option>
                  <option value="repeat(2, 1fr)">2列</option>
                  <option value="repeat(3, 1fr)">3列</option>
                  <option value="repeat(4, 1fr)">4列</option>
                </select>
                <input placeholder="横位置 例: 20px" onChange={(e) => update({ styles: { position: "relative", left: e.target.value } })} />
                <input placeholder="縦位置 例: 20px" onChange={(e) => update({ styles: { position: "relative", top: e.target.value } })} />
                <select onChange={(e) => update({ styles: { textAlign: e.target.value } })} defaultValue="">
                  <option value="" disabled>文字配置</option>
                  <option value="left">左</option>
                  <option value="center">中央</option>
                  <option value="right">右</option>
                </select>
                <select onChange={(e) => update({ styles: { justifyContent: e.target.value, alignItems: e.target.value } })} defaultValue="">
                  <option value="" disabled>要素の配置</option>
                  <option value="flex-start">先頭</option>
                  <option value="center">中央</option>
                  <option value="flex-end">末尾</option>
                  <option value="space-between">均等</option>
                </select>
              </div>
            </details>
            <Button size="sm" variant="outline" onClick={() => chooseFile("image")}><ImagePlus className="mr-1 h-4 w-4" />画像</Button>
            <Button size="sm" variant="outline" onClick={() => chooseFile("video")}><Video className="mr-1 h-4 w-4" />動画</Button>
            <Button size="sm" variant="outline" onClick={() => chooseFile("backgroundImage")}>背景画像</Button>
            <Button size="sm" variant="outline" onClick={() => chooseFile("backgroundVideo")}>背景動画</Button>
            <Button
              size="sm"
              variant={moveMode ? "default" : "outline"}
              onClick={() => setMoveMode((current) => !current)}
            >
              <Move className="mr-1 h-4 w-4" />{moveMode ? "移動中" : "ドラッグ移動"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const element = selectedRef.current;
                if (!element) return;
                element.insertAdjacentHTML("beforeend", '<div style="position:relative;z-index:2;padding:16px;color:#fff;font-size:32px;font-weight:700">文字を入力</div>');
                update({ html: element.innerHTML });
              }}
            >
              <Type className="mr-1 h-4 w-4" />文字追加
            </Button>
          </>
        )}
        <Button onClick={() => saveMutation.mutate([
          { key: settingKey, label: `${pagePath} visual overrides`, url: JSON.stringify(overrides.filter((item) => !item.global)) },
          { key: "liveEditor.global", label: "Global visual overrides", url: JSON.stringify(overrides.filter((item) => item.global)) },
        ])}>
          <Save className="mr-2 h-4 w-4" />保存
        </Button>
        <Button variant="outline" onClick={undo} disabled={historySize === 0}>
          <Undo2 className="mr-2 h-4 w-4" />1つ戻る
        </Button>
        <Button variant="outline" onClick={addTextToPage}><Type className="mr-1 h-4 w-4" />ページに文字追加</Button>
        <Button variant="outline" onClick={() => chooseGlobalFile("backgroundImage")}>全体背景画像</Button>
        <Button variant="outline" onClick={() => chooseGlobalFile("backgroundVideo")}>全体背景動画</Button>
        <input ref={fileRef} hidden type="file" onChange={(event) => uploadFile(event.target.files?.[0])} />
        <Button variant="outline" onClick={() => { window.location.href = pagePath; }}>
          <Check className="mr-2 h-4 w-4" />編集終了
        </Button>
      </div>
    </div>
  );
}

export function applyLiveOverrides(pagePath: string, settings: Array<{ key: string; url: string }>) {
  const root = document.querySelector<HTMLElement>(".tx-app");
  const saved = settings.find((item) => item.key === `liveEditor.${pagePath}`)?.url;
  const globalSaved = settings.find((item) => item.key === "liveEditor.global")?.url;
  if (!root || (!saved && !globalSaved)) return;
  try {
    const items: Override[] = [
      ...(globalSaved ? JSON.parse(globalSaved) : []),
      ...(saved ? JSON.parse(saved) : []),
    ];
    items.forEach((item) => {
      const element = item.selector === ":root-editor" ? root : root.querySelector<HTMLElement>(item.selector);
      if (!element) return;
      if (item.text !== undefined) element.textContent = item.text;
      if (item.html !== undefined) element.innerHTML = item.html;
      if (item.styles) Object.assign(element.style, item.styles);
    });
  } catch {
    // Ignore invalid legacy editor data.
  }
}
