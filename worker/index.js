import { getKeyDates } from "./calendar.js";
import { handleHelp } from "./help-router.js";

const ROUTES = {
  "/api/board": "board",
  "/api/fields": "fields",
  "/api/field-status": "field-status",
  "/api/sponsors": "sponsors",
  "/api/registration-status": "registration-status",
};

const MAX_HERO_SLIDES = 4;

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function extensionOf(key) {
  const dot = key.lastIndexOf(".");
  return dot === -1 ? "" : key.slice(dot + 1).toLowerCase();
}

async function handleHeroSlides(env) {
  const raw = await env.SITE_CONFIG.get("hero-slides");
  const slides = raw ? JSON.parse(raw) : [];
  const active = slides.filter((s) => s && s.active).slice(0, MAX_HERO_SLIDES);
  return new Response(JSON.stringify(active), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=30",
    },
  });
}

async function handleMedia(request, env, pathname) {
  const key = decodeURIComponent(pathname.replace(/^\/media\//, ""));
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.HERO_MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.get("content-type")) {
    const ct = CONTENT_TYPES[extensionOf(key)];
    if (ct) headers.set("content-type", ct);
  }
  headers.set("cache-control", "public, max-age=86400");
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/hero-slides" && request.method === "GET") {
      return handleHeroSlides(env);
    }

    if (url.pathname === "/api/key-dates" && request.method === "GET") {
      try {
        const events = await getKeyDates(env);
        return new Response(JSON.stringify(events), {
          headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (url.pathname === "/api/help" && request.method === "POST") {
      return handleHelp(request, env);
    }

    if (url.pathname.startsWith("/media/") && request.method === "GET") {
      return handleMedia(request, env, url.pathname);
    }

    const key = ROUTES[url.pathname];
    if (key && request.method === "GET") {
      const value = await env.SITE_CONFIG.get(key);
      if (value === null) {
        return new Response("null", {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(value, {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=30",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
