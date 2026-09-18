import type { Metadata } from "next";
import { OpeningSoonView } from "@/components/foe/opening-soon-view";

export const metadata: Metadata = { title: "Opening soon · HQ" };

export default function OpeningSoonPage() {
  return <OpeningSoonView />;
}
