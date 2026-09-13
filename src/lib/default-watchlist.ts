// The starter watchlist every new account gets, across IB, PE, AM, and
// Sales & Trading / hedge funds / quant — so discovery isn't limited to
// companies added by hand. Careers URLs are best-effort public links: if one
// is wrong or a site blocks automated requests, the check just fails
// gracefully for that company (see src/lib/discovery.ts) rather than
// reporting anything false.
export const DEFAULT_WATCHLIST: { name: string; website: string; careersUrl: string }[] = [
  // Investment banking
  { name: "Goldman Sachs", website: "https://www.goldmansachs.com", careersUrl: "https://www.goldmansachs.com/careers/" },
  { name: "Morgan Stanley", website: "https://www.morganstanley.com", careersUrl: "https://www.morganstanley.com/people-opportunities/students-graduates" },
  { name: "JPMorgan Chase", website: "https://www.jpmorgan.com", careersUrl: "https://careers.jpmorgan.com/global/en/students" },
  { name: "Bank of America", website: "https://www.bankofamerica.com", careersUrl: "https://campus.bofa.com/" },
  { name: "Citi", website: "https://www.citigroup.com", careersUrl: "https://jobs.citi.com/students-and-graduates" },
  { name: "Barclays", website: "https://home.barclays", careersUrl: "https://search.jobs.barclays/early-careers" },
  { name: "HSBC", website: "https://www.hsbc.com", careersUrl: "https://www.hsbc.com/careers/students-and-graduates" },
  { name: "Deutsche Bank", website: "https://www.db.com", careersUrl: "https://careers.db.com/students-graduates/" },
  { name: "UBS", website: "https://www.ubs.com", careersUrl: "https://www.ubs.com/global/en/careers/students-and-graduates.html" },
  { name: "Nomura", website: "https://www.nomura.com", careersUrl: "https://www.nomura.com/careers/" },
  { name: "Jefferies", website: "https://www.jefferies.com", careersUrl: "https://www.jefferies.com/OurFirm/2/12/Careers" },
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
  { name: "Jane Street", website: "https://www.janestreet.com", careersUrl: "https://www.janestreet.com/join-jane-street/" },
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
