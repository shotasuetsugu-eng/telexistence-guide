import { BookOpen, CalendarDays, CheckSquare, FileText, Layers } from "lucide-react";
import { useEffect, useState } from "react";
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

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading } = trpc.categories.list.useQuery();
  const { data: procedures = [] } = trpc.procedures.list.useQuery();
  const { data: checklists = [] } = trpc.checklists.list.useQuery();
  const { data: documents = [] } = trpc.documents.list.useQuery();
  const [deploySummary, setDeploySummary] = useState({ today: 0, month: 0, active: 0, done: 0, members: 0 });
  const [deploySchedules, setDeploySchedules] = useState<DeploySchedule[]>([]);

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
    .slice(0, 8);

  return (
    <div className="space-y-8">
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
            <h2 className="font-semibold text-foreground">Deploy Calendar</h2>
          </div>
          <button
            onClick={() => setLocation("/deploy-calendar")}
            className="rounded border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            カレンダーを開く
          </button>
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
              </tr>
            </thead>
            <tbody>
              {upcomingDeploys.map((item) => {
                const status = deployStatus(item);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-2 py-3 text-muted-foreground">{item.deployDate.slice(0, 10)}</td>
                    <td className="px-2 py-3">
                      <p className="font-semibold text-foreground">{item.storeName}</p>
                      <p className="text-xs text-muted-foreground">{[item.area, item.chain].filter(Boolean).join(" / ")}</p>
                    </td>
                    <td className="px-2 py-3">
                      <p className="text-foreground">{item.workType || "-"}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{item.members.join(", ") || "-"}</td>
                    <td className="px-2 py-3">
                      <span className={status === "進行中" ? "text-amber-400" : status === "完了" ? "text-primary" : "text-sky-400"}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {upcomingDeploys.length === 0 && (
                <tr>
                  <td className="px-2 py-6 text-center text-muted-foreground" colSpan={5}>
                    今月のDeploy予定はまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
