import { trpc } from "@/lib/trpc";
import { Search as SearchIcon, BookOpen, CheckSquare, FileText } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Search() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: results, isLoading } = trpc.search.query.useQuery(
    { q: searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchTerm(query.trim());
  };

  const totalResults = results
    ? results.procedures.length + results.checklists.length + results.documents.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="検索">検索</span>
        </h1>
        <p className="mono-sub">// CROSS_SEARCH</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードを入力..."
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          検索
        </button>
      </form>

      {/* Results */}
      {searchTerm && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            「<span className="text-primary">{searchTerm}</span>」の検索結果: {totalResults}件
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-16" />
              ))}
            </div>
          ) : (
            <>
              {/* Procedures */}
              {results && results.procedures.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    手順書 ({results.procedures.length})
                  </h3>
                  {results.procedures.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => setLocation(`/procedures/${proc.id}`)}
                      className="w-full cyber-border rounded-lg p-3 bg-card text-left hover:bg-card/80 transition-all"
                    >
                      <h4 className="font-medium text-foreground text-sm">{proc.title}</h4>
                      {proc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{proc.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Checklists */}
              {results && results.checklists.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-cyber-green flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    チェックリスト ({results.checklists.length})
                  </h3>
                  {results.checklists.map((cl) => (
                    <button
                      key={cl.id}
                      onClick={() => setLocation(`/checklists/${cl.id}`)}
                      className="w-full cyber-border rounded-lg p-3 bg-card text-left hover:bg-card/80 transition-all"
                    >
                      <h4 className="font-medium text-foreground text-sm">{cl.title}</h4>
                      {cl.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cl.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Documents */}
              {results && results.documents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-cyber-red flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    資料 ({results.documents.length})
                  </h3>
                  {results.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cyber-border rounded-lg p-3 bg-card hover:bg-card/80 transition-all"
                    >
                      <h4 className="font-medium text-foreground text-sm">{doc.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.fileName}</p>
                    </a>
                  ))}
                </div>
              )}

              {totalResults === 0 && (
                <div className="cyber-border rounded-lg p-8 bg-card text-center">
                  <SearchIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">該当する結果が見つかりません</p>
                  <p className="mono-sub mt-2">// NO_RESULTS</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
