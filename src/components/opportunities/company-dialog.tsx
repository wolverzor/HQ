"use client";

import { useState } from "react";
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
import { useCreateCompany } from "@/hooks/use-companies";

export function CompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [notes, setNotes] = useState("");
  const createCompany = useCreateCompany();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCompany.mutateAsync({
      name: name.trim(),
      website: website.trim() || undefined,
      careersUrl: careersUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName("");
    setWebsite("");
    setCareersUrl("");
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add company to watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-3">
            <div>
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morgan Stanley" autoFocus />
            </div>
            <div>
              <Label htmlFor="company-website">Website</Label>
              <Input id="company-website" className="mt-1.5" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="company-careers">Careers page URL</Label>
              <Input
                id="company-careers"
                className="mt-1.5"
                value={careersUrl}
                onChange={(e) => setCareersUrl(e.target.value)}
                placeholder="https://.../careers"
              />
              <p className="mt-1.5 text-[11.5px] text-subtle-foreground">
                Used by &ldquo;Check opportunities&rdquo; to scan for relevant programmes.
              </p>
            </div>
            <div>
              <Label htmlFor="company-notes">Notes</Label>
              <Textarea id="company-notes" className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
