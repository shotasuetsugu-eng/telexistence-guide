import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export default function Procedures() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const categoryId = params.get("category") ? Number(params.get("category")) : undefined;

  const { data: procedures, isLoading } = trpc.procedures.list.useQuery(
    categoryId ? { categoryId } : undefined
  );
  const { data: categories } = trpc.categories.list.useQuery();
  const [, setLocation] = useLocation();

  const currentCategory = categories?.find((c) => c.id === categoryId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="手順書">手順書</span>
        </h1>
        <p className="mono-sub">// PROCEDURE_MANUALS</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLocation("/procedures")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            !categoryId ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          すべて
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setLocation(`/procedures?category=${cat.id}`)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              categoryId === cat.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {currentCategory && (
        <div className="cyber-border rounded-lg p-3 bg-card">
          <p className="text-sm text-primary font-medium">{currentCategory.name}</p>
          {currentCategory.description && (
            <p className="text-xs text-muted-foreground mt-1">{currentCategory.description}</p>
          )}
        </div>
      )}

      {/* Procedures List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-20" />
          ))}
        </div>
      ) : procedures && procedures.length > 0 ? (
        <div className="space-y-3">
          {procedures.map((proc) => (
            <button
              key={proc.id}
              onClick={() => setLocation(`/procedures/${proc.id}`)}
              className="w-full cyber-border rounded-lg p-4 bg-card text-left hover:bg-card/80 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {proc.title}
                  </h3>
                  {proc.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{proc.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="cyber-border rounded-lg p-8 bg-card text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">手順書が登録されていません</p>
          <p className="mono-sub mt-2">// NO_PROCEDURES_FOUND</p>
        </div>
      )}
    </div>
  );
}
