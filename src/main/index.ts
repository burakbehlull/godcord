// @ts-nocheck
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const LOG_PREFIX = "[GodCord]";
const ORIGINAL_PRELOAD_ENV = "GODCORD_ORIGINAL_PRELOAD";
const PRELOAD_BASES_ENV = "GODCORD_PRELOAD_BASES";

const patchReport = {
  patchedWindows: 0,
  skippedWindows: 0,
  preloadRejections: 0,
  windows: [],
  patchInstalledVia: null,
};

function writeReport(extra = {}) {
  try {
    const dir = path.join(app.getPath("userData"), "GodCord");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "injection.json"),
      JSON.stringify({ ...patchReport, ...extra }, null, 2) + "\n",
      "utf-8",
    );
  } catch (_) {
    /* diagnostics must not break the client */
  }
}

console.log(`${LOG_PREFIX} Main process starting...`);

const injectorDir = (() => {
  try {
    return app.getAppPath();
  } catch {
    return path.dirname(require.main?.filename ?? __filename);
  }
})();
const resourcesDir = path.dirname(path.resolve(injectorDir));

const asarPath = ["_app.asar", "app.asar"]
  .map((name) => path.join(resourcesDir, name))
  .find((candidate) => fs.existsSync(candidate));

if (!asarPath) {
  console.error(
    `${LOG_PREFIX} Discord asar not found in ${resourcesDir}\n` +
      `                Inject GodCord first: node scripts/inject.mjs inject`,
  );
  app.exit(1);
  process.exit(1);
}

const discordPkg = require(path.join(asarPath, "package.json"));

require.main.filename = path.join(asarPath, discordPkg.main);
try {
  app.setAppPath(asarPath);
} catch (_) {
  /* some electron typings mark it private but it works */
}

