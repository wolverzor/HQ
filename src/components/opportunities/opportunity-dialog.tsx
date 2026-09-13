"use client";

import { useEffect, useState } from "react";
import { Trash2, Sparkles, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DIVISION_LABEL,
  PROGRAMME_TYPE_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  VERIFICATION_LABEL,
  VERIFICATION_COLOR,
} from "@/lib/labels";
import { useCreateOpportunity, useUpdateOpportunity, useDeleteOpportunity, useStartApplication } from "@/hooks/use-opportunities";
import type { OpportunityDTO, Division, ProgrammeType, OpportunityStatus, VerificationStatus } from "@/lib/types";

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: OpportunityDTO;
}

export function OpportunityDialog({ open, onOpenChange, opportunity }: OpportunityDialogProps) {
  const isEdit = !!opportunity;
  const createOpp = useCreateOpportunity();
  const updateOpp = useUpdateOpportunity();
  const deleteOpp = useDeleteOpportunity();
  const startApplication = useStartApplication();

  const [companyName, setCompanyName] = useState("");
  const [programme, setProgramme] = useState("");
  const [division, setDivision] = useState<Division>("OTHER");
  const [programmeType, setProgrammeType] = useState<ProgrammeType>("OTHER");
  const [location, setLocation] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [status, setStatus] = useState<OpportunityStatus>("NOT_OPEN");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("UNKNOWN");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-seed the form fields whenever the dialog opens for a (possibly new) opportunity.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting a form on open is not a render-purity issue */
  useEffect(() => {
    if (!open) return;
    setCompanyName(opportunity?.companyName ?? "");
    setProgramme(opportunity?.programme ?? "");
    setDivision(opportunity?.division ?? "OTHER");
    setProgrammeType(opportunity?.programmeType ?? "OTHER");
    setLocation(opportunity?.location ?? "");
    setOpeningDate(toDateInputValue(opportunity?.openingDate));
    setDeadline(toDateInputValue(opportunity?.deadline));
    setApplicationUrl(opportunity?.applicationUrl ?? "");
    setStatus(opportunity?.status ?? "NOT_OPEN");
    setVerificationStatus(opportunity?.verificationStatus ?? "UNKNOWN");
    setSource(opportunity?.source ?? "");
    setSourceUrl(opportunity?.sourceUrl ?? "");
    setOfficialUrl(opportunity?.officialUrl ?? "");
    setNotes(opportunity?.notes ?? "");
  }, [open, opportunity]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !programme.trim()) return;
    setSaving(true);

    const payload = {
      companyName: companyName.trim(),
      programme: programme.trim(),
      division,
      programmeType,
      location: location.trim() || null,
      openingDate: openingDate ? new Date(openingDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      applicationUrl: applicationUrl.trim() || null,
      status,
      verificationStatus,
      source: source.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      officialUrl: officialUrl.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateOpp.mutateAsync({ id: opportunity.id, ...payload });
      } else {
        await createOpp.mutateAsync(payload);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!opportunity) return;
    await deleteOpp.mutateAsync(opportunity.id);
    onOpenChange(false);
  }

  async function handleStartApplication() {
    if (!opportunity) return;
    await startApplication.mutateAsync(opportunity.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit opportunity" : "Add opportunity"}</DialogTitle>
            {isEdit && opportunity.verificationStatus && (
              <Badge color={VERIFICATION_COLOR[opportunity.verificationStatus]} className="mt-1.5 w-fit">
                {VERIFICATION_LABEL[opportunity.verificationStatus]}
              </Badge>
            )}
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="opp-company">Company</Label>
                <Input
                  id="opp-company"
                  className="mt-1.5"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Goldman Sachs"
                />
              </div>
              <div>
                <Label htmlFor="opp-programme">Programme</Label>
                <Input
                  id="opp-programme"
                  className="mt-1.5"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  placeholder="Spring Insight Programme"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Division</Label>
                <Select value={division} onValueChange={(v) => setDivision(v as Division)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DIVISION_LABEL) as Division[]).map((d) => (
                      <SelectItem key={d} value={d}>
                        {DIVISION_LABEL[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Programme type</Label>
                <Select value={programmeType} onValueChange={(v) => setProgrammeType(v as ProgrammeType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROGRAMME_TYPE_LABEL) as ProgrammeType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROGRAMME_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="opp-location">Location</Label>
                <Input
                  id="opp-location"
                  className="mt-1.5"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="London"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatus)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPPORTUNITY_STATUS_LABEL) as OpportunityStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {OPPORTUNITY_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="opp-opening">Opening date</Label>
                <Input
                  id="opp-opening"
                  type="date"
                  className="mt-1.5"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="opp-deadline">Deadline</Label>
                <Input
                  id="opp-deadline"
                  type="date"
                  className="mt-1.5"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="opp-apply-url">Application link</Label>
              <Input
                id="opp-apply-url"
                className="mt-1.5"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">
                Verification
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Verification status</Label>
                  <Select value={verificationStatus} onValueChange={(v) => setVerificationStatus(v as VerificationStatus)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((v) => (
                        <SelectItem key={v} value={v}>
                          {VERIFICATION_LABEL[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="opp-source">Source</Label>
                  <Input
                    id="opp-source"
                    className="mt-1.5"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Company website"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="opp-source-url">Source URL</Label>
                  <Input
                    id="opp-source-url"
                    className="mt-1.5"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="Where you found it"
                  />
                </div>
                <div>
                  <Label htmlFor="opp-official-url">Official URL</Label>
                  <Input
                    id="opp-official-url"
                    className="mt-1.5"
                    value={officialUrl}
                    onChange={(e) => setOfficialUrl(e.target.value)}
                    placeholder="Employer's own page"
                  />
                </div>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-subtle-foreground">
                Only mark &ldquo;Confirmed Open&rdquo; once you&apos;ve verified a live programme on the employer&apos;s own
                site.
              </p>
            </div>

            <div>
              <Label htmlFor="opp-notes">Notes</Label>
              <Textarea
                id="opp-notes"
                className="mt-1.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering..."
              />
            </div>

            {isEdit && opportunity.officialUrl && (
              <a
                href={opportunity.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Open official page
              </a>
            )}
          </div>

          <DialogFooter className="justify-between">
            {isEdit ? (
              <Button type="button" variant="danger-ghost" size="sm" onClick={handleDelete} className="mr-auto">
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {isEdit && opportunity.status !== "APPLYING" && opportunity.status !== "APPLIED" && (
                <Button type="button" variant="secondary" onClick={handleStartApplication}>
                  <Sparkles className="size-3.5" />
                  Start application
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!companyName.trim() || !programme.trim() || saving}>
                {isEdit ? "Save changes" : "Add opportunity"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
