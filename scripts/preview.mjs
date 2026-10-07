import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.RELAY_BASE_PATH ?? "";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
await stat(resolve(root, "index.html")).catch(() => {
  throw new Error("Build the app first with npm run build.");
});
createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://127.0.0.1").pathname,
    );
    if (basePath) {
      if (pathname !== basePath && !pathname.startsWith(basePath + "/")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      pathname = pathname.slice(basePath.length) || "/";
    }
    const file = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      await readFile(resolve(root, "404.html")).catch(() =>
        Buffer.from("Not found"),
      ),
    );
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Relay CRM preview: http://127.0.0.1:${port}${basePath}`),
);
