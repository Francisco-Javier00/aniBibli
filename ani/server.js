const http = require("node:http");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "animes.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function readAnimes() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAnimes(animes) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(animes, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function safeJoin(urlPath) {
  const normalized = path.normalize(path.join(ROOT, urlPath));
  const relative = path.relative(ROOT, normalized);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? normalized : null;
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}

function sanitizeString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeAnime(input, existing = null) {
  const title = sanitizeString(input.title);
  if (!title) {
    throw new Error("El titulo es obligatorio.");
  }

  const now = Date.now();
  return {
    id: existing?.id || sanitizeString(input.id) || randomUUID(),
    title,
    season: Math.max(1, sanitizeNumber(input.season, existing?.season ?? 1)),
    episode: Math.max(0, sanitizeNumber(input.episode, existing?.episode ?? 0)),
    totalEpisodes: Math.max(0, sanitizeNumber(input.totalEpisodes, existing?.totalEpisodes ?? 0)),
    rating: Math.max(0, Math.min(10, sanitizeNumber(input.rating, existing?.rating ?? 0))),
    status: ["viendo", "pausado", "completado", "pendiente"].includes(input.status)
      ? input.status
      : existing?.status || "viendo",
    platform: sanitizeString(input.platform, existing?.platform ?? ""),
    notes: sanitizeString(input.notes, existing?.notes ?? ""),
    imageUrl: sanitizeString(input.imageUrl, existing?.imageUrl ?? ""),
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  };
}

async function handleApi(req, res, pathname) {
  const match = pathname.match(/^\/api\/animes\/([^/]+)$/);

  if (pathname === "/api/animes" && req.method === "GET") {
    const animes = await readAnimes();
    sendJson(res, 200, { items: animes });
    return true;
  }

  if (match && req.method === "GET") {
    const id = decodeURIComponent(match[1]);
    const animes = await readAnimes();
    const item = animes.find((entry) => entry.id === id);

    if (!item) {
      sendJson(res, 404, { error: "Anime not found" });
      return true;
    }

    sendJson(res, 200, { item });
    return true;
  }

  if (pathname === "/api/animes" && req.method === "POST") {
    const body = (await parseBody(req)) || {};
    const animes = await readAnimes();
    const item = sanitizeAnime(body);
    animes.unshift(item);
    await writeAnimes(animes);
    sendJson(res, 201, { item });
    return true;
  }

  if (pathname === "/api/animes" && req.method === "DELETE") {
    await writeAnimes([]);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (!match) return false;

  const id = decodeURIComponent(match[1]);
  const animes = await readAnimes();
  const index = animes.findIndex((item) => item.id === id);

  if (index === -1) {
    sendJson(res, 404, { error: "Anime not found" });
    return true;
  }

  if (req.method === "PUT") {
    const body = (await parseBody(req)) || {};
    const nextItem = sanitizeAnime(body, animes[index]);
    animes[index] = nextItem;
    await writeAnimes(animes);
    sendJson(res, 200, { item: nextItem });
    return true;
  }

  if (req.method === "DELETE") {
    animes.splice(index, 1);
    await writeAnimes(animes);
    sendJson(res, 200, { ok: true });
    return true;
  }

  sendJson(res, 405, { error: "Method not allowed" });
  return true;
}

async function serveStatic(req, res, pathname) {
  const urlPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = safeJoin(urlPath);

  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const data = await fs.readFile(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function main() {
  await ensureDataFile();

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname.startsWith("/api/")) {
        const handled = await handleApi(req, res, pathname);
        if (!handled) {
          sendJson(res, 404, { error: "Not found" });
        }
        return;
      }

      await serveStatic(req, res, pathname);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  server.listen(PORT, () => {
    console.log(`Anime Vault running at http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
