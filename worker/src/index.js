// Cloudflare Worker: stores each user's Visual Crossing API key (in KV) and forwards requests on their behalf.
//
// Bindings / secrets:
//   KEYS        - KV namespace mapping user token -> API key
//   PROXY_TOKEN - secret shared with the backend (X-Proxy-Token header); stops anyone else calling the Worker
//
// Routes (all require X-Proxy-Token):
//   POST   /register                       body {key}; validates the key, stores it, returns {token}
//   DELETE /register                       X-User-Token; deletes the stored key
//   GET    /timeline/{location}/{period}   X-User-Token; forwards to the Visual Crossing timeline API
//   GET    /tiles/{element}/{z}/{x}/{y}    X-User-Token; forwards to the Visual Crossing map tile API

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // stored keys expire after 30 days
const TOKEN_FORMAT = /^[a-f0-9]{64}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export default {
  async fetch(request, env) {
    // only the backend knows this secret, so only the backend can use the Worker
    if (request.headers.get("X-Proxy-Token") !== env.PROXY_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const userToken = request.headers.get("X-User-Token");
    const validToken = userToken && TOKEN_FORMAT.test(userToken) ? userToken : null;

    // ---- key registration ----
    if (url.pathname === "/register") {
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const key = typeof body.key === "string" ? body.key.trim() : "";
        if (!key || key.length > 100) return json({ error: "Invalid API key" }, 400);

        // check the key works before storing it
        const check = await fetch(
          `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/London,UK/today?key=${encodeURIComponent(key)}&elements=temp`
        );
        if (check.status === 401) return json({ error: "Invalid API key" }, 400);
        if (!check.ok) return json({ error: "Could not verify key" }, 502);

        const token = newToken();
        await env.KEYS.put(`token:${token}`, key, { expirationTtl: TOKEN_TTL_SECONDS });
        return json({ token });
      }

      if (request.method === "DELETE") {
        if (validToken) await env.KEYS.delete(`token:${validToken}`);
        return new Response(null, { status: 204 });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    // ---- everything below needs a registered user ----
    const apiKey = validToken ? await env.KEYS.get(`token:${validToken}`) : null;
    if (!apiKey) return new Response("Invalid or expired token", { status: 401 });

    // Map tiles
    const tile = url.pathname.match(
      /^\/tiles\/(temp|cloudcover|precipcomposite)\/(\d+)\/(\d+)\/(\d+)$/
    );
    if (tile) {
      const [, element, z, x, y] = tile;
      const upstream = new URL(
        `https://maps.visualcrossing.com/VisualCrossingWebServices/rest/api/v1/map/tile/${element}/${z}/${x}/${y}.webp`
      );
      upstream.searchParams.set("apikey", apiKey);
      upstream.searchParams.set("time", url.searchParams.get("time") ?? "latest");
      upstream.searchParams.set("options", "usev2forecast");
      // cache at the edge so repeat views don't use up the Visual Crossing quota
      return fetch(upstream, { cf: { cacheEverything: true, cacheTtl: 600 } });
    }

    // Weather data
    const timeline = url.pathname.match(/^\/timeline\/([^/]+)\/([^/]+)$/);
    if (timeline) {
      const upstream = new URL(
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${timeline[1]}/${timeline[2]}`
      );
      for (const [k, v] of url.searchParams) {
        if (k !== "key") upstream.searchParams.set(k, v); // pass through unitGroup, elements, etc.
      }
      upstream.searchParams.set("key", apiKey);
      return fetch(upstream);
    }

    return new Response("Not found", { status: 404 });
  },
};
