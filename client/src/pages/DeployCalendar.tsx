import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, Download, Plus, Sun, Trash2, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DeploySchedule = {
  id: number;
  deployDate: string;
  storeName: string;
  area: string;
  chain: string;
  workType: string;
  description: string;
  members: string[];
  startTime: string | null;
  completedAt: string | null;
  memo: string;
};

type DeployForm = Omit<DeploySchedule, "id" | "members" | "completedAt"> & {
  membersText: string;
};

type DeployOption = {
  id: number;
  field: string;
  value: string;
};

const optionFields = [
  { field: "member", label: "メンバー" },
  { field: "chain", label: "チェーン" },
  { field: "startTime", label: "開始時間" },
  { field: "area", label: "エリア" },
  { field: "storeName", label: "店舗名" },
  { field: "workType", label: "作業内容" },
  { field: "description", label: "詳細" },
];

const emptyForm: DeployForm = {
  deployDate: new Date().toISOString().slice(0, 10),
  storeName: "",
  area: "",
  chain: "",
  workType: "",
  description: "",
  membersText: "",
  startTime: "",
  memo: "",
};

function statusOf(item: DeploySchedule) {
  if (item.completedAt) return "完了";
  if (item.startTime) return "進行中";
  return "予定";
}

function statusClass(status: string) {
  if (status === "完了") return "text-primary";
  if (status === "進行中") return "text-amber-400";
  return "text-sky-400";
}

function toMonth(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort();
}

