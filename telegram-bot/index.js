// PG PONY site bot: message it in plain English -> Claude decides which KV key changes
// and to what -> written straight to the SITE_CONFIG KV namespace (same one the site's
// Worker reads from). Live on the site within ~30s, no rebuild/deploy involved.
//
// A photo with a caption is handled separately (no Claude call): it's uploaded to the
// HERO_MEDIA R2 bucket and appended to the hero-slides array as a new rotator slide.
//
// Deploy: paste this whole file into a new Worker (dashboard -> Workers & Pages -> Create),
// then add bindings/vars/secrets — see telegram-bot/README.md for the full checklist.

const MODEL = "claude-haiku-4-5-20251001"; // cheap and fast; plenty for this job
const MAX_ACTIVE_HERO_SLIDES = 4;
const MAX_REPLY_CHARS = 3500;

const CONFIG_SCHEMA = {
  board: `Object: { termLabel, votedIn, lastUpdated, vacancyContact: {name, email}, executive: [{role, name, email, coveredBy?}], general: [...], baseballReps: [...], softballReps: [...] } — the volunteer page's board roster. coveredBy (optional, vacant roles only) is the exact role name of the member covering it.`,
  fields: `Array of { name, slug, description, gamesPlayed: {active, divisions: [string]}, practices: {active, divisions: [string]}, concessionStand, mapUrl } — the schedule page's field list.`,
  "field-status": `Object: { tone: "success"|"warning"|"danger"|"info", title, message } — the schedule page's field status banner.`,
  sponsors: `Array of { name, url, logo? } — the homepage sponsor grid.`,
  "registration-status": `Object: { message } — the site-wide top bar message. Plain text; emoji are fine.`,
  "hero-slides": `Array of { id, active, image, alt, href?, title?, lede?, eyebrow?, ctaLabel?, ctaHref? } — homepage hero rotator slides, up to ${MAX_ACTIVE_HERO_SLIDES} active at once. IMPORTANT: "image" is an R2 filename that can only be set by sending a photo directly to this bot — never invent or change an image filename yourself. If the user wants to add a slide with a new picture, tell them to send the photo with a caption instead. You CAN reorder, deactivate/reactivate (the "active" flag), delete, or edit the text fields of existing slides.`,
};
const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA);

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("PG PONY site bot is running");

    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }

    const update = await request.json();
    const msg = update.message;
    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const allowed = String(env.ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!allowed.includes(String(chatId))) return new Response("ok");

    try {
      if (msg.photo) {
        await handleHeroPhoto(env, chatId, msg);
      } else if (msg.text) {
        await handleText(env, chatId, msg.text.trim());
      } else {
        await sendTelegram(env, chatId, "Send me a message describing the change, or a photo with a caption to add a hero slide. /help for details.");
      }
    } catch (err) {
      await sendTelegram(env, chatId, `⚠️ Something went wrong: ${err.message}`);
    }

    return new Response("ok");
  },
};

// ---------- Text messages (natural language, via Claude) ----------

async function handleText(env, chatId, text) {
  if (text === "/start" || text === "/help") {
    return sendTelegram(
      env,
      chatId,
      "Tell me what to change, in plain English, e.g.\n" +
        '• "Set the registration message to 🔥 Softball 6U is open, early-bird pricing!"\n' +
        '• "Field status: all fields open"\n' +
        '• "Remove Jane Doe as Umpire Liaison"\n' +
        '• "Deactivate the tournament hero slide"\n\n' +
        "Send a photo with a caption to add a hero slide (caption: alt/href/title/lede/cta, one per line).\n\n" +
        "/get <key> shows a key's raw current value.\n" +
        `Keys: ${CONFIG_KEYS.join(", ")}`
    );
  }

  if (text.startsWith("/get")) {
    const key = text.replace("/get", "").trim();
    if (!CONFIG_KEYS.includes(key)) {
      return sendTelegram(env, chatId, `Usage: /get <key>\nKeys: ${CONFIG_KEYS.join(", ")}`);
    }
    const raw = await env.SITE_CONFIG.get(key);
    if (!raw) return sendTelegram(env, chatId, `"${key}" is empty.`);
    if (raw.length > MAX_REPLY_CHARS) {
      return sendTelegram(env, chatId, `"${key}" is ${raw.length} chars — too long to show here. Use the Cloudflare dashboard KV editor instead.`);
    }
    return sendTelegram(env, chatId, raw);
  }

  const current = await getAllConfig(env);
  const decision = await askClaude(text, current, env);

  if (!decision.change) {
    return sendTelegram(env, chatId, decision.reply || "I'm not sure what to change. Try /help.");
  }

  const { key, value, summary } = decision.change;
  try {
    validateConfig(key, value);
  } catch (e) {
    return sendTelegram(env, chatId, `That change didn't look right, so I didn't apply it: ${e.message}`);
  }

  await env.SITE_CONFIG.put(key, JSON.stringify(value));
  await sendTelegram(env, chatId, `✅ Updated "${key}"\n${summary}\n\nLive on the site within about 30 seconds.`);
}

