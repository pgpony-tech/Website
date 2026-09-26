# Pacific Grove Pony — website

The PG PONY league website: a static site built with [Eleventy](https://www.11ty.dev/) from the
board's brand/design system. No client framework, no CSS framework — plain HTML/CSS and a few
small vanilla-JS files, built once and served as static files by a Cloudflare Worker.

A handful of things that change often (board roster, field status, sponsors, the registration
banner, the homepage hero rotator) are **not** rebaked into the static build — they live in
Cloudflare KV/R2 and are edited straight from the Cloudflare dashboard, no deploy required. See
[Live-editable content](#live-editable-content-cloudflare-kv--r2) below.

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
- `src/_data/board.json`, `fields.json`, `fieldStatus.json`, `sponsors.json` — build-time
  **seed/fallback** copies of data that's actually live-edited in Cloudflare KV (see below).
  What's committed here is what renders before the client-side fetch resolves (or if it fails),
  so it's worth keeping roughly in sync, but it's not the source of truth once the site is live.
- `src/css/` — design tokens ported from the league's design system, then base/component/
  layout/page styles
- `src/js/` — mobile nav toggle, tab switching, the schedule's division filter, and
  `live-data.js` (fetches board/fields/field-status/sponsors/registration-status/hero-slides
  from the Worker's `/api/*` routes and hydrates the corresponding page sections)
- `assets/` — logos, league photos, sponsor logos (copied from the design package)
- `worker/index.js` — the Cloudflare Worker: serves the static build, the `/api/*` KV-backed
  routes, and `/media/*` (proxies images out of the `hero-images` R2 bucket)
- `wrangler.jsonc` — Worker config: name, static assets directory, KV namespace binding
  (`SITE_CONFIG`), R2 bucket binding (`HERO_MEDIA`)
- `telegram-bot/` — a separate Telegram bot Worker (deployed independently, see its own README)
  for updating the same KV/R2 data by messaging Claude in plain English

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

## Deploying

This repo is connected to a Cloudflare Worker named **`website`** via Git integration (Workers
Builds) — every push to `main` triggers a build (`npm run build`) and deploy (`wrangler deploy`)
automatically. `wrangler.jsonc` defines the Worker: it serves the static `_site` build for
everything except `/api/*` and `/media/*`, which `worker/index.js` handles itself (see below).

To work on the Worker locally against the *real* KV/R2 data (not a local emulation):

```
npx wrangler dev --remote
```

For local testing of the Telegram bot, put its two secrets in a `.dev.vars` file at the repo
root (gitignored, never committed) — `wrangler dev` loads it automatically:
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
```

## Live-editable content (Cloudflare KV + R2)

Six pieces of content are stored in the `SITE_CONFIG` KV namespace and served by the Worker at
`/api/<key>`, instead of being baked into the build. **To update any of them: Cloudflare dashboard
→ Workers & Pages → KV → `SITE_CONFIG` → click the key → edit the JSON value → Save.** Changes
reach the live site within about 30 seconds (the API responses are cached that long) — no
deploy involved.

| KV key | Used on | Shape |
|---|---|---|
| `board` | Volunteer page | Same shape as `src/_data/board.json` (executive/general/rep lists) |
| `fields` | Schedule page | Same shape as `src/_data/fields.json` (array of field objects) |
| `field-status` | Schedule page | `{ "tone": "success\|warning\|danger\|info", "title": "...", "message": "..." }` |
| `sponsors` | Homepage | Same shape as `src/_data/sponsors.json` (array of `{name, url, logo?}`) |
| `registration-status` | Every page (top bar) | `{ "message": "..." }` — plain text, rendered as-is. **Emoji work fine** (🔥, 🌧️, ⚾️, etc.) since it's just Unicode text — no icon library needed. Keep it to one line; there's no line-wrapping in the bar. |
| `hero-slides` | Homepage hero | Array of up to 4 slide objects — see **Hero rotator** below |

If a key is ever missing/empty, the corresponding section just falls back to whatever's baked
into the build from `src/_data/` (or, for the hero rotator, to no rotator at all).

### Hero rotator

The homepage hero always shows its primary photo + headline first — that part is static, baked
into `src/index.njk`, and never changes based on KV. On top of that, `hero-slides` can add **up
to 4 more slides** that auto-rotate in (fading in/out every 6s, pausing on hover/focus, dots to
jump directly to one). If `hero-slides` is `[]` or has no `active` entries, none of that shows up
— the hero looks exactly like a single static image, no dots.

Images live in the **`hero-images` R2 bucket**. To upload one: Cloudflare dashboard → R2 →
`hero-images` → Upload. Use the exact filename as the `image` field below.

Each entry in the `hero-slides` array looks like this (all fields but `id`/`active`/`image` are
optional):

```json
{
  "id": "any-unique-string",
  "active": true,
  "image": "exact-filename-in-the-r2-bucket.jpg",
  "alt": "Accessible description of the image",

  "title": "Optional headline overlaid on the image",
  "eyebrow": "Optional small label above the title",
  "lede": "Optional one-sentence description under the title",
  "ctaLabel": "Optional button text",
  "ctaHref": "Optional button link (required if ctaLabel is set)",

  "href": "Optional — makes the whole slide a clickable link (only used when title/lede/ctaLabel are all omitted)"
}
```

**There are two kinds of slide — which one you get depends on whether you set `title`/`lede`/
`ctaLabel` at all:**

1. **Photo + overlay text** (set `title` and/or `lede` and/or `ctaLabel`+`ctaHref`) — a photo
   with a dark scrim and white text on top, matching the primary hero's look. Use this for a
   real photo that needs a headline and a call-to-action button added on top of it.
   - **Image dimensions**: same idea as the primary hero — landscape, **at least 1920×960px**
     (2:1) so it stays sharp on wide screens, with a **web-optimized file size** (compress it;
     don't upload a multi-megabyte camera original). It's cropped to fill the hero box
     (`object-fit: cover`), so keep the important subject centered — the far left/right and
     top/bottom edges may get cropped on very wide or very narrow (mobile) screens.
   - Set only the fields you need — e.g. `title` + `ctaLabel`/`ctaHref` with no `lede` is fine.

2. **Pre-made graphic** (leave `title`, `lede`, and `ctaLabel` all unset) — for an image that
   already has all its text/design baked in (an announcement graphic, a flyer). Shown **as-is,
   full image visible, no scrim, no cropping** (`object-fit: contain`). Set `href` if you want
   the whole graphic to be clickable (e.g. to a signup link); leave it out for a purely
   informational slide.
   - **Image dimensions**: a wide banner aspect ratio works best, roughly **1600×600 to
     1920×720px** (~2.5:1 to 2.7:1) — that's what the hero box's proportions look like on a
     typical desktop. It won't ever get cropped (whatever you upload displays in full), but a
     very different aspect ratio means more letterboxing above/below or beside it.
   - **Background color**: design the graphic on a **`#4A0E00`** background (the hero's own
     background color) so any letterboxing blends in seamlessly instead of showing a visible
     box around your graphic.

Order in the array = display order (the primary photo is always first/slide 0, so array index 0
becomes slide 1, etc.). Set `"active": false` (or delete the entry) to pull a slide without
losing its data for later.

> **Note on the R2 custom domain**: a custom domain (`hero-images.pgpony.org`) was set up for
> the bucket but currently gets intercepted by an existing redirect on the `pgpony.org` zone
> before it reaches R2. That's not needed for any of this to work — the Worker serves images
> straight from the bucket via its R2 binding at `/media/<filename>` — but it's worth fixing in
> Rules → Redirect Rules/Page Rules if you want the bucket's public URL to work too.

## Telegram bot

Everything in [Live-editable content](#live-editable-content-cloudflare-kv--r2) can also be
updated by messaging a Telegram bot in plain English, instead of using the Cloudflare dashboard —
handy from a phone. It's a **separate, standalone Worker** (not part of this repo's Git-integrated
deploy) — see `telegram-bot/README.md` for what it is and the full setup checklist. Deployed by
pasting `telegram-bot/index.js` into a Worker created directly in the Cloudflare dashboard.

It reads/writes the same `SITE_CONFIG` KV namespace and `HERO_MEDIA` R2 bucket as the main site
Worker, so changes are still live within ~30 seconds, no rebuild. A message like "set the
registration message to 🔥 Softball 6U is open" or "remove Jane Doe as Umpire Liaison" is sent to
Claude along with the current value of all six config keys; Claude decides which key applies and
returns the complete new value, which gets validated and written to KV. Sending a **photo** with a
caption adds a hero rotator slide directly (no Claude involved — that part's just file handling).
