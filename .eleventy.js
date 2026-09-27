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
