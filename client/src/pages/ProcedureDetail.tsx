import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function ProcedureDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: procedure, isLoading } = trpc.procedures.getById.useQuery({ id });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-border rounded-lg p-4 bg-card animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="cyber-border rounded-lg p-8 bg-card text-center">
        <p className="text-muted-foreground">手順書が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setLocation("/procedures")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>手順書一覧に戻る</span>
      </button>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">{procedure.title}</h1>
        {procedure.description && (
          <p className="text-sm text-muted-foreground">{procedure.description}</p>
        )}
        <p className="mono-sub">// PROCEDURE_ID: {procedure.id}</p>
      </div>

      {/* Content (if any markdown/text content) */}
      {procedure.content && (
        <div className="cyber-border rounded-lg p-4 bg-card">
          <p className="text-sm text-foreground whitespace-pre-wrap">{procedure.content}</p>
        </div>
      )}

      {/* Steps */}
      {procedure.steps && procedure.steps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">&#91;</span>
            手順ステップ
            <span className="text-primary">&#93;</span>
          </h2>
          <div className="space-y-3">
            {procedure.steps.map((step, index) => (
              <div key={step.id} className="cyber-border rounded-lg p-4 bg-card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{step.description}</p>
                    )}
                    {step.imageUrl && (
                      <img
                        src={step.imageUrl}
                        alt={step.title}
                        className="mt-3 rounded-md max-w-full h-auto border border-border"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
