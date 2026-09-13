"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetDateCell, SheetSelectCell, SheetTextCell } from "./sheet-cells";
import { OpportunityDialog } from "./opportunity-dialog";
import { useDeleteOpportunity, useStartApplication, useUpdateOpportunity } from "@/hooks/use-opportunities";
import {
  DIVISION_LABEL,
  PROGRAMME_TYPE_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_COLOR,
  VERIFICATION_LABEL,
  VERIFICATION_COLOR,
} from "@/lib/labels";
import { isOverdue, isUpcoming } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import type { OpportunityDTO, Division, OpportunityStatus, ProgrammeType, VerificationStatus } from "@/lib/types";

type SortKey = "companyName" | "deadline" | "openingDate" | "status" | "verificationStatus";
type SortDir = "asc" | "desc";

const DIVISION_OPTIONS = (Object.keys(DIVISION_LABEL) as Division[]).map((v) => ({ value: v, label: DIVISION_LABEL[v] }));
const TYPE_OPTIONS = (Object.keys(PROGRAMME_TYPE_LABEL) as ProgrammeType[]).map((v) => ({
  value: v,
  label: PROGRAMME_TYPE_LABEL[v],
}));
const STATUS_OPTIONS = (Object.keys(OPPORTUNITY_STATUS_LABEL) as OpportunityStatus[]).map((v) => ({
  value: v,
  label: OPPORTUNITY_STATUS_LABEL[v],
}));
const VERIFICATION_OPTIONS = (Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((v) => ({
  value: v,
  label: VERIFICATION_LABEL[v],
}));

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className="flex items-center gap-1 cursor-pointer hover:text-foreground"
    >
      {label}
      {active ? (
        sort.dir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

const th = "sticky top-0 z-10 border-b border-border bg-surface px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground whitespace-nowrap";
const td = "border-b border-border/70 p-0.5 align-middle";

export function OpportunitySheet({ opportunities }: { opportunities: OpportunityDTO[] }) {
  const updateOpp = useUpdateOpportunity();
  const deleteOpp = useDeleteOpportunity();
  const startApplication = useStartApplication();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "deadline", dir: "asc" });
  const [detailOpp, setDetailOpp] = useState<OpportunityDTO | null>(null);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const sorted = useMemo(() => {
    const copy = [...opportunities];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "companyName") cmp = a.companyName.localeCompare(b.companyName);
      else if (sort.key === "status") cmp = a.status.localeCompare(b.status);
      else if (sort.key === "verificationStatus") cmp = a.verificationStatus.localeCompare(b.verificationStatus);
      else {
        const av = a[sort.key] ? new Date(a[sort.key] as string).getTime() : null;
        const bv = b[sort.key] ? new Date(b[sort.key] as string).getTime() : null;
        if (av === null && bv === null) cmp = 0;
        else if (av === null) cmp = 1;
        else if (bv === null) cmp = -1;
        else cmp = av - bv;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [opportunities, sort]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1400px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={cn(th, "sticky left-0 z-20 min-w-[160px]")}>
              <SortHeader label="Company" sortKey="companyName" sort={sort} onToggle={toggleSort} />
            </th>
            <th className={cn(th, "min-w-[200px]")}>Programme</th>
            <th className={cn(th, "min-w-[160px]")}>Division</th>
            <th className={cn(th, "min-w-[160px]")}>Type</th>
            <th className={cn(th, "min-w-[120px]")}>Location</th>
            <th className={cn(th, "min-w-[130px]")}>
              <SortHeader label="Opening" sortKey="openingDate" sort={sort} onToggle={toggleSort} />
            </th>
            <th className={cn(th, "min-w-[130px]")}>
              <SortHeader label="Deadline" sortKey="deadline" sort={sort} onToggle={toggleSort} />
            </th>
            <th className={cn(th, "min-w-[130px]")}>
              <SortHeader label="Status" sortKey="status" sort={sort} onToggle={toggleSort} />
            </th>
            <th className={cn(th, "min-w-[150px]")}>
              <SortHeader label="Verification" sortKey="verificationStatus" sort={sort} onToggle={toggleSort} />
            </th>
            <th className={cn(th, "min-w-[130px]")}>Applied</th>
            <th className={cn(th, "min-w-[150px]")}>Source</th>
            <th className={cn(th, "min-w-[220px]")}>Notes</th>
            <th className={cn(th, "min-w-[110px] text-right")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => {
            const deadline = o.deadline ? new Date(o.deadline) : null;
            const overdue = deadline ? isOverdue(deadline) && o.status !== "APPLIED" : false;
            const soon = deadline ? isUpcoming(deadline, 7) : false;
            const canStart = o.status === "NOT_OPEN" || o.status === "OPEN";

            return (
              <tr key={o.id} className="group hover:bg-surface-hover/60">
                <td className={cn(td, "sticky left-0 z-10 bg-surface group-hover:bg-surface-hover")}>
                  <SheetTextCell
                    value={o.companyName}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, companyName: v })}
                  />
                </td>
                <td className={td}>
                  <button
                    type="button"
                    onClick={() => setDetailOpp(o)}
                    className="block w-full truncate rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-foreground hover:bg-surface-hover cursor-pointer"
                    title="Open full details"
                  >
                    {o.programme}
                  </button>
                </td>
                <td className={td}>
                  <SheetSelectCell
                    value={o.division}
                    options={DIVISION_OPTIONS}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, division: v })}
                  />
                </td>
                <td className={td}>
                  <SheetSelectCell
                    value={o.programmeType}
                    options={TYPE_OPTIONS}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, programmeType: v })}
                  />
                </td>
                <td className={td}>
                  <SheetTextCell
                    value={o.location ?? ""}
                    placeholder="—"
                    onCommit={(v) => updateOpp.mutate({ id: o.id, location: v })}
                  />
                </td>
                <td className={td}>
                  <SheetDateCell
                    value={toDateInputValue(o.openingDate)}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, openingDate: fromDateInputValue(v) })}
                  />
                </td>
                <td className={td}>
                  <SheetDateCell
                    value={toDateInputValue(o.deadline)}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, deadline: fromDateInputValue(v) })}
                    className={cn(overdue && "text-danger", !overdue && soon && "text-warning")}
                  />
                </td>
                <td className={td}>
                  <SheetSelectCell
                    value={o.status}
                    options={STATUS_OPTIONS}
                    colorFor={(v) => OPPORTUNITY_STATUS_COLOR[v]}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, status: v })}
                  />
                </td>
                <td className={td}>
                  <SheetSelectCell
                    value={o.verificationStatus}
                    options={VERIFICATION_OPTIONS}
                    colorFor={(v) => VERIFICATION_COLOR[v]}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, verificationStatus: v })}
                  />
                </td>
                <td className={td}>
                  <SheetDateCell
                    value={toDateInputValue(o.dateApplied)}
                    onCommit={(v) => updateOpp.mutate({ id: o.id, dateApplied: fromDateInputValue(v) })}
                  />
                </td>
                <td className={td}>
                  <SheetTextCell
                    value={o.source ?? ""}
                    placeholder="—"
                    onCommit={(v) => updateOpp.mutate({ id: o.id, source: v })}
                  />
                </td>
                <td className={td}>
                  <SheetTextCell
                    value={o.notes ?? ""}
                    placeholder="Add a note..."
                    onCommit={(v) => updateOpp.mutate({ id: o.id, notes: v })}
                  />
                </td>
                <td className={cn(td, "px-1")}>
                  <div className="flex items-center justify-end gap-0.5 pr-1">
                    {canStart && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Start application"
                        onClick={() => startApplication.mutate(o.id)}
                        disabled={startApplication.isPending}
                      >
                        <Sparkles className="size-3.5" />
                      </Button>
                    )}
                    {o.applicationUrl && (
                      <Button size="icon-sm" variant="ghost" title="Open application link" asChild>
                        <a href={o.applicationUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete ${o.companyName} — ${o.programme}?`)) deleteOpp.mutate(o.id);
                      }}
                    >
                      <Trash2 className="size-3.5 text-subtle-foreground" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {detailOpp && (
        <OpportunityDialog open={!!detailOpp} onOpenChange={(o) => !o && setDetailOpp(null)} opportunity={detailOpp} />
      )}
    </div>
  );
}
