import type { Metadata } from "next";
import { ApplicationsView } from "@/components/foe/applications-view";

export const metadata: Metadata = { title: "Applications · HQ" };

export default function ApplicationsPage() {
  return <ApplicationsView />;
}
