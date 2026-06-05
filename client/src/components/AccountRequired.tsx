import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { LockKeyhole } from "lucide-react";

type AccountRequiredProps = {
  label: string;
};

export function AccountRequired({ label }: AccountRequiredProps) {
  return (
    <div className="cyber-border rounded-lg p-8 bg-card text-center space-y-4 max-w-md mx-auto">
      <LockKeyhole className="h-10 w-10 text-primary mx-auto" />
      <h2 className="text-xl font-bold text-foreground">ログインが必要です</h2>
      <p className="text-sm text-muted-foreground">
        {label}はアカウント付与済みのユーザーだけが利用できます。
      </p>
      <Button onClick={() => { window.location.href = getLoginUrl(); }}>
        ログインする
      </Button>
    </div>
  );
}

export function AccountLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
      <div className="h-64 bg-muted rounded animate-pulse" />
    </div>
  );
}
