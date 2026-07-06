import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  ImagePlus,
  Link2,
  Monitor,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const LEGACY_DRAFT_KEY = "siteBuilder.dashboard.draft";
const LEGACY_PUBLISHED_KEY = "siteBuilder.dashboard.published";
const SITE_DRAFT_KEY = "siteBuilder.pages.draft";
const SITE_PUBLISHED_KEY = "siteBuilder.pages.published";

type PageDraft = {
  id: string;
  title: string;
  path: string;
  projectData?: any;
};

type NavItem = {
  id: string;
  title: string;
  type: "page" | "url";
  pageId?: string;
  url?: string;
  enabled: boolean;
};

type SiteDraft = {
  pages: PageDraft[];
  navItems: NavItem[];
  activePageId: string;
};

const defaultPageId = "home";

const initialComponents = `
  <section style="position:relative;min-height:520px;padding:56px 32px;background:linear-gradient(135deg,#061b18,#0b2b26);overflow:hidden;">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at top right,rgba(0,229,200,.24),transparent 36%);"></div>
    <div style="position:relative;z-index:2;max-width:920px;margin:0 auto;color:#fff;">
      <p style="margin:0 0 14px;color:#00e5c8;font-weight:700;letter-spacing:.16em;">PUBLIC HOME PAGE</p>
      <h1 style="font-size:52px;line-height:1.08;margin:0 0 18px;font-weight:900;">ホームページを自由に編集</h1>
      <p style="font-size:18px;line-height:1.8;color:#d7e8e4;max-width:680px;">左の部品を追加して、文字・画像・動画・リンク・背景を好きなように変更できます。</p>
      <a href="#content" style="display:inline-block;margin-top:26px;padding:14px 24px;border-radius:999px;background:#00e5c8;color:#001b18;text-decoration:none;font-weight:800;">詳しく見る</a>
    </div>
  </section>
  <section id="content" style="padding:48px 32px;background:#f7fbfa;color:#061b18;">
    <div style="max-width:1080px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
      <article style="padding:24px;border:1px solid #cde5df;border-radius:16px;background:#fff;">
        <h3 style="margin:0 0 10px;font-size:22px;">見出し</h3>
        <p style="margin:0;color:#4b625d;line-height:1.7;">説明文をここに入れます。</p>
      </article>
      <article style="padding:24px;border:1px solid #cde5df;border-radius:16px;background:#fff;">
        <h3 style="margin:0 0 10px;font-size:22px;">画像</h3>
        <p style="margin:0;color:#4b625d;line-height:1.7;">画像や動画も追加できます。</p>
      </article>
      <article style="padding:24px;border:1px solid #cde5df;border-radius:16px;background:#fff;">
        <h3 style="margin:0 0 10px;font-size:22px;">リンク</h3>
        <p style="margin:0;color:#4b625d;line-height:1.7;">ボタンやリンク先も編集できます。</p>
      </article>
    </div>
  </section>
`;

function newId(prefix = "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pagePath(pageId: string) {
  return pageId === defaultPageId ? "/" : `/p/${pageId}`;
}

function makeInitialDraft(): SiteDraft {
  const pages: PageDraft[] = [
    { id: defaultPageId, title: "ホーム", path: "/", projectData: undefined },
  ];

  return {
    pages,
    navItems: [
      { id: "nav-home", title: "ホーム", type: "page", pageId: defaultPageId, enabled: true },
    ],
    activePageId: defaultPageId,
  };
}

