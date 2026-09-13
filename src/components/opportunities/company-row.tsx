"use client";

import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCheckCompany, useDeleteCompany, useUpdateCompany } from "@/hooks/use-companies";
import { formatRelativeCountdown } from "@/lib/date-helpers";
import type { CompanyDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CompanyRow({ company }: { company: CompanyDTO }) {
  const checkCompany = useCheckCompany();
  const deleteCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-foreground">{company.name}</p>
          <Badge className="bg-surface-inset text-muted-foreground">
            {company.opportunityCount} tracked
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {company.careersUrl ? (
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <ExternalLink className="size-3" />
              Careers page
            </a>
          ) : (
            <span className="text-subtle-foreground">No careers URL set</span>
          )}
          {company.lastCheckRun && (
            <span
              title={company.lastCheckRun.message}
              className={cn(
                company.lastCheckRun.success ? "text-muted-foreground" : "text-warning",
              )}
            >
              Last checked {formatRelativeCountdown(new Date(company.lastCheckRun.startedAt))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        <div className="flex items-center gap-1.5">
          <Switch
            checked={company.enabled}
            onCheckedChange={(checked) => updateCompany.mutate({ id: company.id, enabled: checked })}
          />
          <span className="text-[12px] text-muted-foreground">{company.enabled ? "Monitoring" : "Paused"}</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={checkCompany.isPending || !company.careersUrl}
          onClick={() => checkCompany.mutate(company.id)}
          title={!company.careersUrl ? "Add a careers URL first" : "Check opportunities now"}
        >
          {checkCompany.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Check
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Remove ${company.name} from your watchlist?`)) deleteCompany.mutate(company.id);
          }}
          aria-label="Remove company"
        >
          <Trash2 className="size-3.5 text-subtle-foreground" />
        </Button>
      </div>
    </div>
  );
}
