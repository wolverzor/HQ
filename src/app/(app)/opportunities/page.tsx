import type { Metadata } from "next";
import { FoeDashboard } from "@/components/foe/foe-dashboard";

export const metadata: Metadata = { title: "Finance Opportunities · HQ" };

// The FOE overview is now the front door of this section. The original
// spreadsheet tracker and company watchlist are preserved at
// /opportunities/tracker.
export default function FinanceOpportunitiesPage() {
  return <FoeDashboard />;
}