function normalizeUrl(value = "") {
  const url = value.trim();
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function safeJsonParse<T>(value?: string) {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function loadDraftFromSettings(settings: Array<{ key: string; url: string }>): SiteDraft {
  const saved = new Map(settings.map((item) => [item.key, item.url] as const));
  const draft = safeJsonParse<SiteDraft>(saved.get(SITE_DRAFT_KEY));
  if (draft?.pages?.length) {
    const pages = draft.pages.map((page) => ({
      ...page,
      path: page.path || pagePath(page.id),
    }));
    return {
      pages,
      navItems: draft.navItems?.length
        ? draft.navItems
        : pages.map((page) => ({ id: `nav-${page.id}`, title: page.title, type: "page", pageId: page.id, enabled: true })),
      activePageId: draft.activePageId || pages[0].id,
    };
  }

  const initial = makeInitialDraft();
  const legacyDraft = safeJsonParse<any>(saved.get(LEGACY_DRAFT_KEY));
  if (legacyDraft) {
    initial.pages[0].projectData = legacyDraft;
  }
  return initial;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setEditorToPage(editor: Editor, page: PageDraft) {
  if (page.projectData) {
    editor.loadProjectData(page.projectData);
    return;
  }

  editor.setComponents(initialComponents);
  (editor as any).setStyle?.("");
}

function applyUploadedMedia(editor: Editor | null, url: string, mimeType: string) {
  if (!editor) return;

  editor.AssetManager.add({ src: url, type: mimeType.startsWith("video/") ? "video" : "image" });

  const selected = editor.getSelected() as any;
  const tagName = String(selected?.get?.("tagName") || "").toLowerCase();

  if (mimeType.startsWith("video/")) {
    if (selected && tagName === "video") {
      selected.addAttributes({ src: url });
      return;
    }

    editor.addComponents(`
      <video src="${url}" controls style="position:absolute;top:40px;left:40px;width:520px;max-width:90%;height:292px;background:#000;object-fit:cover;"></video>
    `);
    return;
  }

  if (selected?.is?.("image") || tagName === "img") {
    selected.addAttributes({ src: url });
    return;
  }

  editor.addComponents({
    type: "image",
    attributes: { src: url, alt: "" },
    style: {
      position: "absolute",
      top: "40px",
      left: "40px",
      width: "360px",
      height: "220px",
      "object-fit": "cover",
      "border-radius": "12px",
    },
  });
}

function createPublishedPages(editor: Editor, pages: PageDraft[]) {
  const currentProject = editor.getProjectData();
  const published = pages.map((page) => {
    const projectData = page.projectData || (page.id === defaultPageId ? currentProject : undefined);
    if (projectData) {
      editor.loadProjectData(projectData);
    } else {
      setEditorToPage(editor, page);
    }

    return {
      id: page.id,
      title: page.title,
      path: page.path || pagePath(page.id),
      html: editor.getHtml(),
      css: editor.getCss(),
    };
  });

  editor.loadProjectData(currentProject);
  return published;
}

export default function SiteEditor() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const pagesRef = useRef<PageDraft[]>([]);
  const navItemsRef = useRef<NavItem[]>([]);
  const activePageIdRef = useRef(defaultPageId);
  const pendingUploadMimeRef = useRef("");

  const [ready, setReady] = useState(false);
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [activePageId, setActivePageId] = useState(defaultPageId);

  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: settings = [], isLoading: settingsLoading } = trpc.linkSettings.list.useQuery();
  const utils = trpc.useUtils();

  const activePage = useMemo(() => pages.find((page) => page.id === activePageId), [activePageId, pages]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    navItemsRef.current = navItems;
  }, [navItems]);

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  const saveMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      toast.success("保存しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.assets.upload.useMutation({
    onSuccess: ({ url }) => {
      applyUploadedMedia(editorRef.current, url, pendingUploadMimeRef.current);
      toast.success("追加しました");
    },
    onError: (error) => toast.error(error.message),
  });

  const snapshotPages = () => {
    const editor = editorRef.current;
    const activeId = activePageIdRef.current;
    const current = pagesRef.current.length ? pagesRef.current : makeInitialDraft().pages;

    if (!editor) return current;

    const next = current.map((page) =>
      page.id === activeId
        ? { ...page, path: page.path || pagePath(page.id), projectData: editor.getProjectData() }
        : { ...page, path: page.path || pagePath(page.id) }
    );

    pagesRef.current = next;
    setPages(next);
    return next;
  };

  useEffect(() => {
    if (userLoading || settingsLoading || user?.role !== "admin") return;
    if (!canvasRef.current || !blocksRef.current || !stylesRef.current || !traitsRef.current) return;
    if (editorRef.current) return;

    const initialDraft = loadDraftFromSettings(settings);
    pagesRef.current = initialDraft.pages;
    navItemsRef.current = initialDraft.navItems;
    activePageIdRef.current = initialDraft.activePageId;
    setPages(initialDraft.pages);
    setNavItems(initialDraft.navItems);
    setActivePageId(initialDraft.activePageId);

    const editor = grapesjs.init({
      container: canvasRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      dragMode: "absolute",
      fromElement: false,
      components: initialComponents,
      blockManager: { appendTo: blocksRef.current },
      selectorManager: { appendTo: stylesRef.current },
      traitManager: { appendTo: traitsRef.current },
      styleManager: {
        appendTo: stylesRef.current,
        sectors: [
          {
            name: "文字",
            open: true,
            buildProps: ["font-family", "font-size", "font-weight", "color", "line-height", "letter-spacing", "text-align"],
          },
          {
            name: "サイズ・位置",
            open: true,
            buildProps: ["width", "height", "min-height", "max-width", "position", "top", "left", "padding", "margin", "display", "gap"],
          },
          {
            name: "背景",
            open: true,
            buildProps: ["background-color", "background", "background-image", "background-size", "background-position", "opacity"],
          },
          {
            name: "枠・角丸・影",
            open: false,
            buildProps: ["border", "border-radius", "box-shadow", "overflow"],
          },
          {
            name: "並び",
            open: false,
            buildProps: ["flex-direction", "align-items", "justify-content", "grid-template-columns"],
          },
        ],
      },
      deviceManager: {
        devices: [
          { id: "desktop", name: "PC", width: "" },
          { id: "tablet", name: "タブレット", width: "820px", widthMedia: "900px" },
          { id: "mobile", name: "スマホ", width: "390px", widthMedia: "480px" },
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
      label: "セクション",
      category: "レイアウト",
      content: '<section style="position:relative;min-height:320px;padding:48px 32px;background:#07110f;color:#fff;"></section>',
    });
    editor.BlockManager.add("two-columns", {
      label: "2列",
      category: "レイアウト",
      content: `
        <section style="display:grid;grid-template-columns:1fr 1fr;gap:24px;min-height:320px;padding:40px;background:#07110f;color:#fff;">
          <div style="position:relative;min-height:240px;padding:24px;border:1px dashed #0b655b;border-radius:14px;">左エリア</div>
          <div style="position:relative;min-height:240px;padding:24px;border:1px dashed #0b655b;border-radius:14px;">右エリア</div>
        </section>`,
    });
    editor.BlockManager.add("three-columns", {
      label: "3列",
      category: "レイアウト",
      content: `
        <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;min-height:280px;padding:36px;background:#07110f;color:#fff;">
          <div style="min-height:200px;padding:22px;border:1px dashed #0b655b;border-radius:14px;">エリア1</div>
          <div style="min-height:200px;padding:22px;border:1px dashed #0b655b;border-radius:14px;">エリア2</div>
          <div style="min-height:200px;padding:22px;border:1px dashed #0b655b;border-radius:14px;">エリア3</div>
        </section>`,
    });
    editor.BlockManager.add("hero", {
      label: "メイン画像",
      category: "レイアウト",
      content: `
        <section style="position:relative;min-height:520px;padding:64px 32px;background:linear-gradient(135deg,#061b18,#123d37);overflow:hidden;color:#fff;">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(0,229,200,.22),transparent 34%);"></div>
          <div style="position:relative;z-index:2;max-width:980px;margin:auto;">
            <p style="color:#00e5c8;font-weight:800;letter-spacing:.12em;">HERO SECTION</p>
            <h1 style="font-size:56px;line-height:1.08;margin:0 0 18px;font-weight:900;">大きな見出し</h1>
            <p style="font-size:18px;line-height:1.8;max-width:680px;color:#d7e8e4;">説明文を入れて、ボタンや画像を重ねられます。</p>
            <a href="#" style="display:inline-block;margin-top:24px;padding:14px 24px;border-radius:999px;background:#00e5c8;color:#001b18;text-decoration:none;font-weight:800;">ボタン</a>
          </div>
        </section>`,
    });
    editor.BlockManager.add("text", {
      label: "テキスト",
      category: "文字",
      content: '<div data-gjs-type="text" style="position:absolute;top:40px;left:40px;font-size:18px;line-height:1.8;color:#fff;">クリックして文字を編集</div>',
    });
    editor.BlockManager.add("heading", {
      label: "見出し",
      category: "文字",
      content: '<h2 style="position:absolute;top:40px;left:40px;font-size:36px;line-height:1.2;color:#fff;margin:0;">見出し</h2>',
    });
    editor.BlockManager.add("button", {
      label: "ボタン",
      category: "リンク",
      content: '<a href="#" style="position:absolute;top:40px;left:40px;padding:14px 24px;background:#00e5c8;color:#001b18;text-decoration:none;border-radius:999px;font-weight:800;">ボタン</a>',
    });
    editor.BlockManager.add("link", {
      label: "リンク文字",
      category: "リンク",
      content: '<a href="https://" style="position:absolute;top:40px;left:40px;color:#00e5c8;text-decoration:underline;font-weight:700;">リンク文字</a>',
    });
    editor.BlockManager.add("image", {
      label: "画像",
      category: "メディア",
      activate: true,
      content: {
        type: "image",
        style: {
          position: "absolute",
          width: "360px",
          height: "220px",
          top: "40px",
          left: "40px",
          "object-fit": "cover",
          "border-radius": "14px",
        },
      },
    });
    editor.BlockManager.add("video", {
      label: "動画",
      category: "メディア",
      content: '<video src="" controls playsinline style="position:absolute;top:40px;left:40px;width:520px;max-width:90%;height:292px;background:#000;object-fit:cover;border-radius:14px;"></video>',
    });
    editor.BlockManager.add("video-hero", {
      label: "背景動画＋文字",
      category: "メディア",
      content: `
        <section style="position:relative;min-height:560px;overflow:hidden;background:#000;color:#fff;">
          <video src="" autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>
          <div style="position:absolute;inset:0;background:rgba(0,0,0,.46);"></div>
          <div style="position:relative;z-index:2;display:flex;min-height:560px;flex-direction:column;align-items:center;justify-content:center;padding:48px 32px;text-align:center;">
            <p style="margin:0 0 12px;color:#00e5c8;font-weight:800;letter-spacing:.14em;">VIDEO BACKGROUND</p>
            <h1 style="font-size:56px;line-height:1.08;margin:0 0 18px;font-weight:900;">動画の上に文字</h1>
            <p style="font-size:18px;line-height:1.8;max-width:720px;color:#f1faf8;">背景動画は自動再生・ループ・ミュートで表示します。</p>
            <a href="#" style="display:inline-block;margin-top:24px;padding:14px 24px;border-radius:999px;background:#00e5c8;color:#001b18;text-decoration:none;font-weight:800;">詳しく見る</a>
          </div>
        </section>`,
    });
    editor.BlockManager.add("card", {
      label: "カード",
      category: "レイアウト",
      content: '<article style="position:absolute;top:40px;left:40px;width:340px;padding:26px;background:#061b18;border:1px solid #00bfa6;border-radius:18px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.25);"><h3 style="font-size:24px;margin:0 0 10px;">カード見出し</h3><p style="color:#cde5df;line-height:1.7;margin:0;">説明文を入力してください。</p></article>',
    });
    editor.BlockManager.add("divider", {
      label: "区切り線",
      category: "レイアウト",
      content: '<div style="position:absolute;top:40px;left:40px;width:320px;height:1px;background:#00bfa6;"></div>',
    });
    editor.BlockManager.add("spacer", {
      label: "余白",
      category: "レイアウト",
      content: '<div style="height:64px;"></div>',
    });
    editor.BlockManager.add("feature-calendar", {
      label: "カレンダー導線",
      category: "機能",
      content: '<a href="/fs-team-calendar" style="display:block;padding:24px;border-radius:18px;background:#06241f;color:#fff;text-decoration:none;border:1px solid #00bfa6;"><strong style="font-size:22px;">FS Team Calendar</strong><p style="margin:8px 0 0;color:#cde5df;">カレンダー画面へ移動します。</p></a>',
    });
    editor.BlockManager.add("feature-map", {
      label: "マップ導線",
      category: "機能",
      content: '<a href="/map" style="display:block;padding:24px;border-radius:18px;background:#06241f;color:#fff;text-decoration:none;border:1px solid #00bfa6;"><strong style="font-size:22px;">マップ</strong><p style="margin:8px 0 0;color:#cde5df;">店舗マップへ移動します。</p></a>',
    });

    editorRef.current = editor;
    setEditorToPage(editor, initialDraft.pages.find((page) => page.id === initialDraft.activePageId) || initialDraft.pages[0]);
    setReady(true);

    return () => {
      snapshotPages();
      editor.destroy();
      editorRef.current = null;
    };
  }, [userLoading, settingsLoading, user?.role]);

  const switchPage = (pageId: string) => {
    const editor = editorRef.current;
    if (!editor || pageId === activePageIdRef.current) return;

    const updated = snapshotPages();
    const nextPage = updated.find((page) => page.id === pageId);
    if (!nextPage) return;

    activePageIdRef.current = pageId;
    setActivePageId(pageId);
    setEditorToPage(editor, nextPage);
  };

  const addPage = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const updated = snapshotPages();
    const id = newId("page");
    const nextPage: PageDraft = {
      id,
      title: `新しいページ${updated.length}`,
      path: pagePath(id),
      projectData: undefined,
    };

    const nextPages = [...updated, nextPage];
    const nextNav = [
      ...navItemsRef.current,
      { id: newId("nav"), title: nextPage.title, type: "page" as const, pageId: id, enabled: true },
    ];

    pagesRef.current = nextPages;
    navItemsRef.current = nextNav;
    setPages(nextPages);
    setNavItems(nextNav);
    setActivePageId(id);
    activePageIdRef.current = id;
    setEditorToPage(editor, nextPage);
  };

  const updatePageTitle = (pageId: string, title: string) => {
    const nextPages = snapshotPages().map((page) => (page.id === pageId ? { ...page, title: title || "無題ページ" } : page));
    const nextNav = navItemsRef.current.map((item) =>
      item.type === "page" && item.pageId === pageId ? { ...item, title: title || item.title } : item
    );
    pagesRef.current = nextPages;
    navItemsRef.current = nextNav;
    setPages(nextPages);
    setNavItems(nextNav);
  };

  const deletePage = (pageId: string) => {
    if (pageId === defaultPageId) {
      toast.error("ホームは削除できません");
      return;
    }

    const nextPages = snapshotPages().filter((page) => page.id !== pageId);
    const nextNav = navItemsRef.current.filter((item) => item.pageId !== pageId);

    pagesRef.current = nextPages;
    navItemsRef.current = nextNav;
    setPages(nextPages);
    setNavItems(nextNav);

    if (activePageIdRef.current === pageId) {
      const home = nextPages.find((page) => page.id === defaultPageId) || nextPages[0];
      if (home && editorRef.current) {
        activePageIdRef.current = home.id;
        setActivePageId(home.id);
        setEditorToPage(editorRef.current, home);
      }
    }
  };

  const addExternalNav = () => {
    const next = [
      ...navItemsRef.current,
      { id: newId("nav"), title: "外部リンク", type: "url" as const, url: "https://", enabled: true },
    ];
    navItemsRef.current = next;
    setNavItems(next);
  };

  const updateNavItem = (id: string, patch: Partial<NavItem>) => {
    const next = navItemsRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item));
    navItemsRef.current = next;
    setNavItems(next);
  };

  const moveNavItem = (id: string, direction: -1 | 1) => {
    const items = [...navItemsRef.current];
    const index = items.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;

    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
    navItemsRef.current = items;
    setNavItems(items);
  };

  const removeNavItem = (id: string) => {
    const next = navItemsRef.current.filter((item) => item.id !== id);
    navItemsRef.current = next;
    setNavItems(next);
  };

  const saveDraft = () => {
    const updatedPages = snapshotPages();
    const draft = {
      pages: updatedPages,
      navItems: navItemsRef.current,
      activePageId: activePageIdRef.current,
      updatedAt: new Date().toISOString(),
    };

    saveMutation.mutate([
      { key: SITE_DRAFT_KEY, label: "公開ホームページ下書き", url: JSON.stringify(draft) },
      { key: LEGACY_DRAFT_KEY, label: "Dashboard draft", url: JSON.stringify(updatedPages.find((page) => page.id === defaultPageId)?.projectData || {}) },
    ]);
  };

  const publish = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const updatedPages = snapshotPages();
    const publishedPages = createPublishedPages(editor, updatedPages);
    const home = publishedPages.find((page) => page.id === defaultPageId) || publishedPages[0];

    const draft = {
      pages: updatedPages,
      navItems: navItemsRef.current,
      activePageId: activePageIdRef.current,
      updatedAt: new Date().toISOString(),
    };

    saveMutation.mutate([
      { key: SITE_DRAFT_KEY, label: "公開ホームページ下書き", url: JSON.stringify(draft) },
      {
        key: SITE_PUBLISHED_KEY,
        label: "公開ホームページ",
        url: JSON.stringify({
          pages: publishedPages,
          navItems: navItemsRef.current,
          updatedAt: new Date().toISOString(),
        }),
      },
      { key: LEGACY_PUBLISHED_KEY, label: "Dashboard published", url: JSON.stringify({ html: home?.html || "", css: home?.css || "" }) },
    ]);
  };

  const uploadMedia = async (file?: File) => {
    if (!file) return;
    pendingUploadMimeRef.current = file.type;

    uploadMutation.mutate({
      folder: "site-builder",
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
      <style>{`
        .simple-site-editor .gjs-block {
          width: 100%;
          min-height: 42px;
          margin: 0 0 8px;
          border-radius: 10px;
          border: 1px solid rgba(0,229,200,.25);
          background: rgba(255,255,255,.04);
          color: #eafffb;
          box-shadow: none;
        }
        .simple-site-editor .gjs-block:hover {
          border-color: rgba(0,229,200,.75);
          background: rgba(0,229,200,.08);
        }
        .simple-site-editor .gjs-block-label {
          font-size: 12px;
          font-weight: 700;
        }
        .simple-site-editor .gjs-category-title,
        .simple-site-editor .gjs-sm-sector-title,
        .simple-site-editor .gjs-trt-trait__label {
          background: transparent;
          color: #8ff7e9;
          font-weight: 800;
        }
        .simple-site-editor .gjs-field,
        .simple-site-editor .gjs-input-holder input,
        .simple-site-editor .gjs-trt-trait input,
        .simple-site-editor .gjs-trt-trait select {
          background: #081310;
          color: #fff;
          border-color: rgba(0,229,200,.22);
        }
        .simple-site-editor .gjs-cv-canvas {
          background: #dbe7e4;
        }
      `}</style>

      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-primary/30 px-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" title="戻る" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <strong className="block leading-tight">かんたんホームページ編集</strong>
            <span className="text-xs text-white/55">{activePage?.title || "ページ"}を編集中</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="元に戻す" onClick={() => editorRef.current?.runCommand("core:undo")}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="やり直す" onClick={() => editorRef.current?.runCommand("core:redo")}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="PC表示" onClick={() => editorRef.current?.setDevice("desktop")}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="スマホ表示" onClick={() => editorRef.current?.setDevice("mobile")}>
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="画像・動画追加" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </Button>
          <input ref={fileRef} hidden type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => uploadMedia(event.target.files?.[0])} />
          <Button variant="outline" onClick={saveDraft} disabled={!ready || saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            下書き保存
          </Button>
          <Button onClick={publish} disabled={!ready || saveMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            公開
          </Button>
          <Button variant="outline" onClick={() => window.open("/", "_blank")}>
            <Eye className="mr-2 h-4 w-4" />
            確認
          </Button>
        </div>
      </header>

      <div className="simple-site-editor grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="overflow-y-auto border-r border-primary/20 bg-[#07110f] p-3">
          <div className="mb-4 rounded-xl border border-primary/20 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-primary">ページ</p>
              <Button size="sm" variant="outline" onClick={addPage}>
                <Plus className="mr-1 h-3 w-3" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {pages.map((page) => (
                <div key={page.id} className={`rounded-lg border p-2 ${page.id === activePageId ? "border-primary bg-primary/10" : "border-white/10 bg-white/[.03]"}`}>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => switchPage(page.id)} className="min-w-0 flex-1 text-left text-sm font-bold">
                      {page.title}
                    </button>
                    {page.id !== defaultPageId && (
                      <button type="button" onClick={() => deletePage(page.id)} className="rounded p-1 text-white/45 hover:bg-red-500/15 hover:text-red-200">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {page.id === activePageId && (
                    <input
                      value={page.title}
                      onChange={(event) => updatePageTitle(page.id, event.target.value)}
                      className="mt-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                      placeholder="ページ名"
                    />
                  )}
                  <p className="mt-1 truncate text-[10px] text-white/45">{page.path}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-primary/20 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-primary">ナビ</p>
              <Button size="sm" variant="outline" onClick={addExternalNav}>
                <Link2 className="mr-1 h-3 w-3" />
                リンク
              </Button>
            </div>
            <div className="space-y-2">
              {navItems.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[.03] p-2">
                  <div className="mb-2 flex items-center gap-1">
                    <input
                      value={item.title}
                      onChange={(event) => updateNavItem(item.id, { title: event.target.value })}
                      className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                      placeholder="表示名"
                    />
                    <button type="button" onClick={() => moveNavItem(item.id, -1)} disabled={index === 0} className="rounded p-1 text-white/50 hover:bg-white/10 disabled:opacity-25">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => moveNavItem(item.id, 1)} disabled={index === navItems.length - 1} className="rounded p-1 text-white/50 hover:bg-white/10 disabled:opacity-25">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => removeNavItem(item.id)} className="rounded p-1 text-white/45 hover:bg-red-500/15 hover:text-red-200">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.type}
                      onChange={(event) => updateNavItem(item.id, { type: event.target.value as NavItem["type"] })}
                      className="w-20 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white"
                    >
                      <option value="page">ページ</option>
                      <option value="url">URL</option>
                    </select>

                    {item.type === "page" ? (
                      <select
                        value={item.pageId || defaultPageId}
                        onChange={(event) => updateNavItem(item.id, { pageId: event.target.value })}
                        className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white"
                      >
                        {pages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={item.url || ""}
                        onChange={(event) => updateNavItem(item.id, { url: event.target.value })}
                        className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white outline-none focus:border-primary"
                        placeholder="https://..."
                      />
                    )}

                    <label className="flex items-center gap-1 text-[11px] text-white/65">
                      <input type="checkbox" checked={item.enabled} onChange={(event) => updateNavItem(item.id, { enabled: event.target.checked })} />
                      表示
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-black/20 p-3">
            <p className="mb-2 text-xs font-black text-primary">部品を追加</p>
            <p className="mb-3 text-[11px] leading-relaxed text-white/55">部品を中央へドラッグ。文字はダブルクリック、画像・動画は上の追加ボタンで差し替えできます。</p>
            <div ref={blocksRef} />
          </div>
        </aside>

        <main className="min-w-0 bg-[#121817] p-3">
          <div ref={canvasRef} className="h-full overflow-hidden rounded-lg border border-primary/30 bg-white" />
        </main>

        <aside className="overflow-y-auto border-l border-primary/20 bg-[#07110f]">
          <div className="border-b border-primary/20 p-3">
            <p className="mb-2 text-xs font-black text-primary">選択中の内容・リンク</p>
            <p className="mb-3 text-[11px] leading-relaxed text-white/55">ボタンやリンクを選ぶと、URLを変更できます。画像や動画を選んでからアップロードすると差し替えになります。</p>
            <div ref={traitsRef} />
          </div>

          <div className="p-3">
            <p className="mb-2 text-xs font-black text-primary">見た目</p>
            <p className="mb-3 text-[11px] leading-relaxed text-white/55">文字サイズ、色、背景、余白、角丸、影などをここで変更します。</p>
            <div ref={stylesRef} />
          </div>
        </aside>
      </div>
    </div>
  );
}
