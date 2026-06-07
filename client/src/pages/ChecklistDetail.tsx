import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckSquare, ExternalLink, Square } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useCallback } from "react";

function getStorageKey(checklistId: number) {
  return `checklist-progress-${checklistId}`;
}

function loadCheckedItems(checklistId: number): Set<number> {
  try {
    const stored = localStorage.getItem(getStorageKey(checklistId));
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveCheckedItems(checklistId: number, items: Set<number>) {
  localStorage.setItem(getStorageKey(checklistId), JSON.stringify(Array.from(items)));
}

function splitAttachment(content: string) {
  const match = content.match(/\n添付:\s*(\S+)$/);
  if (!match) return { text: content, url: "" };
  return {
    text: content.slice(0, match.index).trim(),
    url: match[1],
  };
}

export default function ChecklistDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: checklist, isLoading } = trpc.checklists.getById.useQuery({ id });
  const [, setLocation] = useLocation();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => loadCheckedItems(id));

  // Sync to localStorage whenever checkedItems changes
  useEffect(() => {
    saveCheckedItems(id, checkedItems);
  }, [id, checkedItems]);

  const toggleItem = useCallback((itemId: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const totalItems = checklist?.items?.length ?? 0;
  const completedItems = checkedItems.size;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const resetProgress = () => {
    setCheckedItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="cyber-border rounded-lg p-8 bg-card text-center">
        <p className="text-muted-foreground">チェックリストが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setLocation("/checklists")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>チェックリスト一覧に戻る</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">{checklist.title}</h1>
        {checklist.description && (
          <p className="text-sm text-muted-foreground">{checklist.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="cyber-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-2">
          <span className="mono-sub">進捗 // PROGRESS</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">{progress}%</span>
            {completedItems > 0 && (
              <button
                onClick={resetProgress}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                リセット
              </button>
            )}
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedItems} / {totalItems} 項目完了
        </p>
      </div>

      {/* Checklist Items */}
      {checklist.items && checklist.items.length > 0 ? (
        <div className="space-y-2">
          {checklist.items.map((item) => {
            const isChecked = checkedItems.has(item.id);
            const attachment = splitAttachment(item.content);
            return (
              <div
                key={item.id}
                className={`w-full cyber-border rounded-lg p-4 bg-card text-left transition-all flex items-start gap-3 ${
                  isChecked ? "border-cyber-green/40 bg-cyber-green/5" : "hover:bg-card/80"
                }`}
              >
                <button onClick={() => toggleItem(item.id)} className="mt-0.5">
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 text-cyber-green shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => toggleItem(item.id)} className="block text-left">
                    <span className={`text-sm whitespace-pre-wrap ${isChecked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {attachment.text}
                    </span>
                  </button>
                  {attachment.url && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      添付ファイルを開く
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <p className="text-muted-foreground">チェック項目がありません</p>
        </div>
      )}
    </div>
  );
}
