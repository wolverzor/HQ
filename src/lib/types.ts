import type {
  Priority,
  TaskStatus,
  TaskCategory,
  Division,
  ProgrammeType,
  OpportunityStatus,
  VerificationStatus,
} from "@prisma/client";

export type {
  Priority,
  TaskStatus,
  TaskCategory,
  Division,
  ProgrammeType,
  OpportunityStatus,
  VerificationStatus,
};

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  category: TaskCategory;
  estimatedMinutes: number | null;
  status: TaskStatus;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  opportunityId: string | null;
  opportunity: { id: string; companyName: string; programme: string } | null;
  timeBlocks: { id: string; start: string; end: string }[];
}

export interface TimeBlockDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  completed: boolean;
  notes: string | null;
  taskId: string | null;
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    estimatedMinutes: number | null;
  } | null;
}

export interface ProjectDTO {
  id: string;
  name: string;
  color: string;
  archived: boolean;
}

export interface CompanyDTO {
  id: string;
  name: string;
  website: string | null;
  careersUrl: string | null;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  opportunityCount: number;
  lastCheckRun: CheckRunDTO | null;
}

export interface CheckRunDTO {
  id: string;
  companyId: string;
  startedAt: string;
  finishedAt: string | null;
  success: boolean;
  message: string;
  matchCount: number;
}

export interface OpportunityDTO {
  id: string;
  companyId: string | null;
  companyName: string;
  programme: string;
  division: Division;
  programmeType: ProgrammeType;
  location: string | null;
  openingDate: string | null;
  deadline: string | null;
  applicationUrl: string | null;
  status: OpportunityStatus;
  dateApplied: string | null;
  notes: string | null;
  source: string | null;
  sourceUrl: string | null;
  officialUrl: string | null;
  verificationStatus: VerificationStatus;
  lastCheckedAt: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
}
