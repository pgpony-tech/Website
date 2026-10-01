// /help-context.json — what the "Get help" router (worker/help-router.js)
// knows about the league. Built from the same data files as the pages, so it
// stays in sync with the site. `pages` also doubles as the allowlist of links
// the router may suggest.
module.exports = class {
  data() {
    return { permalink: "/help-context.json", eleventyExcludeFromCollections: true };
  }

  render({ site, pricing, allStars, board }) {
    const context = {
      league: {
        name: site.orgName,
        ages: "4–14",
        registration: "All registration, payment and player accounts are on SportsConnect (the Login / Register button on every page).",
        fallbackContact: "vicepresident@pgpony.org",
      },
      pages: [
        { title: "Home", href: "/", about: "Overview, key dates, field status, sponsors" },
        { title: "Play", href: "/play/", about: "Overview of playing in the league, links to divisions, schedule, fields and All-Stars" },
        { title: "Divisions and pricing", href: "/divisions/", about: "Age calculator, every baseball and softball division, spring/summer/fall pricing, sibling discount, what registration covers" },
        { title: "Schedule", href: "/schedule/", about: "Field status (rainouts/closures), key dates calendar, game schedules and scores on GameChanger" },
        { title: "Fields", href: "/fields/", about: "Field locations, which divisions use each field, concession stands, Google Maps directions" },
        { title: "All-Stars", href: "/all-stars/", about: "All-Star teams: sign-up, selection, cost, time commitment, tournaments" },
        { title: "About", href: "/about/", about: "Introduction to PG PONY: history since 1974, baseball and softball for ages 4–14, all-volunteer league, mission" },
        { title: "Board roles", href: "/board-roles/", about: "What each board position is responsible for" },
        { title: "Volunteer", href: "/volunteer/", about: "Volunteer roles: coaches, team parents, scorekeepers, concessions, field prep, board members; coaching philosophy" },
        { title: "Board of Directors", href: "/board/", about: "Every board member's role and email address" },
        { title: "Coaching philosophy", href: "/coaching-philosophy/", about: "What the league expects of coaches" },
        { title: "Division rules", href: "/rules/", about: "Playing rules for each division: PG PONY division rules, Intercity rules, USA Softball and CCS supplemental rules" },
        { title: "League policies", href: "/policies/", about: "Bylaws, board duties, child safety policy, zero tolerance policy, privacy policy" },
        { title: "Privacy policy", href: "/privacy/", about: "How the website handles visitors' information" },
      ],
      divisions: [...site.baseballDivisions, ...site.softballDivisions].map((d) => ({
        name: d.name,
        sport: d.sport,
        ages: d.ages,
      })),
      pricing,
      allStars: {
        divisions: Object.fromEntries(allStars.sports.map((s) => [s.name, s.divisions])),
        fee: allStars.fee,
        summary: allStars.sports.map((s) => `${s.name}: ${s.summary}`),
      },
      // Fallback only — the Worker prefers the live board from KV.
      board,
    };
    return JSON.stringify(context, null, 2);
  }
};
