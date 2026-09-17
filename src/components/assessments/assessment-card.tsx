import Link from "next/link";
import { Clock, CheckCircle2 } from "lucide-react";
import type { GameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";

export function AssessmentCard({ meta, result }: { meta: GameMeta; result?: GameResult }) {
  return (
    <Link
      href={`/assessments/${meta.id}`}
      className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-surface-hover"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-foreground">{meta.title}</h2>
          {result && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Done
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock className="size-3" />
          {meta.duration}
        </span>
        {result && <span className="text-[12px] font-medium text-foreground">{result.summary}</span>}
      </div>
    </Link>
  );
}
