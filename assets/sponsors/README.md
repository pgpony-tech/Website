# Sponsor logos

`sponsors.json` holds the 31 sponsors listed on pgpony.com, with the name and link for each and the
filename the `SponsorGrid` component expects.

## Status

Six logos are here so far, supplied by the league at the current site's 102×68px thumbnail size:
`evergreen-building-inc`, `monterey-firefighter-foundation`, `vanderbilt-cpas`, `tj-bristol-realtor`,
`dick-s-sporting-goods`, `sharp-corners-sports-cards-and-collectibles`.

**These are low-resolution placeholders.** At 102×68 they are soft on a standard display and unusable
on a retina one or in print. `SponsorGrid` caps them at their native size rather than upscaling, so
they stay honest rather than blurry. Replace them with higher-resolution files as the league collects
them — sponsors will normally send artwork on request.

The remaining 25 have no file yet. `SponsorGrid` renders the sponsor's name in Barlow Condensed
wherever a file is missing, so the section works today and improves as files arrive. The logos are
the sponsors' own trademarks; do not redraw or trace them.

To add one: drop a transparent PNG or SVG at the `logo` path named in `sponsors.json`. Aim for
roughly 400×270px at 2× (the current site caps thumbnails at 102×68, which is why they look soft).
