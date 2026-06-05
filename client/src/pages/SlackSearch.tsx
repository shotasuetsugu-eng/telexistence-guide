import { useAuth } from "@/_core/hooks/useAuth";
import { AccountLoading, AccountRequired } from "@/components/AccountRequired";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Search, MessageSquare, Hash, ExternalLink, AlertCircle, Clock } from "lucide-react";

function formatTs(ts: string): string {
  const ms = parseFloat(ts) * 1000;
  if (isNaN(ms)) return "";
  return new Date(ms).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SlackSearch() {
  const { user, loading: authLoading } = useAuth();
  const [inputQuery, setInputQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const hasAccount = Boolean(user);

  const { data: channelsData } = trpc.slack.listChannels.useQuery(undefined, {
    enabled: hasAccount,
  });
  const { data, isLoading, error } = trpc.slack.search.useQuery(
    { query: searchQuery, count: 30 },
    { enabled: hasAccount && searchQuery.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    setSearchQuery(inputQuery.trim());
  };

  const messages = data?.messages ?? [];
  const notConfigured = data?.configured === false || channelsData?.configured === false;
  const notConfiguredMessage =
    data?.configured === false
      ? data.message
      : channelsData?.configured === false
        ? "SLACK_BOT_TOKENが未設定です"
        : "";

  if (authLoading) return <AccountLoading />;
  if (!user) return <AccountRequired label="Slack検索" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Slack 検索">Slack 検索</span>
        </h1>
        <p className="mono-sub">// SLACK_SEARCH</p>
      </div>

      {/* Not configured */}
      {notConfigured && (
        <div className="cyber-border rounded-lg p-6 bg-card text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-accent mx-auto" />
          <h3 className="font-semibold text-foreground">Slack が未設定です</h3>
          <p className="text-sm text-muted-foreground">{notConfiguredMessage}</p>
          <div className="text-left bg-muted/50 rounded-md p-3 text-xs font-mono space-y-1">
            <p className="text-primary">// .env に以下を設定してください</p>
            <p className="text-foreground">SLACK_BOT_TOKEN=<span className="text-accent">xoxb-your-token</span></p>
            <p className="text-muted-foreground mt-2">// Slack App の必要スコープ:</p>
            <p className="text-foreground">search:read, channels:read</p>
          </div>
        </div>
      )}

      {/* Channels overview */}
      {channelsData?.configured && channelsData.channels.length > 0 && (
        <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              チャンネル一覧
              <span className="ml-2 text-xs text-muted-foreground font-mono">({channelsData.channels.length})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {channelsData.channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setInputQuery(`in:#${ch.name} `);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors text-xs"
              >
                <Hash className="h-3 w-3" />
                {ch.name}
                {ch.memberCount > 0 && (
                  <span className="text-xs opacity-60">{ch.memberCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">メッセージ検索</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder='キーワードを入力（例：設置手順、in:#general キーワード）'
            className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-md bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            検索
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Slack検索演算子が使えます：<code className="text-primary font-mono">in:#channel</code>、<code className="text-primary font-mono">from:@user</code>、<code className="text-primary font-mono">before:2024-01-01</code>
        </p>
      </form>

      {/* Error */}
      {error && (
        <div className="cyber-border rounded-lg p-4 bg-card border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">エラーが発生しました</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && searchQuery && data?.configured !== false && (
        <>
          {messages.length === 0 ? (
            <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">「{searchQuery}」の検索結果はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mono-sub">{messages.length} 件のメッセージ</p>
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={`${msg.channelId}-${msg.ts}`} className="cyber-border rounded-lg p-4 bg-card space-y-2 hover:bg-primary/5 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {(msg.username || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{msg.username || msg.userId}</span>
                        {msg.channel && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            {msg.channel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.ts && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTs(msg.ts)}
                          </span>
                        )}
                        {msg.permalink && (
                          <a
                            href={msg.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Slackで開く"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {highlightQuery(msg.text, searchQuery)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
