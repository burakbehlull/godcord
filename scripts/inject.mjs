import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const BRANCHES = [
  { id: "stable", win: ["Discord"], mac: ["Discord.app"], linux: ["discord", "Discord"], flatpak: ["com.discordapp.Discord"] },
  { id: "canary", win: ["DiscordCanary"], mac: ["Discord Canary.app"], linux: ["discord-canary", "DiscordCanary"], flatpak: ["com.discordapp.DiscordCanary"] },
  { id: "ptb", win: ["DiscordPTB"], mac: ["Discord PTB.app"], linux: ["discord-ptb", "DiscordPTB"], flatpak: ["com.discordapp.DiscordPTB"] },
  { id: "development", win: ["DiscordDevelopment"], mac: ["Discord Development.app"], linux: ["discord-development", "DiscordDevelopment"], flatpak: ["com.discordapp.DiscordDevelopment"] },
];

const LINUX_PREFIXES = ["/usr/share", "/usr/lib64", "/usr/lib", "/opt"];
const RANK = { custom: -1, stable: 0, canary: 1, ptb: 2, development: 3 };

function hasAsar(dir) {
  return (
    fs.existsSync(path.join(dir, "app.asar")) ||
    fs.existsSync(path.join(dir, "_app.asar"))
  );
}

function compareVersions(a, b) {
  const pa = a.split(".").map((p) => parseInt(p, 10) || 0);
  const pb = b.split(".").map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function newestAppResources(rootDir) {
  let names;
  try {
    names = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const apps = names
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("app-"))
    .map((entry) => entry.name.slice(4))
    .sort(compareVersions);

  for (let i = apps.length - 1; i >= 0; i--) {
    const resources = path.join(rootDir, `app-${apps[i]}`, "resources");
    if (hasAsar(resources)) return resources;
  }
  return null;
}

function resourcesIn(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) return null;
  if (hasAsar(rootDir)) return rootDir;

  const mac = path.join(rootDir, "Contents", "Resources");
  if (hasAsar(mac)) return mac;

  const direct = path.join(rootDir, "resources");
  if (hasAsar(direct)) return direct;

  return newestAppResources(rootDir);
}

function installCandidates(platformName, env, home) {
  const out = [];
  if (platformName === "darwin") {
    const parents = ["/Applications", path.join(home, "Applications")];
    for (const branch of BRANCHES) {
      for (const parent of parents) {
        for (const name of branch.mac) {
          out.push({ branch: branch.id, root: path.join(parent, name) });
        }
      }
    }
    return out;
  }
  if (platformName === "win32") {
    const local = env.LOCALAPPDATA;
    if (!local) return out;
    for (const branch of BRANCHES) {
      for (const name of branch.win) {
        out.push({ branch: branch.id, root: path.join(local, name) });
      }
    }
    return out;
  }
  for (const branch of BRANCHES) {
    for (const prefix of LINUX_PREFIXES) {
      for (const name of branch.linux) {
        out.push({ branch: branch.id, root: path.join(prefix, name) });
      }
    }
    for (const name of branch.linux) {
      out.push({ branch: branch.id, root: path.join(home, name) });
    }
    const flatpakParents = [
      path.join(home, ".local", "share", "flatpak", "app"),
      "/var/lib/flatpak/app",
    ];
    for (const parent of flatpakParents) {
      for (const id of branch.flatpak) {
        const base = path.join(parent, id, "current", "active", "files");
        out.push({ branch: branch.id, root: path.join(base, "discord") });
        out.push({ branch: branch.id, root: path.join(base, "extra", "discord") });
      }
    }
  }
  return out;
}

function notFoundError(platformName) {
  const lines = ["Discord desktop install not found."];
  if (platformName === "darwin") {
    lines.push("Looked in /Applications and ~/Applications for Discord, Canary, PTB, and Development.");
  } else if (platformName === "win32") {
    lines.push("Looked in %LOCALAPPDATA% for Discord, DiscordCanary, DiscordPTB, and DiscordDevelopment.");
    lines.push("The Microsoft Store build is not supported.");
  } else {
    lines.push("Looked in /usr/share, /usr/lib, /opt, ~/ , and Flatpak.");
    lines.push("Snap builds are read-only and are not supported.");
  }
  lines.push(
    "Set GODCORD_DISCORD_PATH to Discord.app, the Discord folder, or the resources folder that contains app.asar.",
  );
  return new Error(lines.join("\n"));
}

