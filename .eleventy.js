module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("assets");
  // Copied verbatim (never template-processed) since it's a self-contained,
  // pre-built export whose embedded JS isn't Nunjucks-safe to parse.
  eleventyConfig.addPassthroughCopy({ "raw-media/coaching-philosophy.html": "coaching-philosophy/index.html" });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
