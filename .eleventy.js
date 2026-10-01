module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("assets");
  // Copied verbatim (never template-processed) since it's a self-contained,
  // pre-built export whose embedded JS isn't Nunjucks-safe to parse.
  eleventyConfig.addPassthroughCopy({ "raw-media/coaching-philosophy.html": "coaching-philosophy/index.html" });

  // 195 -> "$195", 175.5 -> "$175.50"
  eleventyConfig.addFilter("money", (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(2)));

  // The seasons a division is offered in, as [{ season, offering }] — an
  // offering applies when it lists the division's sport and age prefix ("10U").
  eleventyConfig.addFilter("seasonsFor", (division, pricing) => {
    const [age] = division.name.split(" - ");
    return pricing.seasons.flatMap((season) => {
      const offering = season.offerings.find((o) => o.sports.includes(division.sport) && o.ages.includes(age));
      return offering ? [{ season, offering }] : [];
    });
  });

  // The board member a vacant role's "coveredBy" names, looked up by role.
  eleventyConfig.addFilter("coverer", (person, board) => {
    if (!person.coveredBy) return null;
    return ["executive", "general", "baseballReps", "softballReps"]
      .flatMap((group) => board[group] || [])
      .find((p) => p.role === person.coveredBy) || null;
  });

  // Board role -> anchor on /board-roles/ for that role's duties. Keys are
  // normalized titles (and aliases) so "Coach & Player Development" or
  // "Field Assistant 1" still match; src/js/live-data.js normalizes the same way.
  const roleKey = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[\u2013\u2014]/g, "-").replace(/\s+\d+$/, "").replace(/s$/, "").replace(/\s+/g, " ").trim();
  eleventyConfig.addFilter("dutyLinks", (boardRoles) => {
    const written = new Set(boardRoles.roles.map((r) => r.id));
    const links = {};
    for (const t of boardRoles.toc) {
      if (!written.has(t.id)) continue;
      for (const title of [t.title, ...(t.aliases || [])]) links[roleKey(title)] = t.id;
    }
    return links;
  });
  eleventyConfig.addFilter("roleIds", (roles) => roles.map((r) => r.id));
  // Division reps share one duties section; everyone else is looked up by title.
  eleventyConfig.addFilter("dutyHref", (role, links, isRep) => {
    const id = links[roleKey(isRep ? "Division Representatives" : role)];
    return id ? `/board-roles/#${id}` : "";
  });

  // Marks which sport a division belongs to on its red ribbon.
  eleventyConfig.addFilter("sportEmoji", (sport) => (sport === "Softball" ? "🥎" : "⚾"));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
