import { useAuth } from "@/_core/hooks/useAuth";
import { AccountLoading, AccountRequired } from "@/components/AccountRequired";
import { FolderOpen, ExternalLink, ShieldAlert } from "lucide-react";

const FOLDER_ID = "1S4K-iuRwYFHtRG2iuCr3UR75_l782iPP";

export default function Drive() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <AccountLoading />;

  if (!user) {
    return <AccountRequired label="Google Drive" />;
  }

  if (!user.email?.endsWith("@tx-inc.com")) {
    return (
      <div className="cyber-border rounded-lg p-6 bg-card text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-destructive">アクセスできません</h3>
        <p className="text-sm text-muted-foreground">
          Google Driveは @tx-inc.com のアカウントのみ利用できます。
        </p>
      </div>
    );
  }

  const driveUrl = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
  const embedUrl = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#list`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="Google Drive">Google Drive</span>
        </h1>
        <p className="mono-sub">// DRIVE_DIRECT_VERSION</p>
      </div>

      <div className="cyber-border rounded-lg p-4 bg-card space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          TX共有Drive
        </h3>

        <p className="text-sm text-muted-foreground">
          @tx-inc.com でログイン済みのユーザーのみ閲覧できます。
          権限はGoogle Drive側の共有設定に従います。
        </p>

        <a
          href={driveUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded border px-4 py-3 text-sm font-semibold hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          Google Driveで開く
        </a>
      </div>

      <div className="cyber-border rounded-lg overflow-hidden bg-card">
        <iframe
          title="TX Google Drive"
          src={embedUrl}
          className="w-full h-[650px] bg-white"
        />
      </div>
    </div>
  );
}