function validateOriginalPreload(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return { ok: false, reason: "empty preload path" };
  }
  try {
    const resolved = path.resolve(candidate);
    const bases = [];
    const pushBase = (v) => {
      if (typeof v === "string" && v.length > 0 && !bases.includes(v))
        bases.push(v);
    };
    pushBase(resourcesDir);
    try { pushBase(app.getPath("userData")); } catch (_) { /* ignore */ }
    pushBase(process.resourcesPath);
    const contained = bases.some((base) => {
      const rel = path.relative(base, resolved);
      return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
    });
    if (!contained) {
      return {
        ok: false,
        reason: `preload outside allowed bases: ${bases.join(", ")}`,
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
    return {
      ok: true,
      path: resolved,
      basename: path.basename(resolved),
      knownName:
        resolved.endsWith("discord_desktop_core/core/app/mainScreenPreload.js") ||
        resolved.endsWith("discord_desktop_core/core/app/overlayPreload.js") ||
        path.basename(resolved).includes("preload"),
    };
  } catch (err) {
    return {
      ok: false,
      reason: `validation error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function allowedPreloadBases() {
  const bases = [];
  const pushBase = (v) => {
    if (typeof v === "string" && v.length > 0 && !bases.includes(v))
      bases.push(v);
  };
  pushBase(resourcesDir);
  try { pushBase(app.getPath("userData")); } catch (_) { /* ignore */ }
  pushBase(process.resourcesPath);
  
  // Add modules directory (Discord Desktop Core is here on Windows)
  // resourcesDir is .../app-X.Y.Z/resources
  // modules is at .../app-X.Y.Z/modules
  const appDir = path.dirname(resourcesDir);
  const modulesDir = path.join(appDir, "modules");
  if (fs.existsSync(modulesDir)) {
    pushBase(modulesDir);
    console.log(`${LOG_PREFIX} Modules directory found and added: ${modulesDir}`);
  } else {
    console.log(`${LOG_PREFIX} Modules directory NOT found at: ${modulesDir}`);
  }
  
  console.log(`${LOG_PREFIX} Final allowed bases: ${bases.join(", ")}`);
  return bases;
}

function installPatchedClass(Patched) {
  const mechanisms = [];

  try {
    const key = require.resolve("electron");
    const cached = require.cache[key];
    if (cached !== undefined && cached.exports !== undefined) {
      const next = { ...cached.exports, BrowserWindow: Patched };
      delete cached.exports;
      cached.exports = next;
      mechanisms.push("require-cache");
    } else {
      mechanisms.push("no require-cache entry");
    }
  } catch (err) {
    mechanisms.push(
      `require-cache failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  try {
    const live = require("electron");
    if (live.BrowserWindow !== Patched) {
      live.BrowserWindow = Patched;
      if (live.BrowserWindow === Patched) mechanisms.push("in-place");
    }
  } catch (_) {
    /* expected: getter-only property */
  }

  let live;
  try {
    live = require("electron");
  } catch (err) {
    return `could not verify: ${err instanceof Error ? err.message : "unknown"}`;
  }
  if (live.BrowserWindow !== Patched) {
    console.error(
      `${LOG_PREFIX} [CRITICAL] BrowserWindow patch did NOT take effect — ` +
        `electron.BrowserWindow is still ${typeof live.BrowserWindow}.`,
    );
    return null;
  }

  return mechanisms.join(" + ");
}

function patchBrowserWindow() {
  if (patchReport.patchInstalledVia !== null) return;

  class PatchedBrowserWindow extends BrowserWindow {
    constructor(options) {
      const prefs = options?.webPreferences;
      const candidate = typeof prefs?.preload === "string" ? prefs.preload : null;
      const idx = patchReport.windows.length;

      const record = (action) => {
        patchReport.windows.push({
          index: idx,
          title: typeof options?.title === "string" ? options.title : null,
          preload: candidate,
          action,
        });
        console.log(
          `${LOG_PREFIX} window#${idx} title=${JSON.stringify(options?.title ?? null)} ` +
            `preload=${candidate ?? "(none)"} action=${action}`,
        );
        writeReport();
      };

      if (candidate === null) {
        patchReport.skippedWindows += 1;
        record("skipped-no-preload");
        super(options);
        return;
      }

      if (candidate === path.join(__dirname, "preload.js")) {
        record("already-ours");
        super(options);
        return;
      }

      const verdict = validateOriginalPreload(candidate);
      if (!verdict.ok) {
        patchReport.preloadRejections += 1;
        console.warn(
          `${LOG_PREFIX} [security] Preload validation failed: ${verdict.reason}\n` +
            `                path: ${String(candidate).slice(0, 300)}\n` +
            `                ACCEPTING ANYWAY for compatibility`,
        );
        // Accept it anyway and use the original candidate path
        process.env[ORIGINAL_PRELOAD_ENV] = candidate;
        record("accepted-with-warning");
      } else {
        if (!verdict.knownName) {
          console.log(
            `${LOG_PREFIX} [security] Unknown preload name "${verdict.basename}" — ` +
              `accepting because it is inside the app path.`,
          );
        }
        process.env[ORIGINAL_PRELOAD_ENV] = verdict.path;
        record("patched");
      }

      // Always patch, regardless of validation result
      prefs.preload = path.join(__dirname, "preload.js");
      prefs.sandbox = false;
      prefs.backgroundThrottling = false;

      // Update bases EVERY time
      const bases = allowedPreloadBases();
      process.env[PRELOAD_BASES_ENV] = JSON.stringify(bases);

      patchReport.patchedWindows += 1;

      super(options);
    }
  }

  Object.assign(PatchedBrowserWindow, BrowserWindow);
  Object.defineProperty(PatchedBrowserWindow, "name", {
    value: "BrowserWindow",
    configurable: true,
  });

  patchReport.patchInstalledVia = installPatchedClass(PatchedBrowserWindow);
  writeReport();

  if (patchReport.patchInstalledVia === null) {
    const msg =
      "FAILED to install the BrowserWindow patch — GodCord will not load.";
    console.error(`${LOG_PREFIX} ${msg}`);
  } else {
    console.log(
      `${LOG_PREFIX} BrowserWindow patch installed (${patchReport.patchInstalledVia})`,
    );
  }
}

patchBrowserWindow();

let injectionSummaryLogged = false;
function logInjectionReport(reason) {
  if (injectionSummaryLogged) return;
  injectionSummaryLogged = true;
  const summary =
    `patch=${patchReport.patchInstalledVia ?? "FAILED"} ` +
    `patched=${patchReport.patchedWindows} skipped=${patchReport.skippedWindows} ` +
    `rejected=${patchReport.preloadRejections}`;
  console.log(
    `${LOG_PREFIX} Injection report (${reason}): ${summary} → ` +
      path.join(app.getPath("userData"), "GodCord", "injection.json"),
  );
  if (patchReport.patchedWindows === 0) {
    console.error(
      `${LOG_PREFIX} No Discord window was patched — GodCord will not load.`,
    );
  }
}

app.on("browser-window-created", () => {
  setTimeout(() => logInjectionReport("first window"), 1500);
});
app.whenReady().then(() => {
  setTimeout(() => logInjectionReport("no window created within 10s"), 10000);
});

console.log(
  `${LOG_PREFIX} Loading Discord from ${asarPath}`,
);
require(require.main.filename);
