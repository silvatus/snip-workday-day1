import { resolve, sep } from "node:path";

const port = Number(process.env.PORT || 3000);
const publicDir = process.env.PUBLIC_DIR || null;
const resolvedPublicDir = publicDir ? resolve(publicDir) : null;
const configuredBaseUrl = process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
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
  let code;

  do {
    code = "";

    for (let i = 0; i < length; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (links.has(code));

  return code;
}

function getBaseUrl(requestUrl, headers) {
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, "");

  const forwardedHost = headers.get("x-forwarded-host");
  if (forwardedHost) {
    const protocol = headers.get("x-forwarded-proto") || "https";
    return `${protocol}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

async function serveStaticFile(pathname) {
  if (!resolvedPublicDir) return null;

  let filePath;

  try {
    filePath = decodeURIComponent(pathname === "/" ? "index.html" : pathname.slice(1));
  } catch {
    return null;
  }

  const target = resolve(resolvedPublicDir, filePath);
  if (target !== resolvedPublicDir && !target.startsWith(`${resolvedPublicDir}${sep}`)) {
    return null;
  }

  try {
    const file = Bun.file(target);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          ...corsHeaders,
          "Content-Type": file.type || "application/octet-stream",
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
          shortUrl: `${getBaseUrl(url, request.headers)}/${code}`,
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
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: link.url,
        },
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on http://localhost:${server.port}`);
