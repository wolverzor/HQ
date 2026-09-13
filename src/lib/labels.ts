import type {
  Priority,
  TaskCategory,
  TaskStatus,
  Division,
  ProgrammeType,
  OpportunityStatus,
  VerificationStatus,
} from "@prisma/client";

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: "#0284c7",
  MEDIUM: "#d97706",
  HIGH: "#e11d48",
};

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  FINANCE_CAREER: "Finance / Career",
  UNIVERSITY: "University",
  PERSONAL: "Personal",
  PROJECTS: "Projects",
};

export const CATEGORY_COLOR: Record<TaskCategory, string> = {
  FINANCE_CAREER: "#16a34a",
  UNIVERSITY: "#4f46e5",
  PERSONAL: "#9333ea",
  PROJECTS: "#ea580c",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const DIVISION_LABEL: Record<Division, string> = {
  INVESTMENT_BANKING: "Investment Banking",
  SALES_AND_TRADING: "Sales & Trading",
  ASSET_MANAGEMENT: "Asset Management",
  PRIVATE_EQUITY: "Private Equity",
  HEDGE_FUNDS: "Hedge Funds",
  QUANTITATIVE_FINANCE: "Quantitative Finance",
  OTHER: "Other",
};

export const PROGRAMME_TYPE_LABEL: Record<ProgrammeType, string> = {
  SPRING_WEEK: "Spring Week",
  FIRST_YEAR_INTERNSHIP: "First-Year Internship",
  INSIGHT_PROGRAMME: "Insight Programme",
  OTHER: "Other",
};

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  NOT_OPEN: "Not Open",
  OPEN: "Open",
  APPLYING: "Applying",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

export const OPPORTUNITY_STATUS_COLOR: Record<OpportunityStatus, string> = {
  NOT_OPEN: "#71717a",
  OPEN: "#0284c7",
  APPLYING: "#4f46e5",
  APPLIED: "#7c3aed",
  ASSESSMENT: "#d97706",
  INTERVIEW: "#ea580c",
  OFFER: "#16a34a",
  REJECTED: "#e11d48",
  CLOSED: "#52525b",
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  CONFIRMED_OPEN: "Confirmed Open",
  NEEDS_VERIFICATION: "Needs Verification",
  CLOSED: "Closed",
  UNKNOWN: "Unknown",
};

export const VERIFICATION_COLOR: Record<VerificationStatus, string> = {
  CONFIRMED_OPEN: "#16a34a",
  NEEDS_VERIFICATION: "#d97706",
  CLOSED: "#71717a",
  UNKNOWN: "#71717a",
};