function findDiscordInstalls(options = {}) {
  const platformName = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.home ?? os.homedir();
  const preferred = env.GODCORD_DISCORD_PATH;

  if (preferred) {
    const res = resourcesIn(preferred);
    if (!res) {
      throw new Error(
        `GODCORD_DISCORD_PATH is not a Discord install: ${preferred}\n` +
          "Point it at Discord.app, the Discord folder, or the resources folder that contains app.asar.",
      );
    }
    return [{ branch: "custom", root: preferred, resources: res }];
  }

  const found = [];
  const seen = new Set();
  for (const candidate of installCandidates(platformName, env, home)) {
    const res = resourcesIn(candidate.root);
    if (!res || seen.has(res)) continue;
    seen.add(res);
    found.push({ branch: candidate.branch, root: candidate.root, resources: res });
  }
  found.sort((a, b) => (RANK[a.branch] ?? 9) - (RANK[b.branch] ?? 9));
  if (found.length === 0) throw notFoundError(platformName);
  return found;
}

function permissionHelp(platformName = process.platform) {
  const quit =
    "Quit Discord completely, including the tray icon, then run the command again.";
  if (platformName === "win32") {
    return `${quit}\nIf Discord is outside your user folder, run the terminal as Administrator.\nQuick kill: taskkill /F /IM Discord.exe`;
  }
  return `${quit}\nIf the install is not writable, run with sudo first.\nOn macOS you can instead grant Full Disk Access to Terminal or Cursor.`;
}

function assertBuilt() {
  for (const file of ["main.js", "preload.js", "renderer.js"]) {
    const p = path.join(dist, file);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing dist/${file}. Run: npm run build`);
    }
    const sz = fs.statSync(p).size;
    if (sz === 0) {
      throw new Error(`dist/${file} is 0 bytes - build failed. Run: npm run build`);
    }
    console.log(`[GodCord] dist/${file} OK (${sz} bytes)`);
  }
}

function renameWithHelp(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (err) {
    const code = err && err.code;
    if (code === "EPERM" || code === "EACCES" || code === "EBUSY") {
      throw new Error(`Cannot modify Discord (${from}).\n${permissionHelp()}`);
    }
    throw err;
  }
}

function removeWithHelp(target, label) {
  try {
    fs.unlinkSync(target);
  } catch (err) {
    const code = err && err.code;
    if (code === "EPERM" || code === "EACCES" || code === "EBUSY") {
      throw new Error(
        `Cannot ${label} (${target}).\n` +
          `Discord is likely currently running.\n${permissionHelp()}`,
      );
    }
    throw err;
  }
}

function targetInstall() {
  const installs = findDiscordInstalls();
  const chosen = installs[0];
  const others = installs.slice(1);
  console.log(
    `[GodCord] Using Discord ${chosen.branch} at ${chosen.resources}`,
  );
  if (others.length > 0) {
    console.log(
      "[GodCord] Other installs (set GODCORD_DISCORD_PATH to use one):",
    );
    for (const i of others) {
      console.log(`  ${i.branch}: ${i.resources}`);
    }
  }
  return chosen.resources;
}

function killDiscordHint() {
  const plat = os.platform();
  if (plat === "win32") return "taskkill /F /IM Discord.exe";
  if (plat === "darwin") return "killall Discord";
  return "killall discord Discord";
}

function inject() {
  assertBuilt();
  const resources = targetInstall();
  const asar = path.join(resources, "app.asar");
  const backup = path.join(resources, "_app.asar");
  const appDir = path.join(resources, "app");

  const asarExists = fs.existsSync(asar);
  const backupExists = fs.existsSync(backup);
  const appDirExists = fs.existsSync(appDir);

  console.log(
    `\n[GodCord] Pre-check: app.asar=${asarExists ? "⚠️  STILL EXISTS (CRITICAL!)" : "✅ removed"} ` +
      ` | _app.asar=${backupExists ? "✅ present" : "❌ missing"} | app/=${appDirExists ? "exists" : "will create"}`,
  );

  if (asarExists && appDirExists) {
    console.log(
      "\n[GodCord] ⚠️  DETECTED: BOTH app.asar AND app/ EXIST! " +
        "Electron will LOAD app.asar (original Discord) and IGNORE app/.\n" +
        "              This is why you see nothing! Removing conflicting app.asar now...\n",
    );
  }

  if (!backupExists) {
    if (!asarExists) {
      throw new Error(
        `Neither app.asar nor _app.asar found in ${resources}.\n` +
          `Reinstall Discord first - the original files are missing.`,
      );
    }
    console.log("[GodCord] First time inject: backing up original Discord...");
    try {
      fs.copyFileSync(asar, backup);
      console.log(`[GodCord] ✅ Backed up app.asar → _app.asar (${fs.statSync(backup).size} bytes)`);
    } catch (err) {
      const code = err && err.code;
      if (code === "EBUSY" || code === "EPERM") {
        console.error("\n❌ Cannot read app.asar - Discord is still running!");
        console.error(`   Fully close Discord first, then run: ${killDiscordHint()}`);
        process.exit(1);
      }
      throw err;
    }
  }

  if (asarExists) {
    console.log(
      `[GodCord] 🗑️  Removing conflicting app.asar so Electron loads app/ instead...`,
    );
    try {
      removeWithHelp(asar, "remove conflicting app.asar");
      console.log("[GodCord] ✅ app.asar removed (critical)");
    } catch (err) {
      const code = err && err.code;
      if (code === "EBUSY" || code === "EPERM") {
        console.error("\n❌ Cannot remove app.asar - it is LOCKED!");
        console.error("   Discord is still OPEN (tray icon included).");
        console.error(`   Fully close first: Right-click tray → Quit, or run: ${killDiscordHint()}`);
        process.exit(1);
      }
      throw err;
    }
  }

  if (!appDirExists) {
    fs.mkdirSync(appDir, { recursive: true });
    console.log("[GodCord] Created resources/app directory");
  } else {
    console.log("[GodCord] Updating existing resources/app build files...");
  }

  const NEEDED = ["main.js", "preload.js", "renderer.js"];
  for (const file of NEEDED) {
    const src = path.join(dist, file);
    const dst = path.join(appDir, file);
    fs.copyFileSync(src, dst);
    const sz = fs.statSync(dst).size;
    console.log(`[GodCord]   Copied ${file} (${sz} bytes) → resources/app/`);
  }

  const pkgPath = path.join(appDir, "package.json");
  const pkg = { name: "discord", main: "main.js", private: true };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[GodCord]   Wrote package.json (main: "main.js")`);

  const finalCheckAsar = fs.existsSync(asar);
  const finalCheckApp = fs.existsSync(pkgPath);
  console.log(
    `\n[GodCord] Final check: app.asar=${finalCheckAsar ? "❌ STILL EXISTS! BAD" : "✅ gone (correct)"} ` +
      ` | app/package.json exists=${finalCheckApp ? "✅ yes" : "❌ no"}\n`,
  );

  if (finalCheckAsar) {
    console.error(
      "\n❌ FAILURE: app.asar could not be removed. Electron will load original Discord!\n" +
        "   Solution: FULLY close Discord (tray icon too) and run inject again.\n" +
        `   Quick fix: Run: ${killDiscordHint()}\n`,
    );
    process.exit(1);
  }

  console.log(`✅ GodCord SUCCESSFULLY injected!`);
  console.log(`📁 Location: ${appDir}`);
  console.log(
    "\n🚀 NEXT STEPS:\n" +
      "   1. Open Discord normally\n" +
      "   2. Press F12 → Console tab → Look for [GodCord] lines:\n" +
      "      - At MINIMUM you should see '[GodCord] Main process starting...'\n" +
      "      - If you see NOTHING, then Discord is still loading app.asar somehow\n" +
      "   3. Look for a GREEN GodCord badge at BOTTOM-RIGHT of Discord\n" +
      "      (we added this debug badge so you can tell it's working)\n" +
      "   4. Also try pressing Ctrl+Shift+G\n",
  );
}

