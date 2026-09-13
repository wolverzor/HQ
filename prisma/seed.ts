import { PrismaClient } from "@prisma/client";
import { DEMO_USER_ID } from "../src/lib/constants";

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
  console.log("Seeding HQ demo data...");

  await prisma.timeBlock.deleteMany();
  await prisma.task.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.checkRun.deleteMany();
  await prisma.company.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      email: "you@example.com",
      name: "You",
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
  // Companies (watchlist)
  // ---------------------------------------------------------------------
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "Jefferies",
        website: "https://www.jefferies.com",
        careersUrl: "https://www.jefferies.com/OurFirm/2/12/Careers",
        enabled: true,
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Nomura",
        website: "https://www.nomura.com",
        careersUrl: "https://www.nomura.com/careers/",
        enabled: true,
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Jane Street",
        website: "https://www.janestreet.com",
        careersUrl: "https://www.janestreet.com/join-jane-street/",
        enabled: true,
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "QinetiQ",
        website: "https://www.qinetiq.com",
        careersUrl: "https://www.qinetiq.com/en/careers",
        enabled: false,
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Goldman Sachs",
        website: "https://www.goldmansachs.com",
        careersUrl: "https://www.goldmansachs.com/careers/",
        enabled: true,
        userId: user.id,
      },
    }),
  ]);
  const [jefferies, nomura, janeStreet, , goldman] = companies;

  // A broad default watchlist across IB, PE, AM, and Sales & Trading /
  // hedge funds / quant, so discovery isn't limited to companies you've
  // added by hand. Careers URLs are best-effort public links — if one is
  // wrong or a site blocks automated requests, the check just fails
  // gracefully for that company (see src/lib/discovery.ts) rather than
  // reporting anything false.
  const WATCHLIST_ADDITIONS: { name: string; website: string; careersUrl: string }[] = [
    // Investment banking
    { name: "Morgan Stanley", website: "https://www.morganstanley.com", careersUrl: "https://www.morganstanley.com/people-opportunities/students-graduates" },
    { name: "JPMorgan Chase", website: "https://www.jpmorgan.com", careersUrl: "https://careers.jpmorgan.com/global/en/students" },
    { name: "Bank of America", website: "https://www.bankofamerica.com", careersUrl: "https://campus.bofa.com/" },
    { name: "Citi", website: "https://www.citigroup.com", careersUrl: "https://jobs.citi.com/students-and-graduates" },
    { name: "HSBC", website: "https://www.hsbc.com", careersUrl: "https://www.hsbc.com/careers/students-and-graduates" },
    { name: "Deutsche Bank", website: "https://www.db.com", careersUrl: "https://careers.db.com/students-graduates/" },
    { name: "UBS", website: "https://www.ubs.com", careersUrl: "https://www.ubs.com/global/en/careers/students-and-graduates.html" },
    { name: "RBC Capital Markets", website: "https://www.rbccm.com", careersUrl: "https://jobs.rbc.com/ca/en/students-graduates" },
    { name: "Lazard", website: "https://www.lazard.com", careersUrl: "https://www.lazard.com/careers/" },
    { name: "Evercore", website: "https://www.evercore.com", careersUrl: "https://www.evercore.com/careers/" },
    { name: "Moelis & Company", website: "https://www.moelis.com", careersUrl: "https://www.moelis.com/careers/" },
    { name: "Rothschild & Co", website: "https://www.rothschildandco.com", careersUrl: "https://www.rothschildandco.com/en/careers/" },
    { name: "Houlihan Lokey", website: "https://hl.com", careersUrl: "https://hl.com/careers/" },
    { name: "Centerview Partners", website: "https://www.centerviewpartners.com", careersUrl: "https://www.centerviewpartners.com/careers" },
    // Private equity
    { name: "Blackstone", website: "https://www.blackstone.com", careersUrl: "https://www.blackstone.com/careers/" },
    { name: "KKR", website: "https://www.kkr.com", careersUrl: "https://www.kkr.com/careers" },
    { name: "Apollo Global Management", website: "https://www.apollo.com", careersUrl: "https://www.apollo.com/careers" },
    { name: "Carlyle Group", website: "https://www.carlyle.com", careersUrl: "https://www.carlyle.com/careers" },
    { name: "CVC Capital Partners", website: "https://www.cvc.com", careersUrl: "https://www.cvc.com/careers/" },
    { name: "Bain Capital", website: "https://www.baincapital.com", careersUrl: "https://www.baincapital.com/careers" },
    { name: "Permira", website: "https://www.permira.com", careersUrl: "https://www.permira.com/careers/" },
    { name: "Ardian", website: "https://www.ardian.com", careersUrl: "https://www.ardian.com/careers" },
    // Asset management
    { name: "BlackRock", website: "https://www.blackrock.com", careersUrl: "https://careers.blackrock.com/students" },
    { name: "Vanguard", website: "https://www.vanguard.com", careersUrl: "https://about.vanguard.com/careers/" },
    { name: "Fidelity International", website: "https://www.fidelityinternational.com", careersUrl: "https://careers.fidelityinternational.com/" },
    { name: "PIMCO", website: "https://www.pimco.com", careersUrl: "https://careers.pimco.com/" },
    { name: "Wellington Management", website: "https://www.wellington.com", careersUrl: "https://www.wellington.com/en/careers" },
    { name: "Schroders", website: "https://www.schroders.com", careersUrl: "https://www.schroders.com/en/careers/" },
    { name: "M&G Investments", website: "https://www.mandg.com", careersUrl: "https://www.mandg.com/careers" },
    // Sales & trading / hedge funds / quant
    { name: "Optiver", website: "https://optiver.com", careersUrl: "https://optiver.com/working-at-optiver/graduates-interns/" },
    { name: "IMC Trading", website: "https://www.imc.com", careersUrl: "https://careers.imc.com/" },
    { name: "Citadel Securities", website: "https://www.citadelsecurities.com", careersUrl: "https://www.citadelsecurities.com/careers/" },
    { name: "DRW", website: "https://drw.com", careersUrl: "https://drw.com/careers" },
    { name: "Susquehanna International Group (SIG)", website: "https://sig.com", careersUrl: "https://sig.com/careers/" },
    { name: "Two Sigma", website: "https://www.twosigma.com", careersUrl: "https://www.twosigma.com/careers/" },
    { name: "Man Group", website: "https://www.man.com", careersUrl: "https://www.man.com/careers" },
    { name: "Millennium Management", website: "https://www.millenniummgmt.com", careersUrl: "https://www.millenniummgmt.com/careers/" },
    { name: "Point72", website: "https://point72.com", careersUrl: "https://point72.com/careers/" },
    { name: "D. E. Shaw", website: "https://www.deshaw.com", careersUrl: "https://www.deshaw.com/careers" },
    { name: "Marshall Wace", website: "https://www.marshallwace.com", careersUrl: "https://www.marshallwace.com/careers" },
    { name: "Brevan Howard", website: "https://www.brevanhoward.com", careersUrl: "https://www.brevanhoward.com/careers/" },
    { name: "XTX Markets", website: "https://www.xtxmarkets.com", careersUrl: "https://www.xtxmarkets.com/careers/" },
    { name: "Flow Traders", website: "https://www.flowtraders.com", careersUrl: "https://www.flowtraders.com/careers" },
    { name: "Qube Research & Technologies", website: "https://www.qube-rt.com", careersUrl: "https://www.qube-rt.com/careers" },
    { name: "G-Research", website: "https://www.gresearch.com", careersUrl: "https://www.gresearch.com/careers/" },
  ];

  await Promise.all(
    WATCHLIST_ADDITIONS.map((c) =>
      prisma.company.create({
        data: { name: c.name, website: c.website, careersUrl: c.careersUrl, enabled: true, userId: user.id },
      }),
    ),
  );

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

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
