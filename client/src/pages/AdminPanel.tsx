import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Layers, BookOpen, CheckSquare, FileText, Plus, Trash2, Edit, Upload, Save, X, ChevronDown, ChevronUp, ListTree, Users, RefreshCw } from "lucide-react";

type Tab = "categories" | "procedures" | "checklists" | "documents" | "admins" | "online";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PasswordLoginForm() {
  const [password, setPassword] = useState("");
  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("ログインしました");
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err.message ?? "ログインに失敗しました");
    },
  });

  return (
    <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-foreground">管理者ログイン</h2>
      <p className="text-muted-foreground text-sm">// ADMIN_ACCESS</p>
      <input
        type="password"
        placeholder="パスワードを入力"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ password })}
        className="w-full px-4 py-2 rounded bg-muted text-foreground border border-border focus:outline-none focus:border-primary"
      />
      <Button
        className="w-full"
        onClick={() => loginMutation.mutate({ password })}
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? "ログイン中..." : "ログイン"}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => { window.location.href = "/app-auth"; }}
      >
        社員Googleアカウントでログイン
      </Button>
      <p className="text-xs text-muted-foreground">@tx-inc.com のアカウントのみ利用できます。</p>
    </div>
  );
}

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
    return <PasswordLoginForm />;
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
    { id: "procedures" as Tab, label: "Smartboarding", icon: BookOpen },
    { id: "checklists" as Tab, label: "チェックリスト", icon: CheckSquare },
    { id: "documents" as Tab, label: "資料", icon: FileText },
    { id: "admins" as Tab, label: "管理者", icon: FileText },
    { id: "online" as Tab, label: "オンライン", icon: Users },
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
      {activeTab === "admins" && <AdminUsersAdmin />}
      {activeTab === "online" && <OnlineUsersAdmin />}
    </div>
  );
}

