import type { Metadata } from "next";
import { AssessmentsView } from "@/components/assessments/assessments-view";

export const metadata: Metadata = { title: "Assessments · HQ" };

export default function AssessmentsPage() {
  return <AssessmentsView />;
}
