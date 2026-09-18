import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { DEFAULT_WATCHLIST } from "../src/lib/default-watchlist";
import { seedFoeDemoData } from "./foe-demo";

// Local demo data. Creates a sign-in-able demo account:
//   email:    demo@hq.local
//   password: hq-demo-password
// This WIPES every table first, so it refuses to run against anything but a
// local database unless you pass --force.

try {
  (process as unknown as { loadEnvFile: () => void }).loadEnvFile();
} catch {
  // No .env file — rely on the real environment.
}

const DEMO_EMAIL = "demo@hq.local";
const DEMO_PASSWORD = "hq-demo-password";

const prisma = new PrismaClient();

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function todayAt(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl) && !process.argv.includes("--force")) {
    console.error("Refusing to seed: DATABASE_URL is not a local database and seeding wipes all data. Pass --force to override.");
    process.exit(1);
  }

  console.log("Seeding HQ demo data...");

  await prisma.timeBlock.deleteMany();
  await prisma.task.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.checkRun.deleteMany();
  await prisma.company.deleteMany();
  await prisma.project.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany(); // cascades sessions + accounts

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Demo", emailVerified: true },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(DEMO_PASSWORD),
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Spring Applications 2026",
      color: "#6366f1",
      userId: user.id,
    },
  });

  // ---------------------------------------------------------------------
  // Companies (the same default watchlist every new account gets)
  // ---------------------------------------------------------------------
  await prisma.company.createMany({
    data: DEFAULT_WATCHLIST.map((c) => ({ ...c, enabled: true, userId: user.id })),
  });
  const byName = async (name: string) =>
    prisma.company.findFirstOrThrow({ where: { userId: user.id, name } });
  const [jefferies, nomura, janeStreet, goldman] = await Promise.all([
    byName("Jefferies"),
    byName("Nomura"),
    byName("Jane Street"),
    byName("Goldman Sachs"),
  ]);

  // ---------------------------------------------------------------------
  // Opportunities
  // ---------------------------------------------------------------------
  await prisma.opportunity.create({
    data: {
      companyId: jefferies.id,
      companyName: "Jefferies",
      programme: "Spring Week",
      division: "INVESTMENT_BANKING",
      programmeType: "SPRING_WEEK",
      location: "London",
      openingDate: daysFromNow(-40),
      deadline: daysFromNow(-5),
      applicationUrl: "https://www.jefferies.com/OurFirm/2/12/Careers",
      status: "APPLIED",
      dateApplied: daysFromNow(-20),
      source: "Bright Network",
      sourceUrl: "https://www.brightnetwork.co.uk/",
      officialUrl: "https://www.jefferies.com/OurFirm/2/12/Careers",
      verificationStatus: "CONFIRMED_OPEN",
      lastCheckedAt: daysFromNow(-6),
      lastVerifiedAt: daysFromNow(-6),
      userId: user.id,
      notes: "Applied via online form. Numerical test still to do.",
    },
  });

  const oppNomura = await prisma.opportunity.create({
    data: {
      companyId: nomura.id,
      companyName: "Nomura",
      programme: "Spring Week",
      division: "SALES_AND_TRADING",
      programmeType: "SPRING_WEEK",
      location: "London",
      openingDate: daysFromNow(-30),
      deadline: daysFromNow(3),
      applicationUrl: "https://www.nomura.com/careers/",
      status: "ASSESSMENT",
      dateApplied: daysFromNow(-15),
      source: "RateMyPlacement",
      sourceUrl: "https://www.ratemyplacement.co.uk/",
      officialUrl: "https://www.nomura.com/careers/",
      verificationStatus: "CONFIRMED_OPEN",
      lastCheckedAt: daysFromNow(-2),
      lastVerifiedAt: daysFromNow(-2),
      userId: user.id,
      notes: "Online assessment (numerical + logical) due before deadline.",
    },
  });

  await prisma.opportunity.create({
    data: {
      companyId: janeStreet.id,
      companyName: "Jane Street",
      programme: "First-Year Insight Programme",
      division: "QUANTITATIVE_FINANCE",
      programmeType: "INSIGHT_PROGRAMME",
      location: "London",
      openingDate: daysFromNow(-25),
      deadline: daysFromNow(-1),
      applicationUrl: "https://www.janestreet.com/join-jane-street/",
      status: "APPLIED",
      dateApplied: daysFromNow(-10),
      source: "Company website",
      sourceUrl: "https://www.janestreet.com/join-jane-street/",
      officialUrl: "https://www.janestreet.com/join-jane-street/",
      verificationStatus: "CONFIRMED_OPEN",
      lastCheckedAt: daysFromNow(-3),
      lastVerifiedAt: daysFromNow(-3),
      userId: user.id,
    },
  });

  const oppGoldman = await prisma.opportunity.create({
    data: {
      companyId: goldman.id,
      companyName: "Goldman Sachs",
      programme: "Spring Insight Programme",
      division: "INVESTMENT_BANKING",
      programmeType: "INSIGHT_PROGRAMME",
      location: "London",
      openingDate: daysFromNow(-10),
      deadline: daysFromNow(7),
      applicationUrl: "https://www.goldmansachs.com/careers/",
      status: "OPEN",
      source: "Company website",
      sourceUrl: "https://www.goldmansachs.com/careers/",
      officialUrl: "https://www.goldmansachs.com/careers/",
      verificationStatus: "CONFIRMED_OPEN",
      lastCheckedAt: daysFromNow(-1),
      lastVerifiedAt: daysFromNow(-1),
      userId: user.id,
      notes: "Not started yet — looks like a strong fit.",
    },
  });

  await prisma.opportunity.create({
    data: {
      companyName: "Morgan Stanley",
      programme: "HeadStart Programme",
      division: "PRIVATE_EQUITY",
      programmeType: "INSIGHT_PROGRAMME",
      location: "London",
      status: "NOT_OPEN",
      source: "Third-party tracker (InternMatch)",
      sourceUrl: "https://example.com/internmatch/morgan-stanley",
      verificationStatus: "NEEDS_VERIFICATION",
      userId: user.id,
      notes: "Seen on a third-party list — not yet confirmed on the official site.",
    },
  });

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------
  await prisma.task.create({
    data: {
      title: "Practise numerical assessment",
      description: "Timed practice test — aim for 80%+ before the Nomura deadline.",
      priority: "HIGH",
      category: "FINANCE_CAREER",
      estimatedMinutes: 45,
      status: "TODO",
      deadline: daysFromNow(2),
      userId: user.id,
      opportunityId: oppNomura.id,
      order: 0,
    },
  });

  const taskGoldman = await prisma.task.create({
    data: {
      title: "Complete Goldman Sachs Spring Insight application",
      description: "Fill in the online application and upload CV.",
      priority: "HIGH",
      category: "FINANCE_CAREER",
      estimatedMinutes: 60,
      status: "TODO",
      deadline: oppGoldman.deadline,
      userId: user.id,
      opportunityId: oppGoldman.id,
      order: 1,
    },
  });

  await prisma.task.create({
    data: {
      title: "Research QinetiQ",
      description: "Check whether they run a first-year scheme and what divisions hire.",
      priority: "LOW",
      category: "FINANCE_CAREER",
      estimatedMinutes: 20,
      status: "TODO",
      userId: user.id,
      order: 2,
    },
  });

  await prisma.task.create({
    data: {
      title: "Buy university backpack",
      priority: "LOW",
      category: "PERSONAL",
      estimatedMinutes: 30,
      status: "TODO",
      userId: user.id,
      order: 3,
    },
  });

  await prisma.task.create({
    data: {
      title: "Finish problem set 3 (Statistics)",
      description: "Questions 1-8, focus on confidence intervals.",
      priority: "MEDIUM",
      category: "UNIVERSITY",
      estimatedMinutes: 90,
      status: "IN_PROGRESS",
      deadline: daysFromNow(1, 17, 0),
      userId: user.id,
      order: 4,
    },
  });

  await prisma.task.create({
    data: {
      title: "Read chapter 4 for seminar",
      priority: "MEDIUM",
      category: "UNIVERSITY",
      estimatedMinutes: 40,
      status: "TODO",
      deadline: daysFromNow(3, 12, 0),
      userId: user.id,
      order: 5,
    },
  });

  await prisma.task.create({
    data: {
      title: "Tidy up personal budget spreadsheet",
      priority: "LOW",
      category: "PERSONAL",
      estimatedMinutes: 20,
      status: "DONE",
      completedAt: daysFromNow(-2),
      userId: user.id,
      order: 6,
    },
  });

  await prisma.task.create({
    data: {
      title: "Draft personal statement refresh",
      description: "Update with Jefferies spring week experience.",
      priority: "MEDIUM",
      category: "PROJECTS",
      projectId: project.id,
      estimatedMinutes: 50,
      status: "TODO",
      deadline: daysFromNow(6),
      userId: user.id,
      order: 7,
    },
  });

  await prisma.task.create({
    data: {
      title: "Call mum",
      priority: "LOW",
      category: "PERSONAL",
      estimatedMinutes: 15,
      status: "TODO",
      deadline: todayAt(19, 0),
      userId: user.id,
      order: 8,
    },
  });

  // ---------------------------------------------------------------------
  // Time blocks (today + rest of week)
  // ---------------------------------------------------------------------
  await prisma.timeBlock.create({
    data: {
      title: "Complete Goldman Sachs Spring Insight application",
      start: todayAt(10, 0),
      end: todayAt(11, 0),
      taskId: taskGoldman.id,
      userId: user.id,
      color: "#6366f1",
    },
  });

  await prisma.timeBlock.create({
    data: {
      title: "Stats problem set",
      start: todayAt(13, 0),
      end: todayAt(14, 30),
      userId: user.id,
      color: "#0ea5e9",
    },
  });

  await prisma.timeBlock.create({
    data: {
      title: "Gym",
      start: todayAt(17, 30),
      end: todayAt(18, 30),
      userId: user.id,
      color: "#22c55e",
    },
  });

  await prisma.timeBlock.create({
    data: {
      title: "Call mum",
      start: todayAt(19, 0),
      end: todayAt(19, 15),
      userId: user.id,
      color: "#f59e0b",
    },
  });

  const tomorrow = daysFromNow(1, 9, 0);
  await prisma.timeBlock.create({
    data: {
      title: "Seminar reading",
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 40 * 60 * 1000),
      userId: user.id,
      color: "#0ea5e9",
    },
  });

  // Finance Opportunity Engine demo universe. Every row it writes is
  // flagged isDemo: true and is cleared/rewritten on each seed, so it never
  // mixes with anything the live monitoring pipeline produces.
  const foe = await seedFoeDemoData(prisma, user.id);
  console.log(`FOE demo data: ${foe.firms} firms, ${foe.opportunities} opportunities (all flagged as demo).`);

  console.log(`Seed complete. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
