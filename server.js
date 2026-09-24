const port = Number(process.env.PORT || 3000);
const publicDir = process.env.PUBLIC_DIR || null;
const baseUrl = process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${port}`);
const links = new Map();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function generateCode(length = 6) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let value = "";

  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return value;
}

async function serveStaticFile(pathname) {
  if (!publicDir) return null;

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = safePath.split("/").filter(Boolean);
  const filePath = normalized.length === 0 ? "index.html" : normalized.join("/");
  const target = `${publicDir}/${filePath}`;

  try {
    const file = Bun.file(target);
    if (await file.exists()) {
      const mime = filePath.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
      return new Response(file, {
        headers: {
          ...corsHeaders,
          "Content-Type": mime,
        },
      });
    }
  } catch {
    // ignore and fall through to app routes
  }

  return null;
}

const server = Bun.serve({
  port,
  fetch: async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (pathname === "/api/links") {
      if (request.method === "GET") {
        return jsonResponse(Array.from(links.values()));
      }

      if (request.method === "POST") {
        let payload;

        try {
          payload = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }

        if (!payload || typeof payload.url !== "string") {
          return jsonResponse({ error: "URL is required" }, 400);
        }

        let parsedUrl;

        try {
          parsedUrl = new URL(payload.url);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw new Error("Unsupported protocol");
          }
        } catch {
          return jsonResponse({ error: "Invalid URL" }, 400);
        }

        const code = generateCode();
        const createdAt = new Date().toISOString();
        const record = {
          code,
          url: parsedUrl.toString(),
          shortUrl: `${baseUrl}/${code}`,
          hits: 0,
          createdAt,
        };

        links.set(code, record);

        return new Response(JSON.stringify(record), {
          status: 201,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }
    }

    const staticResponse = await serveStaticFile(pathname);
    if (staticResponse) {
      return staticResponse;
    }

    if (request.method === "GET" && pathname !== "/") {
      const code = pathname.slice(1).split("/")[0];
      const link = links.get(code);

      if (!link) {
        return jsonResponse({ error: "Not found" }, 404);
      }

      link.hits += 1;
      return Response.redirect(link.url, 302);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on http://localhost:${server.port}`);