async function getAllConfig(env) {
  const entries = await Promise.all(
    CONFIG_KEYS.map(async (key) => {
      const raw = await env.SITE_CONFIG.get(key);
      return [key, raw ? JSON.parse(raw) : null];
    })
  );
  return Object.fromEntries(entries);
}

async function askClaude(userText, current, env) {
  const today = new Date().toISOString().slice(0, 10);

  const schemaBlock = CONFIG_KEYS.map((k) => `- ${k}: ${CONFIG_SCHEMA[k]}\n  current value: ${JSON.stringify(current[k])}`).join(
    "\n\n"
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system:
        `You edit configuration for the PG PONY youth baseball/softball league website. Today is ${today}.\n\n` +
        `There are six config keys, each a KV entry holding JSON:\n\n${schemaBlock}\n\n` +
        "When the user describes a change, call update_config with the key it applies to and the COMPLETE new value " +
        "for that key (not a diff) — copy over everything from the current value except what the user asked to change. " +
        "Only touch one key per message. Use the user's own wording for free-text fields. " +
        "If the request is ambiguous, doesn't match any key, or wants something only a photo upload can do " +
        "(adding a hero slide's image), don't call the tool — reply with one short clarifying/explanatory message instead.",
      tools: [
        {
          name: "update_config",
          description: "Replace the full value of one site configuration key.",
          input_schema: {
            type: "object",
            properties: {
              key: { type: "string", enum: CONFIG_KEYS },
              value: { description: "The complete new value for this key (object or array, matching its schema)." },
              summary: { type: "string", description: "One short sentence describing what changed, to show the user." },
            },
            required: ["key", "value", "summary"],
          },
        },
      ],
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const toolUse = data.content.find((b) => b.type === "tool_use" && b.name === "update_config");
  if (toolUse) return { change: toolUse.input };

  const reply = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { reply };
}

function validateConfig(key, value) {
  const fail = (msg) => {
    throw new Error(msg);
  };
  if (value === null || value === undefined) fail(`${key} can't be empty`);

  switch (key) {
    case "board":
      if (typeof value !== "object" || Array.isArray(value)) fail("board must be an object");
      break;
    case "fields":
    case "sponsors":
    case "hero-slides":
      if (!Array.isArray(value)) fail(`${key} must be an array`);
      break;
    case "field-status":
      if (typeof value !== "object" || Array.isArray(value)) fail("field-status must be an object");
      if (!["success", "warning", "danger", "info"].includes(value.tone)) fail('field-status.tone must be "success", "warning", "danger", or "info"');
      if (typeof value.message !== "string") fail("field-status.message must be text");
      break;
    case "registration-status":
      if (typeof value !== "object" || Array.isArray(value) || typeof value.message !== "string") {
        fail("registration-status must be an object with a text message field");
      }
      break;
  }
}

// ---------- Hero slide photo uploads (no Claude — deterministic) ----------

function parseHeroCaption(caption) {
  const fields = {};
  const plain = [];
  for (const line of (caption || "").split("\n")) {
    const m = line.match(/^(alt|href|title|lede|eyebrow|cta)\s*:\s*(.*)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      if (key === "cta") {
        const [label, href] = m[2].split("|").map((s) => s.trim());
        if (label && href) {
          fields.ctaLabel = label;
          fields.ctaHref = href;
        }
      } else {
        fields[key] = m[2].trim();
      }
    } else if (line.trim()) {
      plain.push(line.trim());
    }
  }
  if (!fields.alt && plain.length) fields.alt = plain.join(" ");
  return fields;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function handleHeroPhoto(env, chatId, message) {
  const fields = parseHeroCaption(message.caption);
  if (!fields.alt) {
    await sendTelegram(env, chatId, "Add a caption with at least an `alt: description` line so I know what this image is.");
    return;
  }

  const raw = await env.SITE_CONFIG.get("hero-slides");
  const slides = raw ? JSON.parse(raw) : [];
  const activeCount = slides.filter((s) => s.active).length;
  if (activeCount >= MAX_ACTIVE_HERO_SLIDES) {
    await sendTelegram(
      env,
      chatId,
      `You already have ${MAX_ACTIVE_HERO_SLIDES} active hero slides (the max). Deactivate one first — e.g. "deactivate the <name> hero slide".`
    );
    return;
  }

  const photo = message.photo[message.photo.length - 1];
  const fileInfoRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.ok) {
    await sendTelegram(env, chatId, "Couldn't download that photo from Telegram — try again.");
    return;
  }
  const fileRes = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`);
  const bytes = await fileRes.arrayBuffer();

  const id = `${slugify(fields.alt) || "slide"}-${Date.now()}`;
  const imageKey = `telegram/${id}.jpg`;
  await env.HERO_MEDIA.put(imageKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });

  slides.push({ id, active: true, image: imageKey, ...fields });
  await env.SITE_CONFIG.put("hero-slides", JSON.stringify(slides));

  await sendTelegram(
    env,
    chatId,
    `✅ Added hero slide "${id}" (now ${activeCount + 1}/${MAX_ACTIVE_HERO_SLIDES} active). Live on the site within about 30 seconds.`
  );
}

// ---------- Telegram ----------

async function sendTelegram(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}
