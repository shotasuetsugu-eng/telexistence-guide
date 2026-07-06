import { trpc } from "@/lib/trpc";
import Home from "@/pages/Home";
import { useMemo } from "react";

const PUBLISHED_KEY = "siteBuilder.dashboard.published";

export default function DashboardRenderer() {
  const { data: settings = [], isLoading } = trpc.linkSettings.list.useQuery();
  const published = useMemo(() => settings.find((item) => item.key === PUBLISHED_KEY)?.url, [settings]);

  if (isLoading || !published) return <Home />;

  try {
    const data = JSON.parse(published) as { html?: string; css?: string };
    if (!data.html) return <Home />;
    return (
      <div className="visual-dashboard">
        <style>{data.css || ""}</style>
        <div dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  } catch {
    return <Home />;
  }
}
