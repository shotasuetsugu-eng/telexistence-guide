import { BookOpen, CalendarDays, CheckSquare, FileText, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading } = trpc.categories.list.useQuery();
  const { data: procedures = [] } = trpc.procedures.list.useQuery();
  const { data: checklists = [] } = trpc.checklists.list.useQuery();
  const { data: documents = [] } = trpc.documents.list.useQuery();
  const [deploySummary, setDeploySummary] = useState({ today: 0, month: 0, active: 0, done: 0, members: 0 });

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    fetch(`/api/deploy-schedules?month=${month}`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => {
        const today = new Date().toISOString().slice(0, 10);
        const schedules = Array.isArray(items) ? items : [];
        const members = new Set(schedules.flatMap((item: any) => Array.isArray(item.members) ? item.members : []));
        setDeploySummary({
          today: schedules.filter((item: any) => String(item.deployDate).slice(0, 10) === today).length,
          month: schedules.length,
          active: schedules.filter((item: any) => item.startTime && !item.completedAt).length,
          done: schedules.filter((item: any) => item.completedAt).length,
          members: members.size,
        });
      })
      .catch(() => {});
  }, []);

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
