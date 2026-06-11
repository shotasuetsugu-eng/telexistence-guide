import { BookOpen, CalendarDays, CheckSquare, FileText, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

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

function deployStatus(item: DeploySchedule) {
  if (item.completedAt) return "完了";
  const [year, month, day] = item.deployDate.slice(0, 10).split("-").map(Number);
  const [startHour, startMinute] = String(item.startTime ?? "00:00").split(":").map(Number);
  const deployStart = new Date(year, month - 1, day, startHour || 0, startMinute || 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const deployDayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (new Date() >= deployStart) return "進行中";
  const daysLeft = Math.max(0, Math.ceil((deployDayStart.getTime() - todayStart.getTime()) / 86400000));
  return `あと${daysLeft}日`;
}

function linkifyText(value: string) {
  return value.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (!part.match(/^https?:\/\//)) return part;
    return (
      <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
        {part}
      </a>
    );
  });
}

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading } = trpc.categories.list.useQuery();
  const { data: procedures = [] } = trpc.procedures.list.useQuery();
  const { data: checklists = [] } = trpc.checklists.list.useQuery();
  const { data: documents = [] } = trpc.documents.list.useQuery();
  const [deploySummary, setDeploySummary] = useState({ today: 0, month: 0, active: 0, done: 0, members: 0 });
  const [deploySchedules, setDeploySchedules] = useState<DeploySchedule[]>([]);
  const [detailSchedule, setDetailSchedule] = useState<DeploySchedule | null>(null);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    fetch(`/api/deploy-schedules?month=${month}`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => {
        const today = new Date().toISOString().slice(0, 10);
        const schedules = Array.isArray(items) ? items : [];
        setDeploySchedules(schedules);
        const members = new Set(schedules.flatMap((item: any) => Array.isArray(item.members) ? item.members : []));
        setDeploySummary({
          today: schedules.filter((item: any) => String(item.deployDate).slice(0, 10) === today).length,
          month: schedules.length,
          active: schedules.filter((item: DeploySchedule) => deployStatus(item) === "進行中").length,
          done: schedules.filter((item: any) => item.completedAt).length,
          members: members.size,
        });
      })
      .catch(() => {});
  }, []);

  const upcomingDeploys = deploySchedules
    .slice()
    .sort((a, b) => a.deployDate.localeCompare(b.deployDate))
    .slice(0, 5);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const calendarDays = useMemo(() => {
    const [year, monthNumber] = currentMonth.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const last = new Date(year, monthNumber, 0);
    const blanks = Array.from({ length: first.getDay() }, () => null);
    const days = Array.from({ length: last.getDate() }, (_, index) => index + 1);
    return [...blanks, ...days];
  }, [currentMonth]);

  const showDeployDetails = (item: DeploySchedule) => {
    setDetailSchedule(item);
  };

  return (
    <div className="space-y-8">
      {detailSchedule && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="cyber-border w-full max-w-3xl rounded-lg bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{detailSchedule.storeName}</h2>
                <p className="text-sm text-muted-foreground">{detailSchedule.deployDate?.slice(0, 10)} / {detailSchedule.workType || "-"}</p>
              </div>
              <button onClick={() => setDetailSchedule(null)} className="rounded border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                閉じる
              </button>
            </div>
            {detailSchedule.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">詳細</h3>
                <p className="whitespace-pre-wrap break-words rounded border border-border bg-input/40 p-3 text-base leading-7 text-foreground">
                  {linkifyText(detailSchedule.description)}
                </p>
              </div>
            )}
            {detailSchedule.memo && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">メモ</h3>
                <p className="whitespace-pre-wrap break-words rounded border border-border bg-input/40 p-3 text-base leading-7 text-foreground">
                  {linkifyText(detailSchedule.memo)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Telexistence">Telexistence</span>
        </h1>
        <p className="mono-sub">// INSTALLATION OPERATIONS GUIDE V1.0</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="cyber-border rounded-lg bg-card p-4 flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <div>
            <p className="text-2xl font-black text-foreground">{categories.length}</p>
            <p className="text-xs text-muted-foreground">カテゴリ</p>
          </div>
        </div>

        <div className="cyber-border rounded-lg bg-card p-4 flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <p className="text-2xl font-black text-foreground">{procedures.length}</p>
            <p className="text-xs text-muted-foreground">手順書</p>
          </div>
        </div>

        <div className="cyber-border rounded-lg bg-card p-4 flex items-center gap-3">
          <CheckSquare className="h-6 w-6 text-cyber-green" />
          <div>
            <p className="text-2xl font-black text-foreground">{checklists.length}</p>
            <p className="text-xs text-muted-foreground">チェックリスト</p>
          </div>
        </div>

        <div className="cyber-border rounded-lg bg-card p-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-cyber-red" />
          <div>
            <p className="text-2xl font-black text-foreground">{documents.length}</p>
            <p className="text-xs text-muted-foreground">資料</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="cyber-border rounded-lg bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">今日のDeploy</h2>
          </div>
          <p className="text-3xl font-black text-primary">{deploySummary.today}<span className="ml-1 text-sm text-muted-foreground">件</span></p>
          <p className="text-xs text-muted-foreground">当日のDeploy予定件数</p>
        </div>
        <button onClick={() => setLocation("/deploy-calendar")} className="cyber-border rounded-lg bg-card p-4 text-left hover:bg-card/80 transition-all space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">今月のDeploy</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <p><span className="block text-lg font-bold text-primary">{deploySummary.month}</span><span className="text-xs text-muted-foreground">予定</span></p>
            <p><span className="block text-lg font-bold text-amber-400">{deploySummary.active}</span><span className="text-xs text-muted-foreground">進行中</span></p>
            <p><span className="block text-lg font-bold text-primary">{deploySummary.done}</span><span className="text-xs text-muted-foreground">完了</span></p>
            <p><span className="block text-lg font-bold text-primary">{deploySummary.members}</span><span className="text-xs text-muted-foreground">担当</span></p>
          </div>
        </button>
      </div>

      <section className="cyber-border rounded-lg bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Deploy Calendar</h2>
          </div>
          <button
            onClick={() => setLocation("/deploy-calendar")}
            className="rounded border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            カレンダーを開く
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <div className="rounded border border-border bg-input/20 p-3 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{currentMonth.replace("-", "年")}月</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["日", "月", "火", "水", "木", "金", "土"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {calendarDays.map((day, index) => {
                const date = day ? `${currentMonth}-${String(day).padStart(2, "0")}` : "";
                const hasDeploy = deploySchedules.some((item) => item.deployDate.slice(0, 10) === date);
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={`${day}-${index}`} className={`relative h-8 rounded grid place-items-center ${hasDeploy ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground"} ${isToday ? "ring-1 ring-primary" : ""}`}>
                    {day ?? ""}
                    {hasDeploy && <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">日付</th>
                  <th className="px-2 py-2">店舗</th>
                  <th className="px-2 py-2">作業内容</th>
                  <th className="px-2 py-2">担当</th>
                  <th className="px-2 py-2">進捗</th>
                  <th className="px-2 py-2">詳細</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeploys.map((item) => {
                  const status = deployStatus(item);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-2 py-3 font-medium text-muted-foreground">{item.deployDate.slice(0, 10)}</td>
                      <td className="px-2 py-2">
                        <p className="font-semibold text-foreground">{item.storeName}</p>
                        <p className="text-xs text-muted-foreground">{[item.area, item.chain].filter(Boolean).join(" / ")}</p>
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-semibold text-foreground">{item.workType || "-"}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </td>
                      <td className="px-2 py-2 font-semibold text-foreground">{item.members.join(", ") || "-"}</td>
                      <td className="px-2 py-2">
                        <span className={`font-semibold ${status === "進行中" ? "text-amber-400" : status === "完了" ? "text-primary" : "text-sky-400"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {(item.description || item.memo) ? (
                          <button onClick={() => showDeployDetails(item)} className="rounded border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                            詳細/メモ
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {upcomingDeploys.length === 0 && (
                  <tr>
                    <td className="px-2 py-6 text-center text-muted-foreground" colSpan={6}>
                      今月のDeploy予定はまだありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setLocation("/procedures")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <BookOpen className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            手順書を見る
          </h3>
          <p className="text-xs text-muted-foreground mt-1">設置作業の手順を確認</p>
        </button>

        <button
          onClick={() => setLocation("/checklists")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <CheckSquare className="h-6 w-6 text-cyber-green mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-cyber-green transition-colors">
            チェックリスト
          </h3>
          <p className="text-xs text-muted-foreground mt-1">確認項目をチェック</p>
        </button>

        <button
          onClick={() => setLocation("/documents")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <FileText className="h-6 w-6 text-cyber-red mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-cyber-red transition-colors">
            資料一覧
          </h3>
          <p className="text-xs text-muted-foreground mt-1">PDF・画像をダウンロード</p>
        </button>
      </div>

      {/* Company Movie */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">Company Movie</h2>
          <span className="mono-sub">// TX_OFFICIAL_VIDEO</span>
        </div>

        <p className="text-xs text-muted-foreground">
          右下をドラッグして動画サイズを調整できます。
        </p>

        <div className="cyber-border rounded-lg bg-card resize-y overflow-hidden h-[760px] min-h-[420px] max-h-[1200px]">
          <iframe
            src="https://www.youtube-nocookie.com/embed/5Q8rIQ6HA4M?autoplay=1&mute=1&loop=1&playlist=5Q8rIQ6HA4M&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0"
            title="Telexistence Company Movie"
            className="w-full h-full pointer-events-none border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      </div>
    </div>
  );
}
