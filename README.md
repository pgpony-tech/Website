# Pacific Grove Pony — website

The PG PONY league website: a static site built with [Eleventy](https://www.11ty.dev/) from the
board's brand/design system. No client framework, no CSS framework, no backend — plain HTML/CSS
and a few small vanilla-JS files, built once and served as static files.

Registration, login, and volunteer sign-up are **not** implemented on this site — they redirect to
the league's real registration platform, **SportsConnect**. This site is a front end only.

## Local development

```
npm install
npm start        # serves the site at http://localhost:8080 with live reload
```

```
npm run build     # one-shot build to _site/
```

## Project structure

- `src/*.njk` — the five pages (Home, Divisions, Schedule, Register, Volunteer)
- `src/_includes/` — shared header/footer/layout and Nunjucks component macros
  (button, card, badge, division card, game card, standings table, sponsor grid, etc.)
- `src/_data/site.json` — nav links, contact info, fee/dates, and the SportsConnect URL
- `src/_data/sponsors.json` — the real sponsor roster (31 sponsors; 6 have logo files, the
  rest render as text until logos are supplied — see `assets/sponsors/README.md`)
- `src/css/` — design tokens ported from the league's design system, then base/component/
  layout/page styles
- `src/js/` — mobile nav toggle, tab switching, and the schedule's division filter
- `assets/` — logos, league photos, sponsor logos (copied from the design package)

## Known placeholders — replace before launch

- **Schedule and standings** (`src/schedule.njk`, `src/divisions.njk`) use sample game/team
  data (marked `<!-- SAMPLE DATA -->`), not a real feed.
- **Volunteer board roster** (`src/volunteer.njk`) has role/email rows but no names — the
  league didn't have a published roster to pull from.
- **Sponsor logos**: 25 of 31 sponsors have no logo file yet and render as text. Drop a
  transparent PNG/SVG into `assets/sponsors/` and add the `logo` path to
  `src/_data/sponsors.json` as files arrive.
- **League photos** in `assets/photos/` are full-resolution originals (a few are 3–5MB each).
  Consider re-exporting them at a web-friendly size/quality before launch — Eleventy just
  copies them as-is today.

## SportsConnect

`src/_data/site.json`'s `sportsConnectUrl` is used for every Register/Login/volunteer
"Sign up" link on the site. It was captured from a real login click-through:

```
https://login.stacksports.com/login?client_id=612b0399b1854a002e427f78&redirect_uri=https://core-api.bluesombrero.com/login/redirect/portal/7295&app_name=Pacific+Grove+Pony+Baseball&portalid=7295&instancekey=sports
```

The `portalid`/`app_name`/`instancekey` parameters identify PG PONY to StackSports; `client_id`
might change if StackSports reissues one. If links stop working, get a fresh URL from a real
login click on pgpony's SportsConnect portal and update this one field.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick
   this repo.
3. Build settings:
   - **Build command**: `npm install && npx @11ty/eleventy`
   - **Build output directory**: `_site`
4. Deploy. Every push to the connected branch rebuilds and redeploys automatically.

No `wrangler.toml` or Cloudflare Workers code is needed — this is a plain static site.
