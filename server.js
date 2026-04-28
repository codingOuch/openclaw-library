const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const express = require("express");
const fg = require("fast-glob");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const TOKEN_FILE = path.join(__dirname, ".token");
const BACKUP_DIR = path.join(__dirname, ".openclaw-panel-backups");
const COVERS_DIR = path.join(__dirname, ".openclaw-panel-covers");

const USER_HOME = process.env.OPENCLAW_HOME || os.homedir() || "/Users/user";
const WORKSPACE_ROOT = path.resolve(
  process.env.OPENCLAW_WORKSPACE || path.join(USER_HOME, ".openclaw", "workspace"),
);
const SKILLS_ROOT = path.resolve(
  process.env.OPENCLAW_SKILLS || path.join(USER_HOME, ".openclaw", "workspace", "skills"),
);

const ROOT_SCROLLS = ["AGENTS", "SOUL", "IDENTITY", "USER", "MEMORY", "HEARTBEAT", "TOOLS"];
const WHITELIST_GLOBS = [
  path.join(WORKSPACE_ROOT, `{${ROOT_SCROLLS.join(",")}}.md`),
  path.join(WORKSPACE_ROOT, "memory", "**", "*.{md,json}"),
  path.join(SKILLS_ROOT, "*", "SKILL.md"),
  path.join(SKILLS_ROOT, "*", "profiles", "*.md"),
].map((item) => item.split(path.sep).join("/"));

function ensureToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    return fs.readFileSync(TOKEN_FILE, "utf8").trim();
  }
  const token = crypto.randomBytes(24).toString("base64url");
  fs.writeFileSync(TOKEN_FILE, `${token}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(TOKEN_FILE, 0o600);
  } catch {
    // Best effort on non-POSIX filesystems.
  }
  return token;
}

const token = ensureToken();

function getLanIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((iface) => iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
}

function tokenHint(value) {
  if (!value || value.length < 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function isInside(base, target) {
  const rel = path.relative(base, target);
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function normalizeFile(filePath) {
  return path.resolve(String(filePath || ""));
}

function listAllowedFiles() {
  const files = fg.sync(WHITELIST_GLOBS, {
    absolute: true,
    onlyFiles: true,
    unique: true,
    dot: true,
    followSymbolicLinks: false,
  });
  return files
    .map(normalizeFile)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      if (ext !== ".md" && ext !== ".json") return false;
      return isInside(WORKSPACE_ROOT, file) || isInside(SKILLS_ROOT, file);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function assertAllowed(filePath) {
  const abs = normalizeFile(filePath);
  const allowed = new Set(listAllowedFiles());
  if (!allowed.has(abs)) {
    const err = new Error("Path is outside the openclaw whitelist");
    err.statusCode = 403;
    throw err;
  }
  return abs;
}

function labelFor(filePath) {
  const abs = normalizeFile(filePath);
  if (isInside(SKILLS_ROOT, abs)) {
    return `skills/${path.relative(SKILLS_ROOT, abs).split(path.sep).join("/")}`;
  }
  if (isInside(WORKSPACE_ROOT, abs)) {
    return `workspace/${path.relative(WORKSPACE_ROOT, abs).split(path.sep).join("/")}`;
  }
  return path.basename(abs);
}

function backupName(filePath) {
  const label = labelFor(filePath).replace(/[/:\\]/g, "__");
  return `${new Date().toISOString().replace(/[:.]/g, "-")}__${label}`;
}

function filePayload(filePath) {
  const abs = assertAllowed(filePath);
  const stat = fs.statSync(abs);
  return {
    path: abs,
    label: labelFor(abs),
    content: fs.readFileSync(abs, "utf8"),
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

function buildTree() {
  const root = { name: "Library", type: "dir", children: [] };
  for (const file of listAllowedFiles()) {
    const label = labelFor(file);
    const parts = label.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        const stat = fs.statSync(file);
        current.children.push({
          name: part,
          type: "file",
          path: file,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        });
      } else {
        let dir = current.children.find((child) => child.type === "dir" && child.name === part);
        if (!dir) {
          dir = { name: part, type: "dir", children: [] };
          current.children.push(dir);
        }
        current = dir;
      }
    }
  }
  sortTree(root);
  return root;
}

function sortTree(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });
  node.children.forEach(sortTree);
}

function getRequestToken(req) {
  return (
    req.get("x-openclaw-token") ||
    req.query.token ||
    (req.body && typeof req.body === "object" ? req.body.token : undefined)
  );
}

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  const publicPath =
    req.path === "/" ||
    req.path === "/health" ||
    req.path === "/favicon.ico" ||
    req.path.startsWith("/assets") ||
    req.path.startsWith("/public");
  if (publicPath) return next();
  if (getRequestToken(req) === token) return next();
  return res.status(401).json({ error: "Unauthorized" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/status", (_req, res) => {
  res.json({
    host: HOST,
    port: PORT,
    ips: getLanIps(),
    uptimeSec: Math.floor(process.uptime()),
    tokenHint: tokenHint(token),
  });
});

app.get("/api/tree", (_req, res, next) => {
  try {
    res.json(buildTree());
  } catch (error) {
    next(error);
  }
});

app.get("/api/file", (req, res, next) => {
  try {
    res.json(filePayload(req.query.path));
  } catch (error) {
    next(error);
  }
});

app.post("/api/file", (req, res, next) => {
  try {
    if (!req.body || typeof req.body.content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }
    const abs = assertAllowed(req.body.path);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backup = path.join(BACKUP_DIR, backupName(abs));
    fs.copyFileSync(abs, backup);
    fs.writeFileSync(abs, req.body.content, "utf8");
    const stat = fs.statSync(abs);
    return res.json({
      ok: true,
      path: abs,
      label: labelFor(abs),
      backup,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/search", (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q) return res.json([]);
    const out = [];
    for (const file of listAllowedFiles()) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].toLowerCase().includes(q)) {
          out.push({
            path: file,
            label: labelFor(file),
            line: i + 1,
            text: lines[i].slice(0, 500),
          });
          if (out.length >= 200) return res.json(out);
        }
      }
    }
    return res.json(out);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/git-history", (req, res, next) => {
  try {
    const abs = assertAllowed(req.query.path);
    res.json(gitHistoryFor(abs));
  } catch (error) {
    next(error);
  }
});

app.get("/api/git-file", (req, res, next) => {
  try {
    const abs = assertAllowed(req.query.path);
    res.json(gitFileAt(abs, req.query.hash));
  } catch (error) {
    next(error);
  }
});

// --- Custom covers (server-side storage) ---

function coverPath(bookPath) {
  const name = String(bookPath).replace(/[/\\:]/g, "_") + ".json";
  return path.join(COVERS_DIR, name);
}

app.get("/api/covers", (_req, res, next) => {
  try {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    const result = {};
    const files = fs.readdirSync(COVERS_DIR);
    for (const name of files) {
      if (!name.endsWith(".json")) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(COVERS_DIR, name), "utf8"));
        if (data.path && data.dataUrl) {
          result[data.path] = data.dataUrl;
        }
      } catch {
        // skip corrupt files
      }
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.put("/api/covers", (req, res, next) => {
  try {
    const { path: bookPath, dataUrl } = req.body || {};
    if (!bookPath || !dataUrl) {
      return res.status(400).json({ error: "path and dataUrl required" });
    }
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.writeFileSync(coverPath(bookPath), JSON.stringify({ path: bookPath, dataUrl }), "utf8");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/covers", (req, res, next) => {
  try {
    const bookPath = req.query.path;
    if (!bookPath) return res.status(400).json({ error: "path required" });
    const p = coverPath(bookPath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function gitInfoFor(filePath) {
  const dir = path.dirname(filePath);
  const root = execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 2000,
  }).trim();
  return {
    root,
    rel: path.relative(root, filePath).split(path.sep).join("/"),
  };
}

function gitHistoryFor(filePath) {
  try {
    const { root, rel } = gitInfoFor(filePath);
    const raw = execFileSync(
      "git",
      [
        "-C",
        root,
        "log",
        "--follow",
        "--max-count=12",
        "--date=iso-strict",
        "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s",
        "--",
        rel,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 3000,
      },
    ).trim();
    if (!raw) return [];
    return raw.split("\n").map((line) => {
      const [hash, shortHash, author, date, message] = line.split("\x1f");
      return { hash, shortHash, author, date, message };
    });
  } catch {
    return [];
  }
}

function gitFileAt(filePath, hash) {
  const revision = String(hash || "").trim();
  if (!/^[0-9a-fA-F]{7,40}$/.test(revision)) {
    const err = new Error("Invalid git revision");
    err.statusCode = 400;
    throw err;
  }
  try {
    const { root, rel } = gitInfoFor(filePath);
    const content = execFileSync("git", ["-C", root, "show", `${revision}:${rel}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 3000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      path: filePath,
      label: `${labelFor(filePath)} @ ${revision.slice(0, 7)}`,
      content,
      size: Buffer.byteLength(content),
      mtime: new Date().toISOString(),
    };
  } catch {
    const err = new Error("Git revision content not found");
    err.statusCode = 404;
    throw err;
  }
}

const distDir = path.join(__dirname, "react-ui", "dist");
const publicDir = fs.existsSync(path.join(distDir, "index.html"))
  ? distDir
  : path.join(__dirname, "public");

app.use(express.static(publicDir));
app.get(/.*/, (req, res, next) => {
  if (!fs.existsSync(path.join(publicDir, "index.html"))) return next();
  return res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Internal Server Error" : error.message,
  });
  if (status === 500) console.error(error);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`openclaw Panel listening on http://${HOST}:${PORT}`);
  for (const ip of getLanIps()) {
    console.log(`LAN: http://${ip}:${PORT}/?token=${token}`);
  }
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
