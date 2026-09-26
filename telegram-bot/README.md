# PG PONY site bot (Telegram)

A standalone Cloudflare Worker — deliberately **not** part of the main site's Worker or its
Git-integrated deploy. You message it in plain English; it asks Claude which of the six
site config keys applies and what the new value should be, validates the shape, and writes it
straight to the same `SITE_CONFIG` KV namespace (and `HERO_MEDIA` R2 bucket, for hero slide
images) that the main site reads from. Changes are live within ~30 seconds — no rebuild.

Examples:
- "Set the registration message to 🔥 Softball 6U registration is open!"
- "Field status: all fields open"
- "Add Jane Doe as the new Umpire Liaison, jane@pgpony.org"
- "Deactivate the tournament hero slide"
- Send a **photo** with a caption of `alt: <description>` (plus optional `href:`, `title:`,
  `lede:`, `cta: Label | url` lines) to add a hero rotator slide — this part doesn't involve
  Claude at all, it's just uploaded straight to R2.

`/get <key>` shows a key's raw current JSON. `/help` shows usage.

## Why a separate Worker

This intentionally isn't wired into `wrangler.jsonc`/`worker/index.js` alongside the site. It's
created and deployed by pasting `index.js` directly into a Worker in the Cloudflare dashboard
("Quick Edit"), so updating it never requires a git push — you edit and save right there.

## One-time setup

1. **Create the bot.** In Telegram, message **@BotFather** → `/newbot` → follow the prompts. It
   gives you a bot token — keep it private, anyone with it can send messages as your bot.
2. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com) (a
   different account/key than any Claude subscription — this is billed per API call, though
   Haiku is inexpensive for a low-volume bot like this).
3. **Create the Worker**: Cloudflare dashboard → Workers & Pages → Create → Worker (a blank one,
   not "connect to Git"). Give it a name (e.g. `pgpony-bot`). Open its editor and paste in the
   full contents of `index.js` from this folder. Save/deploy.
4. **Add bindings** (Worker → Settings → Bindings):
   - KV Namespace binding named `SITE_CONFIG` → select the existing namespace the main site uses
     (it's the same `SITE_CONFIG` binding on the `website` Worker — same namespace, not a new one).
   - R2 Bucket binding named `HERO_MEDIA` → the existing `hero-images` bucket.
5. **Add a variable** (Settings → Variables): `ALLOWED_CHAT_IDS` = comma-separated Telegram
   numeric user IDs, e.g. `8764132945,555555555`. Get a numeric ID by messaging **@userinfobot**
   in Telegram. This is a plain variable (not a secret) — edit it any time, no redeploy needed,
   to add or remove who's allowed to use the bot.
6. **Add three secrets** (Settings → Variables → encrypt, or `wrangler secret put NAME` if you'd
   rather use the CLI against this Worker by name):
   - `TELEGRAM_BOT_TOKEN` — from step 1.
   - `TELEGRAM_WEBHOOK_SECRET` — any random string (e.g. `openssl rand -hex 32`). Telegram echoes
     this back on every webhook call so the Worker can reject requests that aren't really from
     Telegram.
   - `ANTHROPIC_API_KEY` — from step 2.
7. **Register the webhook** — run this yourself (in a terminal, not through an AI assistant) so
   the bot token isn't shared with anyone else, replacing all three placeholders:
   ```
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>/telegram/webhook&secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>"
   ```
   `<YOUR_WORKER_URL>` is the `*.workers.dev` URL shown on the Worker's overview page (or a
   custom domain if you add one).
8. Message your bot in Telegram to confirm it's working — try `/help` first.

## Notes

- Only one key is changed per message by design — Claude is told to touch exactly the key the
  request applies to and leave the other five alone.
- Claude is explicitly told it can never invent or change a hero slide's `image` filename — that
  can only come from an actual photo upload, so it won't fabricate a broken image reference.
- If a reply says a change "didn't look right" and wasn't applied, that's `validateConfig` in
  `index.js` catching an obviously wrong shape (e.g. a missing `message` field) before it can
  reach KV and break page rendering. Rephrase the request or use `/get <key>` + the Cloudflare
  dashboard for anything unusual enough to need hand-editing.
