import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Layers, BookOpen, CheckSquare, FileText, Plus, Trash2, Edit, Upload, Save, X, ChevronDown, ChevronUp } from "lucide-react";

type Tab = "categories" | "procedures" | "checklists" | "documents";

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">管理者ログインが必要です</h2>
        <p className="text-muted-foreground">この機能にアクセスするにはログインしてください。</p>
        <Button onClick={() => { window.location.href = getLoginUrl(); }}>
          ログイン
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">アクセス権限がありません</h2>
        <p className="text-muted-foreground">管理者権限が必要です。</p>
        <p className="mono-sub">// ACCESS_DENIED</p>
      </div>
    );
  }

  const tabs = [
    { id: "categories" as Tab, label: "カテゴリ", icon: Layers },
    { id: "procedures" as Tab, label: "手順書", icon: BookOpen },
    { id: "checklists" as Tab, label: "チェックリスト", icon: CheckSquare },
    { id: "documents" as Tab, label: "資料", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="管理者パネル">管理者パネル</span>
        </h1>
        <p className="mono-sub">// ADMIN_PANEL</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "categories" && <CategoriesAdmin />}
      {activeTab === "procedures" && <ProceduresAdmin />}
      {activeTab === "checklists" && <ChecklistsAdmin />}
      {activeTab === "documents" && <DocumentsAdmin />}
    </div>
  );
}

