import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, Download, Plus, Trash2 } from "lucide-react";
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

  const loadSchedules = async () => {
    const response = await fetch(`/api/deploy-schedules?month=${month}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load deploy schedules");
    setSchedules(await response.json());
  };

  useEffect(() => {
    loadSchedules().catch((error) => toast.error(error.message));
  }, [month]);

  const members = useMemo(() => Array.from(new Set(schedules.flatMap((item) => item.members))).filter(Boolean), [schedules]);
  const areas = useMemo(() => Array.from(new Set(schedules.map((item) => item.area))).filter(Boolean), [schedules]);
  const chains = useMemo(() => Array.from(new Set(schedules.map((item) => item.chain))).filter(Boolean), [schedules]);
  const storeNames = useMemo(() => uniqueValues(schedules.map((item) => item.storeName)), [schedules]);
  const workTypes = useMemo(() => uniqueValues(schedules.map((item) => item.workType)), [schedules]);
  const descriptions = useMemo(() => uniqueValues(schedules.map((item) => item.description)), [schedules]);
  const startTimes = useMemo(() => uniqueValues(schedules.map((item) => item.startTime)), [schedules]);

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

      <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div className="cyber-border rounded-lg bg-card p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">{["日","月","火","水","木","金","土"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {calendarDays.map((day, index) => {
                const date = day ? `${month}-${String(day).padStart(2, "0")}` : "";
                const hasDeploy = schedules.some((item) => item.deployDate.slice(0, 10) === date);
                return <div key={`${day}-${index}`} className={`h-8 rounded grid place-items-center ${hasDeploy ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground"}`}>{day ?? ""}</div>;
              })}
            </div>
          </div>

          <div className="cyber-border rounded-lg bg-card p-3 space-y-3">
            <h2 className="font-semibold text-foreground">今月のサマリー</h2>
            <p className="flex justify-between text-sm"><span>予定</span><span className="text-primary">{summary.total}件</span></p>
            <p className="flex justify-between text-sm"><span>今日</span><span className="text-primary">{summary.today}件</span></p>
            <p className="flex justify-between text-sm"><span>進行中</span><span className="text-amber-400">{summary.active}件</span></p>
            <p className="flex justify-between text-sm"><span>完了</span><span className="text-primary">{summary.done}件</span></p>
            <p className="flex justify-between text-sm"><span>メンバー</span><span className="text-primary">{summary.memberCount}名</span></p>
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
            <form onSubmit={submitSchedule} className="grid gap-2 rounded border border-border p-3 md:grid-cols-2">
              <datalist id="deploy-store-options">{storeNames.map((value) => <option key={value} value={value} />)}</datalist>
              <datalist id="deploy-area-options">{areas.map((value) => <option key={value} value={value} />)}</datalist>
              <datalist id="deploy-chain-options">{chains.map((value) => <option key={value} value={value} />)}</datalist>
              <datalist id="deploy-work-options">{workTypes.map((value) => <option key={value} value={value} />)}</datalist>
              <datalist id="deploy-description-options">{descriptions.map((value) => <option key={value} value={value} />)}</datalist>
              <datalist id="deploy-start-options">{startTimes.map((value) => <option key={value} value={value} />)}</datalist>
              <input type="date" value={form.deployDate} onChange={(e) => setForm({ ...form, deployDate: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <input list="deploy-store-options" placeholder="店舗名" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" required />
              <input list="deploy-area-options" placeholder="エリア" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <input list="deploy-chain-options" placeholder="チェーン" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <input list="deploy-work-options" placeholder="作業内容" value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <input placeholder="担当メンバー（カンマ区切り）" value={form.membersText} onChange={(e) => setForm({ ...form, membersText: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
                <select value="" onChange={(e) => addMemberToForm(e.target.value)} className="rounded bg-input border border-border px-3 py-2 text-sm">
                  <option value="">メンバー追加</option>
                  {members.map((member) => <option key={member} value={member}>{member}</option>)}
                </select>
              </div>
              <input list="deploy-start-options" placeholder="開始時間 例 10:00" value={form.startTime ?? ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
              <input list="deploy-description-options" placeholder="詳細" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded bg-input border border-border px-3 py-2 text-sm" />
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
