import { FoeSectionNav } from "@/components/foe/foe-section-nav";

// Section tabs sit above every Finance Opportunities page so Opening soon, the
// Watchlist and the original Tracker stay one click away without adding three
// more entries to the sidebar.
export default function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FoeSectionNav />
      {children}
    </>
  );
}