// ===== CATEGORIES ADMIN =====
function CategoriesAdmin() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.categories.list.useQuery();
  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("カテゴリを作成しました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("カテゴリを更新しました"); setEditingId(null); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("カテゴリを削除しました"); },
    onError: (err) => toast.error(err.message),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
  };

  const startEdit = (cat: { id: number; name: string; description: string | null }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), description: editDescription.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          新規カテゴリ
        </h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="カテゴリ名"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? "作成中..." : "作成"}
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {categories?.map((cat) => (
            <div key={cat.id} className="cyber-border rounded-lg p-3 bg-card">
              {editingId === cat.id ? (
                <div className="space-y-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="説明"
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                      <Save className="h-3 w-3 mr-1" />{updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(cat)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate({ id: cat.id }); }}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== PROCEDURES ADMIN =====
function ProceduresAdmin() {
  const utils = trpc.useUtils();
  const { data: procedures, isLoading } = trpc.procedures.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const createMutation = trpc.procedures.create.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("手順書を作成しました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.procedures.update.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("手順書を更新しました"); setEditingId(null); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.procedures.delete.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("手順書を削除しました"); },
    onError: (err) => toast.error(err.message),
  });

  // Steps management
  const createStepMutation = trpc.procedureSteps.create.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("ステップを追加しました"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteStepMutation = trpc.procedureSteps.delete.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); utils.procedureSteps.list.invalidate(); toast.success("ステップを削除しました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateStepMutation = trpc.procedureSteps.update.useMutation({
    onSuccess: () => { utils.procedureSteps.list.invalidate(); toast.success("ステップを更新しました"); setEditingStepId(null); },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [expandedProcId, setExpandedProcId] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepImageUrl, setStepImageUrl] = useState("");
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepTitle, setEditStepTitle] = useState("");
  const [editStepDescription, setEditStepDescription] = useState("");
  const [editStepImageUrl, setEditStepImageUrl] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;
    createMutation.mutate({ categoryId: Number(categoryId), title: title.trim(), description: description.trim() || undefined, content: content.trim() || undefined });
    setTitle(""); setDescription(""); setContent("");
  };

  const startEdit = (proc: { id: number; title: string; description: string | null; content: string | null }) => {
    setEditingId(proc.id);
    setEditTitle(proc.title);
    setEditDescription(proc.description || "");
    setEditContent(proc.content || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, title: editTitle.trim(), description: editDescription.trim() || undefined, content: editContent.trim() || undefined });
  };

  // Get steps for expanded procedure
  const { data: stepsData } = trpc.procedureSteps.list.useQuery(
    { procedureId: expandedProcId! },
    { enabled: expandedProcId !== null }
  );

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedProcId || !stepTitle.trim()) return;
    const nextStepNum = (stepsData?.length ?? 0) + 1;
    createStepMutation.mutate({
      procedureId: expandedProcId,
      stepNumber: nextStepNum,
      title: stepTitle.trim(),
      description: stepDescription.trim() || undefined,
      imageUrl: stepImageUrl.trim() || undefined,
    });
    setStepTitle(""); setStepDescription(""); setStepImageUrl("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />新規手順書</h3>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required>
          <option value="">カテゴリを選択</option>
          {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
        </select>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="本文・内容（任意）" rows={3}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
        <Button type="submit" size="sm" disabled={createMutation.isPending}>{createMutation.isPending ? "作成中..." : "作成"}</Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {procedures?.map((proc) => (
            <div key={proc.id} className="cyber-border rounded-lg bg-card">
              {editingId === proc.id ? (
                <div className="p-3 space-y-2">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="説明"
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="本文" rows={3}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}><Save className="h-3 w-3 mr-1" />保存</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{proc.title}</p>
                      {proc.description && <p className="text-xs text-muted-foreground truncate">{proc.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setExpandedProcId(expandedProcId === proc.id ? null : proc.id)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="ステップ管理">
                        {expandedProcId === proc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => startEdit(proc)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate({ id: proc.id }); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Steps management */}
                  {expandedProcId === proc.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <p className="mono-sub">ステップ管理 // STEPS</p>
                      {stepsData && stepsData.length > 0 && (
                        <div className="space-y-1">
                          {stepsData.map((step) => (
                            <div key={step.id} className="p-2 rounded bg-muted/50">
                              {editingStepId === step.id ? (
                                <div className="space-y-1.5">
                                  <input type="text" value={editStepTitle} onChange={(e) => setEditStepTitle(e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  <input type="text" value={editStepDescription} onChange={(e) => setEditStepDescription(e.target.value)} placeholder="説明"
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  <input type="text" value={editStepImageUrl} onChange={(e) => setEditStepImageUrl(e.target.value)} placeholder="画像URL"
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => updateStepMutation.mutate({ id: step.id, title: editStepTitle.trim() || undefined, description: editStepDescription.trim() || undefined, imageUrl: editStepImageUrl.trim() || undefined })} disabled={updateStepMutation.isPending}>
                                      <Save className="h-3 w-3 mr-1" />保存
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingStepId(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-foreground"><span className="text-primary font-bold mr-1">{step.stepNumber}.</span>{step.title}</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingStepId(step.id); setEditStepTitle(step.title); setEditStepDescription(step.description || ""); setEditStepImageUrl(step.imageUrl || ""); }}
                                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                                      <Edit className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => { if (confirm("ステップを削除しますか？")) deleteStepMutation.mutate({ id: step.id }); }}
                                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={handleAddStep} className="space-y-2">
                        <input type="text" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} placeholder="ステップタイトル"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                        <input type="text" value={stepDescription} onChange={(e) => setStepDescription(e.target.value)} placeholder="説明（任意）"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <input type="text" value={stepImageUrl} onChange={(e) => setStepImageUrl(e.target.value)} placeholder="画像URL（任意）"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <Button type="submit" size="sm" disabled={createStepMutation.isPending}>
                          {createStepMutation.isPending ? "追加中..." : "ステップ追加"}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== CHECKLISTS ADMIN =====
function ChecklistsAdmin() {
  const utils = trpc.useUtils();
  const { data: checklists, isLoading } = trpc.checklists.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const createMutation = trpc.checklists.create.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("チェックリストを作成しました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.checklists.update.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("チェックリストを更新しました"); setEditingId(null); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.checklists.delete.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("チェックリストを削除しました"); },
    onError: (err) => toast.error(err.message),
  });
  const createItemMutation = trpc.checklistItems.create.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("項目を追加しました"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteItemMutation = trpc.checklistItems.delete.useMutation({
    onSuccess: () => { utils.checklists.list.invalidate(); toast.success("項目を削除しました"); },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemContent, setItemContent] = useState("");

  const { data: itemsData } = trpc.checklistItems.list.useQuery(
    { checklistId: expandedId! },
    { enabled: expandedId !== null }
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;
    createMutation.mutate({ categoryId: Number(categoryId), title: title.trim(), description: description.trim() || undefined });
    setTitle(""); setDescription("");
  };

  const startEdit = (cl: { id: number; title: string; description: string | null }) => {
    setEditingId(cl.id);
    setEditTitle(cl.title);
    setEditDescription(cl.description || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, title: editTitle.trim(), description: editDescription.trim() || undefined });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedId || !itemContent.trim()) return;
    createItemMutation.mutate({ checklistId: expandedId, content: itemContent.trim() });
    setItemContent("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />新規チェックリスト</h3>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required>
          <option value="">カテゴリを選択</option>
          {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
        </select>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <Button type="submit" size="sm" disabled={createMutation.isPending}>{createMutation.isPending ? "作成中..." : "作成"}</Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {checklists?.map((cl) => (
            <div key={cl.id} className="cyber-border rounded-lg bg-card">
              {editingId === cl.id ? (
                <div className="p-3 space-y-2">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="説明"
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}><Save className="h-3 w-3 mr-1" />保存</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{cl.title}</p>
                      {cl.description && <p className="text-xs text-muted-foreground truncate">{cl.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setExpandedId(expandedId === cl.id ? null : cl.id)}
                        className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="項目管理">
                        {expandedId === cl.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => startEdit(cl)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate({ id: cl.id }); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {expandedId === cl.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <p className="mono-sub">チェック項目 // ITEMS</p>
                      {itemsData && itemsData.length > 0 && (
                        <div className="space-y-1">
                          {itemsData.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <span className="text-xs text-foreground">{item.content}</span>
                              <button onClick={() => { if (confirm("項目を削除しますか？")) deleteItemMutation.mutate({ id: item.id }); }}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={handleAddItem} className="flex gap-2">
                        <input type="text" value={itemContent} onChange={(e) => setItemContent(e.target.value)} placeholder="チェック項目"
                          className="flex-1 px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                        <Button type="submit" size="sm" disabled={createItemMutation.isPending}>追加</Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== DOCUMENTS ADMIN =====
function DocumentsAdmin() {
  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("資料をアップロードしました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("資料を更新しました"); setEditingId(null); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("資料を削除しました"); },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        categoryId: Number(categoryId), title: title.trim(), description: description.trim() || undefined,
        fileName: file.name, fileData: base64, mimeType: file.type || undefined, fileSize: file.size,
      });
      setTitle(""); setDescription(""); setFile(null);
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (doc: { id: number; title: string; description: string | null }) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, title: editTitle.trim(), description: editDescription.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />資料アップロード</h3>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required>
          <option value="">カテゴリを選択</option>
          {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
        </select>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="資料タイトル"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/20 file:text-primary"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" required />
        {file && <p className="text-xs text-muted-foreground">選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        <Button type="submit" size="sm" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "アップロード中..." : "アップロード"}</Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {documents?.map((doc) => (
            <div key={doc.id} className="cyber-border rounded-lg p-3 bg-card">
              {editingId === doc.id ? (
                <div className="space-y-2">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="説明"
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}><Save className="h-3 w-3 mr-1" />保存</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" />キャンセル</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(doc)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm("削除しますか？")) deleteMutation.mutate({ id: doc.id }); }}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
