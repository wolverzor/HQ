import type { Metadata } from "next";
import { FoeWatchlistView } from "@/components/foe/foe-watchlist-view";

export const metadata: Metadata = { title: "Watchlist · HQ" };

export default function FoeWatchlistPage() {
  return <FoeWatchlistView />;
}
