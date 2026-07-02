import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, MousePointer2, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Override = {
  selector: string;
  text?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
};

function selectorFor(element: HTMLElement, root: HTMLElement) {
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

export default function LivePageEditor({ pagePath, settings }: { pagePath: string; settings: Array<{ key: string; url: string }> }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const selectedRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const utils = trpc.useUtils();
  const settingKey = `liveEditor.${pagePath}`;

  useEffect(() => {
    const saved = settings.find((item) => item.key === settingKey)?.url;
    if (!saved) return;
    try {
      setOverrides(JSON.parse(saved));
    } catch {
      setOverrides([]);
    }
  }, [settings, settingKey]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tx-main-content");
    if (!root) return;
    rootRef.current = root;

    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("h1,h2,h3,p,span,a,button,img,section,article,div");
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

  const update = (changes: Partial<Override>) => {
    const element = selectedRef.current;
    const root = rootRef.current;
    if (!element || !root) return;
    const selector = selectorFor(element, root);
    if (changes.text !== undefined) element.textContent = changes.text;
    if (changes.color !== undefined) element.style.color = changes.color;
    if (changes.backgroundColor !== undefined) element.style.backgroundColor = changes.backgroundColor;
    if (changes.fontSize !== undefined) element.style.fontSize = changes.fontSize;
    setOverrides((current) => {
      const previous = current.find((item) => item.selector === selector) || { selector };
      return [...current.filter((item) => item.selector !== selector), { ...previous, ...changes }];
    });
  };

  const saveMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      toast.success("現在のレイアウトを保存しました");
    },
    onError: (error) => toast.error(error.message),
  });

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
            <label className="text-xs">文字色 <input type="color" onChange={(event) => update({ color: event.target.value })} /></label>
            <label className="text-xs">背景 <input type="color" onChange={(event) => update({ backgroundColor: event.target.value })} /></label>
            <select
              className="rounded border border-border bg-background px-2 py-2 text-sm"
              onChange={(event) => update({ fontSize: event.target.value })}
              defaultValue=""
              aria-label="文字サイズ"
            >
              <option value="" disabled>文字サイズ</option>
              {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((size) => <option key={size} value={`${size}px`}>{size}px</option>)}
            </select>
          </>
        )}
        <Button onClick={() => saveMutation.mutate([{ key: settingKey, label: `${pagePath} visual overrides`, url: JSON.stringify(overrides) }])}>
          <Save className="mr-2 h-4 w-4" />保存
        </Button>
        <Button variant="outline" onClick={() => { window.location.href = pagePath; }}>
          <Check className="mr-2 h-4 w-4" />編集終了
        </Button>
      </div>
    </div>
  );
}

export function applyLiveOverrides(pagePath: string, settings: Array<{ key: string; url: string }>) {
  const root = document.querySelector<HTMLElement>(".tx-main-content");
  const saved = settings.find((item) => item.key === `liveEditor.${pagePath}`)?.url;
  if (!root || !saved) return;
  try {
    (JSON.parse(saved) as Override[]).forEach((item) => {
      const element = root.querySelector<HTMLElement>(item.selector);
      if (!element) return;
      if (item.text !== undefined) element.textContent = item.text;
      if (item.color) element.style.color = item.color;
      if (item.backgroundColor) element.style.backgroundColor = item.backgroundColor;
      if (item.fontSize) element.style.fontSize = item.fontSize;
    });
  } catch {
    // Ignore invalid legacy editor data.
  }
}
