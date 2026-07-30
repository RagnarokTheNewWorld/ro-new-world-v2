const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function stripVersionQuery(url) {
  return url.split("?")[0];
}

function tryServe(res, filePath, mimeOverride) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      let mime = mimeOverride || getMime(filePath);
      // Detect HTML files with no extension by reading first bytes
      if (mime === "application/octet-stream" && !path.extname(filePath)) {
        try {
          const fd = fs.openSync(filePath, "r");
          const buf = Buffer.alloc(50);
          fs.readSync(fd, buf, 0, 50, 0);
          fs.closeSync(fd);
          const head = buf.toString("utf8").trimStart().toLowerCase();
          if (head.startsWith("<!doctype") || head.startsWith("<html")) {
            mime = "text/html; charset=utf-8";
          }
        } catch {}
      }
      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": stat.size,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }
  } catch {}
  return false;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  let urlPath = decodeURIComponent(stripVersionQuery(req.url));

  // Root redirect to landing page
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }

  const filePath = path.join(ROOT, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // 1. Try exact file
  if (tryServe(res, filePath)) return;

  // 2. If path ends with /, try index.html in that directory
  if (urlPath.endsWith("/")) {
    if (tryServe(res, path.join(filePath, "index.html"))) return;

    // 3. Try extensionless file matching directory name
    const dirName = path.basename(urlPath.replace(/\/$/, ""));
    if (tryServe(res, path.join(filePath, dirName))) return;
  }

  // 4. Try adding .html
  if (tryServe(res, filePath + ".html")) return;

  // 5. If it's a directory without trailing slash, redirect
  try {
    if (fs.statSync(filePath).isDirectory()) {
      res.writeHead(301, { Location: urlPath + "/" });
      res.end();
      return;
    }
  } catch {}

  // 404
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html><html><head><title>404</title></head><body><h1>404 Not Found</h1><p>${urlPath}</p><p><a href="/">← Home</a></p></body></html>`);
});

server.listen(PORT, () => {
  console.log(`\n  RO World Journey Database`);
  console.log(`  ========================`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`\n  Pages:`);
  console.log(`    http://localhost:${PORT}/              - Home`);
  console.log(`    http://localhost:${PORT}/sea/skill_planner/    - Skill Planner`);
  console.log(`    http://localhost:${PORT}/sea/rune_planner/     - Rune Planner`);
  console.log(`    http://localhost:${PORT}/sea/affix_planner/    - Affix Planner`);
  console.log(`    http://localhost:${PORT}/sea/apocalypse_planner/ - Apocalypse Planner`);
  console.log(`    http://localhost:${PORT}/sea/shop/             - Shop`);
  console.log(`    http://localhost:${PORT}/sea/equipment/        - Equipment`);
  console.log(`    http://localhost:${PORT}/sea/cards/            - Cards`);
  console.log(`    http://localhost:${PORT}/sea/monster_album/    - Monster Album`);
  console.log(`    http://localhost:${PORT}/sea/maps/             - Maps`);
  console.log(`    http://localhost:${PORT}/sea/events/           - Events`);
  console.log(`    http://localhost:${PORT}/sea/study/            - Study`);
  console.log(`    http://localhost:${PORT}/sea/pet/              - Pet`);
  console.log(`    http://localhost:${PORT}/sea/refine/           - Refine`);
  console.log(`\n  Press Ctrl+C to stop\n`);
});
