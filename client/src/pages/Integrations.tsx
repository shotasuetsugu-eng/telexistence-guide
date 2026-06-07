import { ExternalLink, Link as LinkIcon, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type LinkKey =
  | "shiftFs"
  | "shiftTs"
  | "storeList"
  | "dashboardProd"
  | "dashboardStg"
  | "autailProd"
  | "autailStg";

type LinkItem = {
  key: LinkKey;
  label: string;
  url: string;
};

const defaultLinks: Record<LinkKey, { title: string; label: string; url: string }> = {
  shiftFs: { title: "Shift FS", label: "FS", url: "" },
  shiftTs: { title: "Shift TS", label: "TS", url: "" },
  storeList: { title: "店舗一覧", label: "店舗一覧", url: "" },
  dashboardProd: { title: "Dashboard PROD", label: "PROD", url: "https://portal.telexistence.org/stores" },
  dashboardStg: { title: "Dashboard STG", label: "STG", url: "https://stg.portal.telexistence.org/stores" },
  autailProd: { title: "Autail PROD", label: "PROD", url: "https://retail.telexistence.org/deployment" },
  autailStg: { title: "Autail STG", label: "STG", url: "https://retail.stg.telexistence.org/deployment" },
};

const keys = Object.keys(defaultLinks) as LinkKey[];

function normalizeUrl(url: string) {
  const value = url.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export default function Integrations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.linkSettings.list.useQuery();

  const saveMutation = trpc.linkSettings.save.useMutation({
    onSuccess: async () => {
      await utils.linkSettings.list.invalidate();
      toast.success("リンク設定を保存しました");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const initialLinks = useMemo(() => {
    const map = new Map<string, { label: string; url: string }>();
    data.forEach((item) => map.set(item.key, { label: item.label, url: item.url }));

    return keys.reduce((acc, key) => {
      const saved = map.get(key);
      acc[key] = {
        key,
        label: saved?.label || defaultLinks[key].label,
        url: saved?.url || defaultLinks[key].url,
      };
      return acc;
    }, {} as Record<LinkKey, LinkItem>);
  }, [data]);

  const [links, setLinks] = useState<Record<LinkKey, LinkItem>>(() => {
    return keys.reduce((acc, key) => {
      acc[key] = { key, label: defaultLinks[key].label, url: defaultLinks[key].url };
      return acc;
    }, {} as Record<LinkKey, LinkItem>);
  });

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const updateLink = (key: LinkKey, field: "label" | "url", value: string) => {
    setLinks((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const openLink = (key: LinkKey) => {
    const url = normalizeUrl(links[key].url);
    if (!url) {
      toast.error("URLが未設定です");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSave = () => {
    const saveKeys: LinkKey[] = ["dashboardProd", "dashboardStg", "autailProd", "autailStg"];
    const items = saveKeys.map((key) => ({
      key,
      label: links[key].label,
      url: normalizeUrl(links[key].url),
    }));

    saveMutation.mutate(items);
  };

  const groups: Array<{ title: string; items: LinkKey[] }> = [
  { title: "Dashboard", items: ["dashboardProd", "dashboardStg"] },
  { title: "Autail", items: ["autailProd", "autailStg"] },
];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Integrations">Integrations</span>
        </h1>
        <p className="mono-sub">// DB_LINK_SETTINGS</p>
      </div>

      <div className="cyber-border rounded-lg bg-card p-4 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          外部リンク設定
        </h2>

        {!isAdmin && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            管理者のみ保存できます。表示内容はDBに保存された共通リンクです。
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.title} className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {group.title}
                </h3>

                {group.items.map((key) => (
                  <div key={key} className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                    <input
                      value={links[key]?.label || ""}
                      onChange={(event) => updateLink(key, "label", event.target.value)}
                      disabled={!isAdmin}
                      className="px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm disabled:opacity-70"
                      placeholder="表示名"
                    />
                    <input
                      value={links[key]?.url || ""}
                      onChange={(event) => updateLink(key, "url", event.target.value)}
                      disabled={!isAdmin}
                      className="px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm disabled:opacity-70"
                      placeholder="URL"
                    />
                    <Button type="button" variant="outline" onClick={() => openLink(key)}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      開く
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={!isAdmin || saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}

