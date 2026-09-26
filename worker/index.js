const ROUTES = {
  "/api/board": "board",
  "/api/fields": "fields",
  "/api/field-status": "field-status",
  "/api/sponsors": "sponsors",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