function uninject() {
  console.log("[GodCord] Uninjecting...");

  const resources = targetInstall();
  const asar = path.join(resources, "app.asar");
  const backup = path.join(resources, "_app.asar");
  const appDir = path.join(resources, "app");

  try {
    if (fs.existsSync(backup)) {
      const fd = fs.openSync(backup, "r");
      fs.closeSync(fd);
    }
  } catch (err) {
    const code = err && err.code;
    if (code === "EBUSY" || code === "EPERM") {
      console.error("\n❌ Discord is currently running!");
      console.error("Please FULLY CLOSE Discord (including tray icon) and try again.");
      console.error(`Quick kill: ${killDiscordHint()}\n`);
      process.exit(1);
    }
  }

  if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true, force: true });
    console.log("[GodCord] Removed resources/app");
  }

  if (fs.existsSync(backup) && !fs.existsSync(asar)) {
    try {
      renameWithHelp(backup, asar);
      console.log("[GodCord] Restored _app.asar → app.asar");
    } catch (err) {
      const code = err && err.code;
      if (code === "EBUSY" || code === "EPERM") {
        console.error("\n❌ Discord is still running!");
        console.error(`Fully close first: ${killDiscordHint()}\n`);
        process.exit(1);
      }
      throw err;
    }
  }

  console.log("\n✅ GodCord uninjected successfully!");
  console.log("Now restart Discord.\n");
}

const cmd = process.argv[2] ?? "inject";
if (cmd === "inject" || cmd === "sync") {
  inject();
  if (cmd === "sync") {
    console.log("[GodCord] Sync done — reload Discord (Ctrl+R)");
  }
} else if (cmd === "uninject") {
  uninject();
} else {
  console.error(`Unknown command: ${cmd}. Use inject | sync | uninject`);
  process.exit(1);
}
