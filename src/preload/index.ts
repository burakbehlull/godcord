// @ts-nocheck
(function () {
const { contextBridge, webFrame, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const LOG_PREFIX = "[GodCord]";
const ORIGINAL_PRELOAD_ENV = "GODCORD_ORIGINAL_PRELOAD";
const PRELOAD_BASES_ENV = "GODCORD_PRELOAD_BASES";

console.log(`${LOG_PREFIX} Preload loading...`);

function isTrustedDiscordOrigin(loc) {
  if (!loc || !loc.protocol) return false;
  if (loc.protocol !== "https:") return false;
  const host = (loc.hostname || "").toLowerCase();
  return (
    host === "discord.com" ||
    host.endsWith(".discord.com") ||
    host === "discordapp.com" ||
    host.endsWith(".discordapp.com")
  );
}

const isTrustedPage = isTrustedDiscordOrigin(location);
if (!isTrustedPage) {
  console.log(
    `${LOG_PREFIX} Preload skipped for untrusted frame (${location.protocol}//${location.host || "?"})`,
  );
  return;
}

bootstrapTrustedPage();

function validateDiscordPreloadPath(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return { ok: false, reason: "empty preload env var — main never recorded a path" };
  }
  const bases = [];
  const pushBase = (v) => {
    if (typeof v === "string" && v.length > 0 && !bases.includes(v))
      bases.push(v);
  };
  pushBase(process.resourcesPath);
  const rawBases = process.env[PRELOAD_BASES_ENV];
  if (typeof rawBases === "string" && rawBases.length > 0 && rawBases.length < 8192) {
    try {
      const parsed = JSON.parse(rawBases);
      if (Array.isArray(parsed)) for (const entry of parsed) pushBase(entry);
    } catch (_) {
      /* malformed — proceed with fewer bases */
    }
  }
  let resolved;
  try {
    resolved = path.resolve(candidate);
  } catch (err) {
    return {
      ok: false,
      reason: `cannot resolve path: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const contained = bases.some((base) => {
    try {
      const rel = path.relative(base, resolved);
      return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
    } catch (_) {
      return false;
    }
  });
  if (!contained) {
    return {
      ok: false,
      reason: `preload outside allowed bases: ${bases.join(", ") || "(none reported)"}`,
      path: resolved,
      basename: path.basename(resolved),
    };
  }
  const ext = path.extname(resolved).toLowerCase();
  if (ext !== ".js") {
    return {
      ok: false,
      reason: `preload is not .js (got: ${ext || "none"})`,
      path: resolved,
      basename: path.basename(resolved),
    };
  }
  const basename = path.basename(resolved);
  return {
    ok: true,
    path: resolved,
    basename,
    knownName: basename.includes("preload"),
  };
}

function loadOriginalPreload() {
  const candidate = process.env[ORIGINAL_PRELOAD_ENV];
  if (!candidate) {
    console.warn(`${LOG_PREFIX} Original preload path missing (env var UNSET)`);
    return;
  }
  const verdict = validateDiscordPreloadPath(candidate);
  if (!verdict.ok) {
    console.error(
      `${LOG_PREFIX} [security] Refusing to load original preload: ${verdict.reason}\n` +
        `                path: ${String(candidate).slice(0, 300)}`,
    );
    return;
  }
  if (!verdict.knownName) {
    console.log(
      `${LOG_PREFIX} [security] Discord's preload is named "${verdict.basename}" — ` +
        `accepting because it is inside the app path.`,
    );
  }
  try {
    require(verdict.path);
    console.log(`${LOG_PREFIX} Discord preload loaded (${verdict.basename})`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to load Discord preload:`, err);
  }
}

function bootstrapTrustedPage() {
  try {
    contextBridge.exposeInMainWorld("GodCord", {
      version: "0.1.0",
      ping: () => ipcRenderer.invoke("GODCORD_PING"),
      openPanel: () => {
        console.log(`${LOG_PREFIX} Panel açılıyor...`);
      },
    });
    console.log(`${LOG_PREFIX} GodCord native API exposed`);
  } catch (err) {
    console.warn(`${LOG_PREFIX} contextBridge expose failed:`, err);
  }

  let rendererCode;
  const rendererPath = path.join(__dirname, "renderer.js");
  try {
    rendererCode = fs.readFileSync(rendererPath, "utf-8");
    console.log(
      `${LOG_PREFIX} renderer.js read (${rendererCode.length} bytes) from ${rendererPath}`,
    );
  } catch (err) {
    console.error(`${LOG_PREFIX} renderer.js missing at ${rendererPath}:`, err);
    loadOriginalPreload();
    return;
  }

  console.log(`${LOG_PREFIX} Injecting renderer bundle via webFrame.executeJavaScript`);
  webFrame.executeJavaScript(rendererCode).then(
    () => {
      console.log(`${LOG_PREFIX} Renderer bundle executed OK`);
    },
    (err) => {
      console.error(`${LOG_PREFIX} Failed to inject renderer:`, err);
    },
  );

  loadOriginalPreload();
}
})();
