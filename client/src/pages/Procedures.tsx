import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Link as LinkIcon, ListTree } from "lucide-react";
import { trpc } from "@/lib/trpc";

const CATEGORY_COLORS = [
  { text: "text-cyan-400", border: "border-cyan-400" },
  { text: "text-purple-400", border: "border-purple-400" },
  { text: "text-amber-400", border: "border-amber-400" },
  { text: "text-emerald-400", border: "border-emerald-400" },
  { text: "text-pink-400", border: "border-pink-400" },
];
function getGroupColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function normalizeUrl(url?: string | null) {
  const value = url?.trim();

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export default function Procedures() {
  const { data: procedures = [], isLoading } = trpc.procedures.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  const categorizedProcedures = categories
    .map((category) => ({
      ...category,
      items: procedures.filter((item) => item.categoryId === category.id),
    }))
    .filter((category) => category.items.length > 0);

  const uncategorizedProcedures = procedures.filter(
    (item) => !categories.some((category) => category.id === item.categoryId)
  );

  const procedureGroups = useMemo(
    () => [
      ...categorizedProcedures,
      ...(uncategorizedProcedures.length > 0
        ? [{ id: 0, name: "未分類", items: uncategorizedProcedures }]
        : []),
    ],
    [categorizedProcedures, uncategorizedProcedures]
  );

  const groupKey = procedureGroups.map((group) => group.id).join(",");

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      procedureGroups.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = false;
        }
      });

      return next;
    });
  }, [groupKey]);

  const toggleGroup = (groupId: number) => {
    setOpenGroups((current) => {
      const isCurrentlyOpen = current[groupId] ?? false;
      const next: Record<number, boolean> = {};
      procedureGroups.forEach((group) => {
        next[group.id] = false;
      });
      next[groupId] = !isCurrentlyOpen;
      return next;
    });
  };

  const openAndScrollToGroup = (groupId: number) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: true,
    }));

    window.requestAnimationFrame(() => {
      document
        .getElementById(`smartboarding-category-${groupId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Smartboarding">Smartboarding</span>
        </h1>
        <p className="mono-sub">// SMARTBOARDING_LINKS</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-20" />
          ))}
        </div>
      ) : procedures.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <nav className="cyber-border rounded-lg bg-card p-3 space-y-2 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ListTree className="h-4 w-4 text-primary" />
              目次
            </div>
            <div className="space-y-1">
              {procedureGroups.map((group, groupIndex) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => openAndScrollToGroup(group.id)}
                  className={`w-full text-left flex items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary border-l-4 ${getGroupColor(groupIndex).border}`}
                >
                  <span>{group.name}</span>
                  <span className="text-xs opacity-70">{group.items.length}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="space-y-5">
            {procedureGroups.map((group, groupIndex) => {
              const isOpen = openGroups[group.id] ?? false;

              return (
                <section
                  key={group.id}
                  id={`smartboarding-category-${group.id}`}
                  className="space-y-2 scroll-mt-4"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full cyber-border rounded-lg bg-card px-4 py-3 flex items-center justify-between text-left hover:bg-primary/10 transition-colors border-l-4 ${getGroupColor(groupIndex).border}`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={`h-4 w-4 ${getGroupColor(groupIndex).text} transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                      <h2 className="text-lg font-bold text-foreground">{group.name}</h2>
                      <span className="text-xs text-muted-foreground">{group.items.length}件</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isOpen ? "閉じる" : "開く"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="grid gap-3">
                      {group.items.map((item) => {
                        const url = normalizeUrl(item.description);

                        return (
                          <a
                            key={item.id}
                            href={url || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`cyber-border rounded-lg p-4 bg-card text-left transition-all group flex items-center justify-between ${
                              url ? "hover:bg-card/80" : "opacity-60 pointer-events-none"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <LinkIcon className={`h-5 w-5 ${getGroupColor(groupIndex).text} shrink-0`} />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {item.title}
                                </h3>
                                {!url && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    リンクURLが未設定です
                                  </p>
                                )}
                              </div>
                            </div>

                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Smartboardingリンクが登録されていません</p>
          <p className="mono-sub mt-2">// NO_SMARTBOARDING_LINKS_FOUND</p>
        </div>
      )}
    </div>
  );
}

