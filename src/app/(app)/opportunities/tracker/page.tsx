import type { Metadata } from "next";
import { OpportunitiesView } from "@/components/opportunities/opportunities-view";

export const metadata: Metadata = { title: "Tracker · HQ" };

// The original HQ opportunity tracker: the editable spreadsheet view and the
// per-account company watchlist. Untouched by FOE, and still the place to keep
// opportunities you entered yourself.
export default function TrackerPage() {
  return <OpportunitiesView />;
}