function OnlineUsersAdmin() {
  const { data: users = [], isLoading, refetch, isFetching } = trpc.onlineUsers.list.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <section className="cyber-border rounded-lg bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">現在ログイン中</h2>
          <p className="text-xs text-muted-foreground">直近2分以内に通信したユーザーを表示します。</p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {isLoading ? (
        <div className="h-24 rounded bg-muted animate-pulse" />
      ) : users.length === 0 ? (
        <div className="rounded border border-border bg-background p-5 text-sm text-muted-foreground">オンラインユーザーはいません。</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="p-2">状態</th><th className="p-2">名前</th><th className="p-2">メール</th><th className="p-2">権限</th><th className="p-2">最終通信</th></tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.openId} className="border-t border-border">
                  <td className="p-2"><span className="inline-flex items-center gap-2 font-semibold text-cyber-green"><span className="h-2 w-2 rounded-full bg-cyber-green" />オンライン</span></td>
                  <td className="p-2 font-medium text-foreground">{item.name || "-"}</td>
                  <td className="p-2 text-muted-foreground">{item.email || "管理者パスワード"}</td>
                  <td className="p-2">{item.role === "admin" ? "管理者" : "ユーザー"}</td>
                  <td className="p-2 whitespace-nowrap text-muted-foreground">{new Date(item.lastActiveAt).toLocaleString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="リンクURL"
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
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="リンクURL"
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

// ===== SMARTBOARDING ADMIN =====
function ProceduresAdmin() {
  const utils = trpc.useUtils();
  const { data: procedures, isLoading } = trpc.procedures.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const createMutation = trpc.procedures.create.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("Smartboardingリンクを作成しました"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.procedures.update.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("Smartboardingリンクを更新しました"); setEditingId(null); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.procedures.delete.useMutation({
    onSuccess: () => { utils.procedures.list.invalidate(); toast.success("Smartboardingリンクを削除しました"); },
    onError: (err) => toast.error(err.message),
  });
  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const updateCategoryMutation = trpc.categories.update.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("目次を更新しました"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteCategoryMutation = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); utils.procedures.list.invalidate(); toast.success("目次を削除しました"); },
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
  const uploadAssetMutation = trpc.assets.upload.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const [createRows, setCreateRows] = useState([
    { id: 1, categoryId: "" as number | "", title: "", description: "", content: "", file: null as File | null },
  ]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | "">("");
  const [expandedProcId, setExpandedProcId] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepImageUrl, setStepImageUrl] = useState("");
  const [stepFile, setStepFile] = useState<File | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepTitle, setEditStepTitle] = useState("");
  const [editStepDescription, setEditStepDescription] = useState("");
  const [editStepImageUrl, setEditStepImageUrl] = useState("");
  const [editStepFile, setEditStepFile] = useState<File | null>(null);

  const updateCreateRow = (
    rowId: number,
    field: "categoryId" | "title" | "description" | "content" | "file",
    value: number | "" | string | File | null
  ) => {
    setCreateRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const addCreateRow = () => {
    setCreateRows((rows) => [
      ...rows,
      { id: Date.now(), categoryId: "", title: "", description: "", content: "", file: null },
    ]);
  };

  const removeCreateRow = (rowId: number) => {
    setCreateRows((rows) => rows.filter((row) => row.id !== rowId));
  };

  const createSmartboardingCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    createCategoryMutation.mutate({ name });
    setNewCategoryName("");
  };

  const startCategoryEdit = (category: { id: number; name: string }) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  };

  const saveCategoryEdit = () => {
    if (!editingCategoryId || !editCategoryName.trim()) return;

    updateCategoryMutation.mutate({ id: editingCategoryId, name: editCategoryName.trim() });
    setEditingCategoryId(null);
    setEditCategoryName("");
  };

  const handleCreate = async (e: React.FormEvent, rowId: number) => {
    e.preventDefault();
    const row = createRows.find((item) => item.id === rowId);
    if (!row?.title.trim() || row.categoryId === "") return;

    createMutation.mutate({
      categoryId: row.categoryId,
      title: row.title.trim(),
      description: row.description.trim() || undefined,
      content: row.content.trim() || undefined,
    });

    setCreateRows((rows) =>
      rows.map((item) =>
        item.id === rowId ? { ...item, title: "", description: "", content: "", file: null } : item
      )
    );
  };

  const startEdit = (proc: { id: number; categoryId: number; title: string; description: string | null; content: string | null }) => {
    setEditingId(proc.id);
    setEditCategoryId(proc.categoryId);
    setEditTitle(proc.title);
    setEditDescription(proc.description || "");
    setEditContent(proc.content || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editTitle.trim()) return;
    updateMutation.mutate({
      id: editingId,
      categoryId: editCategoryId === "" ? undefined : editCategoryId,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      content: editContent.trim() || undefined,
    });
  };

  // Get steps for expanded procedure
  const { data: stepsData } = trpc.procedureSteps.list.useQuery(
    { procedureId: expandedProcId! },
    { enabled: expandedProcId !== null }
  );

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedProcId || !stepTitle.trim()) return;
    const nextStepNum = (stepsData?.length ?? 0) + 1;
    let uploadedUrl = stepImageUrl.trim();
    if (stepFile) {
      const uploaded = await uploadAssetMutation.mutateAsync({
        folder: "procedures",
        fileName: stepFile.name,
        fileData: await fileToBase64(stepFile),
        mimeType: stepFile.type || undefined,
      });
      uploadedUrl = uploaded.url;
    }
    createStepMutation.mutate({
      procedureId: expandedProcId,
      stepNumber: nextStepNum,
      title: stepTitle.trim(),
      description: stepDescription.trim() || undefined,
      imageUrl: uploadedUrl || undefined,
    });
    setStepTitle(""); setStepDescription(""); setStepImageUrl(""); setStepFile(null);
    const input = document.getElementById("procedure-step-file") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleUpdateStep = async (stepId: number) => {
    let uploadedUrl = editStepImageUrl.trim();
    if (editStepFile) {
      const uploaded = await uploadAssetMutation.mutateAsync({
        folder: "procedures",
        fileName: editStepFile.name,
        fileData: await fileToBase64(editStepFile),
        mimeType: editStepFile.type || undefined,
      });
      uploadedUrl = uploaded.url;
    }
    updateStepMutation.mutate({
      id: stepId,
      title: editStepTitle.trim() || undefined,
      description: editStepDescription.trim() || undefined,
      imageUrl: uploadedUrl || undefined,
    });
    setEditStepFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><ListTree className="h-4 w-4 text-primary" />Smartboarding目次</h3>
        <form onSubmit={createSmartboardingCategory} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="目次名を追加（例：HW、SW、作業一般）"
            className="min-w-0 flex-1 px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button type="submit" size="sm" disabled={createCategoryMutation.isPending}>追加</Button>
        </form>
        <div className="grid gap-2 md:grid-cols-2">
          {categories?.map((category) => (
            <div key={category.id} className="rounded-md border border-border/70 bg-muted/20 p-2">
              {editingCategoryId === category.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="min-w-0 flex-1 px-2 py-1 rounded bg-input border border-border text-sm text-foreground"
                  />
                  <Button type="button" size="sm" onClick={saveCategoryEdit} disabled={updateCategoryMutation.isPending}>保存</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingCategoryId(null)}>取消</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => startCategoryEdit(category)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`${category.name} を削除しますか？`)) deleteCategoryMutation.mutate({ id: category.id }); }}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />新規Smartboarding</h3>
          <Button type="button" size="sm" variant="outline" onClick={addCreateRow}>
            <Plus className="h-4 w-4" />
            入力欄を追加
          </Button>
        </div>

        {createRows.map((row, index) => (
          <form key={row.id} onSubmit={(e) => handleCreate(e, row.id)} className="space-y-3 rounded-md border border-border/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">作成欄 {index + 1}</p>
              {createRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCreateRow(row.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  削除
                </button>
              )}
            </div>
            <select value={row.categoryId} onChange={(e) => updateCreateRow(row.id, "categoryId", e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">追加先の目次を選択</option>
              {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categories?.length === 0 && (
              <p className="text-xs text-muted-foreground">先に上の「Smartboarding目次」で HW / SW / 作業一般 などを追加してください。</p>
            )}
            <input type="text" value={row.title} onChange={(e) => updateCreateRow(row.id, "title", e.target.value)} placeholder="表示名"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={row.description} onChange={(e) => updateCreateRow(row.id, "description", e.target.value)} placeholder="リンクURL"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <textarea value={row.content} onChange={(e) => updateCreateRow(row.id, "content", e.target.value)} placeholder="メモ（任意）" rows={3}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
            <input id={`procedure-main-file-${row.id}`} type="file" onChange={(e) => updateCreateRow(row.id, "file", e.target.files?.[0] ?? null)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/20 file:text-primary" />
            {row.file && <p className="text-xs text-muted-foreground">選択中: {row.file.name} ({(row.file.size / 1024).toFixed(1)} KB)</p>}
            <Button type="submit" size="sm" disabled={createMutation.isPending || row.categoryId === ""}>{createMutation.isPending ? "作成中..." : "作成"}</Button>
          </form>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {procedures?.map((proc) => (
            <div key={proc.id} className="cyber-border rounded-lg bg-card">
              {editingId === proc.id ? (
                <div className="p-3 space-y-2">
                  <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">目次を選択</option>
                    {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="リンクURL"
                    className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="使用しません" rows={3}
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
                                  <input type="text" value={editStepDescription} onChange={(e) => setEditStepDescription(e.target.value)} placeholder="リンクURL"
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  <input type="text" value={editStepImageUrl} onChange={(e) => setEditStepImageUrl(e.target.value)} placeholder="画像URL"
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  <input type="file" onChange={(e) => setEditStepFile(e.target.files?.[0] ?? null)}
                                    className="w-full px-2 py-1 rounded bg-input border border-border text-foreground text-xs file:mr-2 file:rounded file:border-0 file:bg-primary/20 file:text-primary" />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => handleUpdateStep(step.id)} disabled={updateStepMutation.isPending || uploadAssetMutation.isPending}>
                                      <Save className="h-3 w-3 mr-1" />保存
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingStepId(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-foreground"><span className="text-primary font-bold mr-1">{step.stepNumber}.</span>{step.title}</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingStepId(step.id); setEditStepTitle(step.title); setEditStepDescription(step.description || ""); setEditStepImageUrl(step.imageUrl || ""); setEditStepFile(null); }}
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
                        <input type="text" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} placeholder="ステップ表示名"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <input type="text" value={stepDescription} onChange={(e) => setStepDescription(e.target.value)} placeholder="リンクURL"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <input type="text" value={stepImageUrl} onChange={(e) => setStepImageUrl(e.target.value)} placeholder="画像URL（任意）"
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <input id="procedure-step-file" type="file" onChange={(e) => setStepFile(e.target.files?.[0] ?? null)}
                          className="w-full px-2 py-1.5 rounded bg-input border border-border text-foreground text-xs file:mr-2 file:rounded file:border-0 file:bg-primary/20 file:text-primary" />
                        <Button type="submit" size="sm" disabled={createStepMutation.isPending || uploadAssetMutation.isPending}>
                          {createStepMutation.isPending || uploadAssetMutation.isPending ? "追加中..." : "ステップ追加"}
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
    onSuccess: () => {
      utils.checklists.list.invalidate();
      toast.success("チェックリストを作成しました");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.checklists.update.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate();
      toast.success("チェックリストを更新しました");
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.checklists.delete.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate();
      toast.success("チェックリストを削除しました");
    },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadedPdfMap, setUploadedPdfMap] = useState<Record<string, { fileName: string; fileUrl: string }>>({});

  const normalizeChecklistUrl = (url?: string | null) => {
    const value = url?.trim();

    if (!value) return "";
    if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) return value;

    return `https://${value}`;
  };

  const isPdfUrl = (url: string) => /\.pdf($|[?#])/i.test(url);

  const getPdfUrl = (cl: any) => {
    const uploaded = uploadedPdfMap[String(cl.id)];
    if (uploaded?.fileUrl) return normalizeChecklistUrl(uploaded.fileUrl);

    const fileUrl = normalizeChecklistUrl(cl.fileUrl);
    if (fileUrl) return fileUrl;

    const descriptionUrl = normalizeChecklistUrl(cl.description);
    if (descriptionUrl && isPdfUrl(descriptionUrl)) return descriptionUrl;

    return "";
  };

  const getPdfName = (cl: any) => {
    return uploadedPdfMap[String(cl.id)]?.fileName || cl.fileName || "";
  };

  const uploadChecklistPdf = async (checklistId: number | string, file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDFファイルを選択してください");
      return null;
    }

    setUploadingId(String(checklistId));

    try {
      const response = await fetch(`/api/checklists/${encodeURIComponent(String(checklistId))}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl: await fileToBase64(file),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "PDFアップロードに失敗しました");
      }

      const updated = await response.json();

      setUploadedPdfMap((current) => ({
        ...current,
        [String(checklistId)]: {
          fileName: updated.fileName || file.name,
          fileUrl: updated.fileUrl,
        },
      }));

      await utils.checklists.list.invalidate();
      toast.success("印刷用PDFをアップロードしました");

      return updated;
    } catch (error: any) {
      toast.error(error.message ?? "PDFアップロードに失敗しました");
      return null;
    } finally {
      setUploadingId(null);
    }
  };

  const printPdf = (pdfUrl: string) => {
    if (!pdfUrl) {
      toast.error("印刷用PDFが未アップロードです");
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = pdfUrl;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0.01";
    iframe.style.border = "0";
    iframe.style.pointerEvents = "none";

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }

        setTimeout(() => iframe.remove(), 5000);
      }, 800);
    };

    document.body.appendChild(iframe);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || categoryId === "") return;

    try {
      const created = await createMutation.mutateAsync({
        categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      const createdId = (created as any)?.id;

      if (checklistFile && createdId) {
        await uploadChecklistPdf(createdId, checklistFile);
      }

      setTitle("");
      setDescription("");
      setCategoryId("");
      setChecklistFile(null);

      const fileInput = document.getElementById("checklist-main-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch {
      // createMutation側のonErrorで表示
    }
  };

  const startEdit = (cl: { id: number | string; title: string; description: string | null }) => {
    setEditingId(cl.id);
    setEditTitle(cl.title);
    setEditDescription(cl.description || "");
  };

  const handleUpdate = () => {
    if (!editingId || !editTitle.trim()) return;

    updateMutation.mutate({
      id: editingId as any,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  const handleExistingPdfUpload = async (cl: any, file?: File | null) => {
    if (!file) return;
    await uploadChecklistPdf(cl.id, file);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          新規チェックリスト
        </h3>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="表示名"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="リンクURL"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          required
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">カテゴリを選択</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          id="checklist-main-file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setChecklistFile(e.target.files?.[0] ?? null)}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/20 file:text-primary"
        />

        {checklistFile && (
          <p className="text-xs text-muted-foreground">
            選択中: {checklistFile.name} ({(checklistFile.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <Button type="submit" size="sm" disabled={createMutation.isPending || !!uploadingId}>
          {createMutation.isPending || uploadingId === "new" ? "作成中..." : "作成"}
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {checklists?.map((rawCl: any) => {
            const cl = rawCl as any;
            const pdfUrl = getPdfUrl(cl);
            const pdfName = getPdfName(cl);
            const isUploading = uploadingId === String(cl.id);

            return (
              <div key={cl.id} className="cyber-border rounded-lg bg-card">
                {editingId === cl.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />

                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="リンクURL"
                      className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                        <Save className="h-3 w-3 mr-1" />
                        保存
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{cl.title}</p>

                        {cl.description && (
                          <p className="text-xs text-muted-foreground truncate">{cl.description}</p>
                        )}

                        {pdfUrl ? (
                          <p className="text-xs text-primary truncate">
                            印刷用PDF: {pdfName || "アップロード済み"}
                          </p>
                        ) : (
                          <p className="text-xs text-yellow-400">
                            印刷用PDFが未アップロードです
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary">
                          <Upload className="h-3 w-3 mr-1" />
                          {isUploading ? "アップロード中" : "PDFアップロード"}
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => handleExistingPdfUpload(cl, e.target.files?.[0] ?? null)}
                          />
                        </label>

                        <button
                          type="button"
                          disabled={!pdfUrl}
                          onClick={() => printPdf(pdfUrl)}
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
                          title="印刷"
                        >
                          印刷
                        </button>

                        <button
                          type="button"
                          onClick={() => startEdit(cl)}
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("削除しますか？")) deleteMutation.mutate({ id: cl.id as any });
                          }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || categoryId === "" || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        categoryId, title: title.trim(), description: description.trim() || undefined,
        fileName: file.name, fileData: base64, mimeType: file.type || undefined, fileSize: file.size,
      });
      setTitle(""); setDescription(""); setCategoryId(""); setFile(null);
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
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="資料表示名"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="リンクURL"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")} required
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">カテゴリを選択</option>
          {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/20 file:text-primary"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" />
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
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="リンクURL"
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

function AdminUsersAdmin() {
  const [email, setEmail] = useState("");
  const { data: adminEmails = [], isLoading, refetch } = trpc.adminUsers.list.useQuery();

  const addMutation = trpc.adminUsers.add.useMutation({
    onSuccess: () => {
      toast.success("管理者メールを追加しました");
      setEmail("");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMutation = trpc.adminUsers.remove.useMutation({
    onSuccess: () => {
      toast.success("管理者メールを削除しました");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    addMutation.mutate({ email: trimmedEmail });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          管理者メール追加
        </h3>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@tx-inc.com"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
           
          />

          <Button type="submit" size="sm" disabled={addMutation.isPending}>
            {addMutation.isPending ? "追加中..." : "管理者に追加"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ここに追加したメールアドレスでGoogleログインしたユーザーが管理者になります。
        </p>
      </form>

      <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold text-foreground">管理者メール一覧</h3>

        {isLoading ? (
          <div className="h-14 bg-muted rounded animate-pulse" />
        ) : adminEmails.length === 0 ? (
          <p className="text-sm text-muted-foreground">管理者メールは未登録です。</p>
        ) : (
          <div className="space-y-2">
            {adminEmails.map((admin) => (
              <div
                key={admin.email}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{admin.email}</p>
                  {admin.protected && (
                    <p className="text-xs text-muted-foreground">初期管理者</p>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={admin.protected || removeMutation.isPending}
                  onClick={() => {
                    if (confirm(`${admin.email} を管理者から削除しますか？`)) {
                      removeMutation.mutate({ email: admin.email });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  削除
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}






















