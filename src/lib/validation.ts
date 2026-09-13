import { z } from "zod";

export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const taskCategoryEnum = z.enum(["FINANCE_CAREER", "UNIVERSITY", "PERSONAL", "PROJECTS"]);

export const divisionEnum = z.enum([
  "INVESTMENT_BANKING",
  "SALES_AND_TRADING",
  "ASSET_MANAGEMENT",
  "PRIVATE_EQUITY",
  "HEDGE_FUNDS",
  "QUANTITATIVE_FINANCE",
  "OTHER",
]);
export const programmeTypeEnum = z.enum([
  "SPRING_WEEK",
  "FIRST_YEAR_INTERNSHIP",
  "INSIGHT_PROGRAMME",
  "OTHER",
]);
export const opportunityStatusEnum = z.enum([
  "NOT_OPEN",
  "OPEN",
  "APPLYING",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "CLOSED",
]);
export const verificationStatusEnum = z.enum([
  "CONFIRMED_OPEN",
  "NEEDS_VERIFICATION",
  "CLOSED",
  "UNKNOWN",
]);

const optionalString = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v))
  .nullable()
  .optional();

const optionalDate = z
  .string()
  .datetime()
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalString,
  deadline: optionalDate,
  priority: priorityEnum.optional(),
  category: taskCategoryEnum.optional(),
  estimatedMinutes: z.number().int().positive().max(24 * 60).nullable().optional(),
  status: taskStatusEnum.optional(),
  projectId: optionalString,
  opportunityId: optionalString,
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  order: z.number().int().optional(),
});

export const reorderTasksSchema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })).min(1),
});

export const createTimeBlockSchema = z.object({
  title: z.string().trim().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  taskId: optionalString,
  color: z.string().optional(),
  notes: optionalString,
});

export const updateTimeBlockSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  taskId: optionalString,
  color: z.string().optional(),
  notes: optionalString,
  completed: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: optionalString,
  careersUrl: optionalString,
  notes: optionalString,
  enabled: z.boolean().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const createOpportunitySchema = z.object({
  companyId: optionalString,
  companyName: z.string().trim().min(1).max(160),
  programme: z.string().trim().min(1).max(200),
  division: divisionEnum.optional(),
  programmeType: programmeTypeEnum.optional(),
  location: optionalString,
  openingDate: optionalDate,
  deadline: optionalDate,
  applicationUrl: optionalString,
  status: opportunityStatusEnum.optional(),
  dateApplied: optionalDate,
  notes: optionalString,
  source: optionalString,
  sourceUrl: optionalString,
  officialUrl: optionalString,
  verificationStatus: verificationStatusEnum.optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();
