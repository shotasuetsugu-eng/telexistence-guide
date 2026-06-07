import { trpc } from "@/lib/trpc";
import { BookOpen, CheckSquare, FileText, Layers } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { data: categories, isLoading: catLoading } = trpc.categories.list.useQuery();
  const { data: procedures } = trpc.procedures.list.useQuery();
  const { data: checklists } = trpc.checklists.list.useQuery();
  const { data: documents } = trpc.documents.list.useQuery();
  const [, setLocation] = useLocation();

  const stats = [
    { icon: Layers, label: "カテゴリ", value: categories?.length ?? 0, color: "text-primary" },
    { icon: BookOpen, label: "手順書", value: procedures?.length ?? 0, color: "text-cyber-cyan" },
    { icon: CheckSquare, label: "チェックリスト", value: checklists?.length ?? 0, color: "text-cyber-green" },
    { icon: FileText, label: "資料", value: documents?.length ?? 0, color: "text-cyber-red" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Telexistence">Telexistence</span>
        </h1>
        <p className="mono-sub">// INSTALLATION OPERATIONS GUIDE v1.0</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="cyber-border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Company Movie */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">Company Movie</h2>
          <span className="mono-sub">// TX_OFFICIAL_VIDEO</span>
        </div>

        <div className="cyber-border rounded-lg overflow-hidden bg-card">
          <iframe
            src="https://www.youtube.com/embed/5Q8rIQ6HA4M?autoplay=1&mute=1&loop=1&playlist=5Q8rIQ6HA4M&controls=0&rel=0&modestbranding=1&playsinline=1"
            title="Telexistence Company Movie"
            className="w-full h-[520px]"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>


      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setLocation("/procedures")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <BookOpen className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">手順書を見る</h3>
          <p className="text-xs text-muted-foreground mt-1">設置作業の手順を確認</p>
        </button>
        <button
          onClick={() => setLocation("/checklists")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <CheckSquare className="h-6 w-6 text-cyber-green mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-cyber-green transition-colors">チェックリスト</h3>
          <p className="text-xs text-muted-foreground mt-1">確認項目をチェック</p>
        </button>
        <button
          onClick={() => setLocation("/documents")}
          className="cyber-border rounded-lg p-5 bg-card hover:bg-card/80 transition-all text-left group"
        >
          <FileText className="h-6 w-6 text-cyber-red mb-2" />
          <h3 className="font-semibold text-foreground group-hover:text-cyber-red transition-colors">資料一覧</h3>
          <p className="text-xs text-muted-foreground mt-1">PDF・画像をダウンロード</p>
        </button>
      </div>
    </div>
  );
}