export default function DeployCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [month, setMonth] = useState(toMonth(new Date()));
  const [schedules, setSchedules] = useState<DeploySchedule[]>([]);
  const [form, setForm] = useState<DeployForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [memberFilter, setMemberFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [chainFilter, setChainFilter] = useState("");
  const [options, setOptions] = useState<DeployOption[]>([]);
  const [optionDraft, setOptionDraft] = useState({ field: "member", value: "" });
  const [showOptionList, setShowOptionList] = useState(true);

  const loadSchedules = async () => {
    const response = await fetch(`/api/deploy-schedules?month=${month}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load deploy schedules");
    setSchedules(await response.json());
  };

  const loadOptions = async () => {
    const response = await fetch("/api/deploy-options", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load deploy options");
    setOptions(await response.json());
  };

  useEffect(() => {
    loadSchedules().catch((error) => toast.error(error.message));
  }, [month]);

  useEffect(() => {
    loadOptions().catch((error) => toast.error(error.message));
  }, []);

  const optionValues = (field: string) => options.filter((item) => item.field === field).map((item) => item.value);
  const members = useMemo(() => uniqueValues([...schedules.flatMap((item) => item.members), ...optionValues("member")]), [schedules, options]);
  const areas = useMemo(() => uniqueValues([...schedules.map((item) => item.area), ...optionValues("area")]), [schedules, options]);
  const chains = useMemo(() => uniqueValues([...schedules.map((item) => item.chain), ...optionValues("chain")]), [schedules, options]);
  const storeNames = useMemo(() => uniqueValues([...schedules.map((item) => item.storeName), ...optionValues("storeName")]), [schedules, options]);
  const workTypes = useMemo(() => uniqueValues([...schedules.map((item) => item.workType), ...optionValues("workType")]), [schedules, options]);
  const descriptions = useMemo(() => uniqueValues([...schedules.map((item) => item.description), ...optionValues("description")]), [schedules, options]);
  const startTimes = useMemo(() => uniqueValues([...schedules.map((item) => item.startTime), ...optionValues("startTime")]), [schedules, options]);

  const filteredSchedules = schedules.filter((item) => {
    if (memberFilter && !item.members.includes(memberFilter)) return false;
    if (areaFilter && item.area !== areaFilter) return false;
    if (chainFilter && item.chain !== chainFilter) return false;
    return true;
  });

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: schedules.length,
      today: schedules.filter((item) => item.deployDate === today).length,
      planned: schedules.filter((item) => statusOf(item) === "予定").length,
      active: schedules.filter((item) => statusOf(item) === "進行中").length,
      done: schedules.filter((item) => statusOf(item) === "完了").length,
      memberCount: members.length,
    };
  }, [schedules, members.length]);

  const calendarDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const last = new Date(year, monthNumber, 0);
    const blanks = Array.from({ length: first.getDay() }, () => null);
    const days = Array.from({ length: last.getDate() }, (_, index) => index + 1);
    return [...blanks, ...days];
  }, [month]);

  const resetForm = () => {
    setForm({ ...emptyForm, deployDate: `${month}-01` });
    setEditingId(null);
    setShowForm(false);
  };

  const addMemberToForm = (member: string) => {
    const currentMembers = form.membersText.split(",").map((item) => item.trim()).filter(Boolean);
    if (!member || currentMembers.includes(member)) return;
    setForm({ ...form, membersText: [...currentMembers, member].join(", ") });
  };

  const optionSelectClass = "rounded bg-input border border-border px-3 py-2 text-sm";

  const submitOption = async (event: FormEvent) => {
    event.preventDefault();
    const value = optionDraft.value.trim();
    if (!value) return;
    const response = await fetch("/api/deploy-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: optionDraft.field, value }),
    });
    if (!response.ok) {
      toast.error("候補の登録に失敗しました");
      return;
    }
    toast.success("プルダウン候補を登録しました");
    setOptionDraft({ ...optionDraft, value: "" });
    await loadOptions();
  };

  const deleteOption = async (id: number) => {
    await fetch(`/api/deploy-options/${id}`, { method: "DELETE" });
    await loadOptions();
  };

  const submitSchedule = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      deployDate: form.deployDate,
      storeName: form.storeName,
      area: form.area,
      chain: form.chain,
      workType: form.workType,
      description: form.description,
      members: form.membersText.split(",").map((item) => item.trim()).filter(Boolean),
      startTime: form.startTime || undefined,
      memo: form.memo,
    };
    const url = editingId ? `/api/deploy-schedules/${editingId}` : "/api/deploy-schedules";
    const response = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      toast.error("保存に失敗しました");
      return;
    }
    toast.success("予定を保存しました");
    resetForm();
    await loadSchedules();
  };

  const editSchedule = (item: DeploySchedule) => {
    setEditingId(item.id);
    setShowForm(true);
    setForm({
      deployDate: item.deployDate.slice(0, 10),
      storeName: item.storeName,
      area: item.area,
      chain: item.chain,
      workType: item.workType,
      description: item.description,
      membersText: item.members.join(", "),
      startTime: item.startTime ?? "",
      memo: item.memo,
    });
  };

  const patchAction = async (id: number, path: string, body?: object) => {
    const response = await fetch(`/api/deploy-schedules/${id}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) {
      toast.error("更新に失敗しました");
      return;
    }
    await loadSchedules();
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/deploy-schedules/${id}`, { method: "DELETE" });
    await loadSchedules();
  };

  const exportCsv = () => {
    const header = ["date", "store", "area", "chain", "work", "members", "status", "start", "memo"];
    const lines = filteredSchedules.map((item) => [
      item.deployDate,
      item.storeName,
      item.area,
      item.chain,
      item.workType,
      item.members.join(" / "),
      statusOf(item),
      item.startTime ?? "",
      item.memo,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `deploy-${month}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Deploy Calendar">Deploy Calendar</span>
        </h1>
        <p className="mono-sub">// TEAM_AND_SITE_SCHEDULE</p>
      </div>

      <div className="cyber-border rounded-lg bg-card p-3 grid gap-3 md:grid-cols-4">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm" />
        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm"><option value="">すべてのメンバー</option>{members.map((member) => <option key={member}>{member}</option>)}</select>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm"><option value="">すべてのエリア</option>{areas.map((area) => <option key={area}>{area}</option>)}</select>
        <select value={chainFilter} onChange={(e) => setChainFilter(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm"><option value="">すべてのチェーン</option>{chains.map((chain) => <option key={chain}>{chain}</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="cyber-border rounded-lg bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">{formatMonthLabel(month)}</h2>
              <button onClick={() => setMonth(toMonth(new Date()))} className="rounded border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10">
                今日
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">{["日","月","火","水","木","金","土"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {calendarDays.map((day, index) => {
                const date = day ? `${month}-${String(day).padStart(2, "0")}` : "";
                const hasDeploy = schedules.some((item) => item.deployDate.slice(0, 10) === date);
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={`${day}-${index}`}
                    className={`relative h-10 rounded grid place-items-center ${hasDeploy ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground"} ${isToday ? "ring-1 ring-primary" : ""}`}
                  >
                    {day ?? ""}
                    {hasDeploy && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />設置</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyber-green" />切替</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />点検</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-400" />その他</span>
            </div>
          </div>

          <div className="cyber-border rounded-lg bg-card p-4 space-y-3">
            <h2 className="font-semibold text-foreground">今月のサマリー</h2>
            <div className="rounded border border-border bg-input/40 p-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />今月の予定</span>
              <span className="text-xl font-black text-primary">{summary.total}<span className="ml-1 text-xs text-muted-foreground">件</span></span>
            </div>
            <div className="rounded border border-border bg-input/40 p-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Sun className="h-4 w-4 text-cyber-green" />今日</span>
              <span className="text-xl font-black text-primary">{summary.today}<span className="ml-1 text-xs text-muted-foreground">件</span></span>
            </div>
            <div className="rounded border border-border bg-input/40 p-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-amber-400" />進行中</span>
              <span className="text-xl font-black text-amber-400">{summary.active}<span className="ml-1 text-xs text-muted-foreground">件</span></span>
            </div>
            <div className="rounded border border-border bg-input/40 p-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />完了</span>
              <span className="text-xl font-black text-primary">{summary.done}<span className="ml-1 text-xs text-muted-foreground">件</span></span>
            </div>
            <div className="rounded border border-border bg-input/40 p-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4 text-primary" />メンバー</span>
              <span className="text-xl font-black text-primary">{summary.memberCount}<span className="ml-1 text-xs text-muted-foreground">名</span></span>
            </div>
          </div>
        </aside>

        <section className="cyber-border rounded-lg bg-card p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground">スケジュール一覧</h2>
            <div className="flex gap-2">
              {isAdmin && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />予定追加</Button>}
              {isAdmin && <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>}
            </div>
          </div>

          {isAdmin && showForm && (
            <div className="space-y-3 rounded border border-border p-3">
              <form onSubmit={submitOption} className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                <select value={optionDraft.field} onChange={(e) => setOptionDraft({ ...optionDraft, field: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm">
                  {optionFields.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}
                </select>
                <input placeholder="プルダウン候補を登録" value={optionDraft.value} onChange={(e) => setOptionDraft({ ...optionDraft, value: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <Button size="sm" type="submit">候補登録</Button>
              </form>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">登録済み候補 {options.length}件</span>
                <Button size="sm" type="button" variant="outline" onClick={() => setShowOptionList((visible) => !visible)}>
                  {showOptionList ? "候補一覧を非表示" : "候補一覧を表示"}
                </Button>
              </div>
              {showOptionList && (
                <div className="flex flex-wrap gap-2">
                  {options.map((item) => {
                    const label = optionFields.find((field) => field.field === item.field)?.label ?? item.field;
                    return (
                      <button key={item.id} type="button" onClick={() => deleteOption(item.id)} className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-cyber-red hover:text-cyber-red">
                        {label}: {item.value} x
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isAdmin && showForm && (
            <form onSubmit={submitSchedule} className="grid gap-2 rounded border border-border p-3 md:grid-cols-2">
              <input type="date" value={form.deployDate} onChange={(e) => setForm({ ...form, deployDate: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="店舗名" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" required />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, storeName: e.target.value })} className={optionSelectClass}>
                  <option value="">店舗名候補</option>
                  {storeNames.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="エリア" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, area: e.target.value })} className={optionSelectClass}>
                  <option value="">エリア候補</option>
                  {areas.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="チェーン" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, chain: e.target.value })} className={optionSelectClass}>
                  <option value="">チェーン候補</option>
                  {chains.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="作業内容" value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, workType: e.target.value })} className={optionSelectClass}>
                  <option value="">作業内容候補</option>
                  {workTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="担当メンバー（カンマ区切り）" value={form.membersText} onChange={(e) => setForm({ ...form, membersText: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => addMemberToForm(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm">
                  <option value="">メンバー追加</option>
                  {members.map((member) => <option key={member} value={member}>{member}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="開始時間 例 10:00" value={form.startTime ?? ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, startTime: e.target.value })} className={optionSelectClass}>
                  <option value="">開始時間候補</option>
                  {startTimes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="詳細" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, description: e.target.value })} className={optionSelectClass}>
                  <option value="">詳細候補</option>
                  {descriptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <textarea placeholder="メモ" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm md:col-span-2" />
              <div className="flex gap-2 md:col-span-2"><Button size="sm" type="submit">保存</Button><Button size="sm" type="button" variant="outline" onClick={resetForm}>キャンセル</Button></div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">日付</th><th className="p-2">店舗</th><th className="p-2">作業内容</th><th className="p-2">担当</th><th className="p-2">進捗</th><th className="p-2">操作</th></tr></thead>
              <tbody>
                {filteredSchedules.map((item) => {
                  const status = statusOf(item);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-2">{item.deployDate?.slice(0, 10)}</td>
                      <td className="p-2"><p className="font-medium text-foreground">{item.storeName}</p><p className="text-xs text-muted-foreground">{item.area} {item.chain}</p></td>
                      <td className="p-2"><p>{item.workType}</p><p className="text-xs text-muted-foreground">{item.description}</p></td>
                      <td className="p-2">{item.members.join(", ")}</td>
                      <td className={`p-2 ${statusClass(status)}`}>{status}</td>
                      <td className="p-2">
                        {isAdmin ? <div className="flex flex-wrap gap-1">
                          {!item.startTime && <Button size="sm" variant="outline" onClick={() => patchAction(item.id, "start", { startTime: new Date().toTimeString().slice(0, 5) })}><Clock3 className="h-3 w-3" /></Button>}
                          {!item.completedAt && <Button size="sm" variant="outline" onClick={() => patchAction(item.id, "complete")}><CheckCircle2 className="h-3 w-3" /></Button>}
                          <Button size="sm" variant="outline" onClick={() => editSchedule(item)}>編集</Button>
                          <Button size="sm" variant="outline" onClick={() => deleteSchedule(item.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div> : <span className="text-xs text-muted-foreground">閲覧のみ</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
