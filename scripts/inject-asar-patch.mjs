import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distPath = path.join(root, "dist");

console.log("[GodCord ASAR Patcher] Starting...");

// Find Discord installation
function findDiscordPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    console.error("❌ LOCALAPPDATA environment variable not found!");
    process.exit(1);
  }

  const discordBase = path.join(localAppData, "Discord");
  if (!fs.existsSync(discordBase)) {
    console.error(`❌ Discord not found at: ${discordBase}`);
    process.exit(1);
  }

  const apps = fs
    .readdirSync(discordBase)
    .filter((name) => name.startsWith("app-"))
    .sort()
    .reverse();

  if (apps.length === 0) {
    console.error("❌ No Discord app-* folders found!");
    process.exit(1);
  }

  return path.join(discordBase, apps[0]);
}

function checkBuild() {
  const requiredFiles = ["main.js", "preload.js", "renderer.js"];
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing ${file}! Run: node scripts/build.mjs`);
      process.exit(1);
    }
    const size = fs.statSync(filePath).size;
    console.log(`[GodCord] dist/${file} OK (${size} bytes)`);
  }
}

async function inject() {
  checkBuild();

  const discordPath = findDiscordPath();
  const resourcesPath = path.join(discordPath, "resources");
  const appAsarPath = path.join(resourcesPath, "app.asar");
  const backupAsarPath = path.join(resourcesPath, "_app.asar.backup");
  const appDirPath = path.join(resourcesPath, "app");

  console.log(`[GodCord] Using Discord at: ${discordPath}`);

  // Check if already injected
  if (fs.existsSync(appDirPath) && fs.existsSync(path.join(appDirPath, "package.json"))) {
    console.log("⚠️  GodCord is already injected!");
    console.log("   Run: node scripts/inject-asar-patch.mjs uninject");
    console.log("   Then: node scripts/inject-asar-patch.mjs inject");
    return;
  }

  // Backup original app.asar
  if (fs.existsSync(appAsarPath)) {
    if (!fs.existsSync(backupAsarPath)) {
      console.log("[GodCord] Backing up app.asar → _app.asar.backup...");
      fs.copyFileSync(appAsarPath, backupAsarPath);
    } else {
      console.log("[GodCord] Backup already exists: _app.asar.backup");
    }
    
    // Remove app.asar
    console.log("[GodCord] Removing app.asar...");
    fs.unlinkSync(appAsarPath);
  } else if (fs.existsSync(backupAsarPath)) {
    console.log("[GodCord] app.asar already removed, backup exists");
  } else {
    console.error("❌ Neither app.asar nor _app.asar.backup found!");
    process.exit(1);
  }

  // Create app/ directory
  console.log("[GodCord] Creating app/ directory...");
  fs.mkdirSync(appDirPath, { recursive: true });

  // Create package.json
  const packageJson = {
    name: "discord",
    main: "index.js",
    private: true,
  };
  fs.writeFileSync(
    path.join(appDirPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create index.js that loads Discord from backup
  const indexJs = `// GodCord Entry Point
console.log("[GodCord] index.js loading...");

const path = require("path");
const fs = require("fs");

// Get the resources directory (parent of app/)
const resourcesDir = path.dirname(__dirname);

// Find the backup asar
const backupAsar = path.join(resourcesDir, "_app.asar.backup");

if (!fs.existsSync(backupAsar)) {
  console.error("[GodCord] ERROR: Backup not found at:", backupAsar);
  process.exit(1);
}

console.log("[GodCord] Found backup at:", backupAsar);

// Set app path to the backup asar
const electron = require("electron");
const { app } = electron;

try {
  app.setAppPath(backupAsar);
  console.log("[GodCord] App path set to backup");
} catch (e) {
  console.error("[GodCord] Failed to set app path:", e);
}

// Load Discord's package.json from backup
const discordPkg = require(backupAsar + "/package.json");
const discordMain = path.join(backupAsar, discordPkg.main);

console.log("[GodCord] Discord main file:", discordMain);

// Update require.main
if (require.main) {
  require.main.filename = discordMain;
}

// Load our patcher first
console.log("[GodCord] Loading patcher...");
require("./patcher.js");

// Then load Discord
console.log("[GodCord] Loading Discord...");
require(discordMain);
`;

  fs.writeFileSync(path.join(appDirPath, "index.js"), indexJs);
  console.log("[GodCord] Created index.js");

  // Create patcher.js
  const patcherJs = `// GodCord Patcher
console.log("[GodCord] Patcher loading...");

const path = require("path");
const { BrowserWindow } = require("electron");
const fs = require("fs");

const ORIGINAL_PRELOAD_ENV = "GODCORD_ORIGINAL_PRELOAD";

// Patch BrowserWindow
const OriginalBrowserWindow = BrowserWindow;
class PatchedBrowserWindow extends OriginalBrowserWindow {
  constructor(options) {
    if (options?.webPreferences?.preload) {
      // Save original preload
      process.env[ORIGINAL_PRELOAD_ENV] = options.webPreferences.preload;
      
      // Use our preload
      options.webPreferences.preload = path.join(__dirname, "preload.js");
      options.webPreferences.sandbox = false;
      
      console.log("[GodCord] Preload patched:", options.webPreferences.preload);
    }
    
    super(options);
  }
}

// Copy all static properties
Object.assign(PatchedBrowserWindow, OriginalBrowserWindow);
Object.setPrototypeOf(PatchedBrowserWindow, OriginalBrowserWindow);

// Replace BrowserWindow in electron module
const electronPath = require.resolve("electron");
const electronModule = require.cache[electronPath];
if (electronModule && electronModule.exports) {
  electronModule.exports = {
    ...electronModule.exports,
    BrowserWindow: PatchedBrowserWindow
  };
  console.log("[GodCord] BrowserWindow patched successfully!");
} else {
  console.error("[GodCord] Failed to patch BrowserWindow!");
}
`;

  fs.writeFileSync(path.join(appDirPath, "patcher.js"), patcherJs);
  console.log("[GodCord] Created patcher.js");

  // Copy built files
  console.log("[GodCord] Copying built files...");
  fs.copyFileSync(
    path.join(distPath, "preload.js"),
    path.join(appDirPath, "preload.js")
  );
  fs.copyFileSync(
    path.join(distPath, "renderer.js"),
    path.join(appDirPath, "renderer.js")
  );

  console.log("\n✅ GodCord injected successfully!");
  console.log("📁 Location:", appDirPath);
  console.log("\n🚀 Next steps:");
  console.log("   1. Start Discord");
  console.log("   2. Press F12 → Console");
  console.log("   3. Look for [GodCord] logs");
  console.log("   4. Look for GodCord button or press Ctrl+Shift+G\n");
}

function uninject() {
  const discordPath = findDiscordPath();
  const resourcesPath = path.join(discordPath, "resources");
  const appAsarPath = path.join(resourcesPath, "app.asar");
  const backupAsarPath = path.join(resourcesPath, "_app.asar.backup");
  const appDirPath = path.join(resourcesPath, "app");

  console.log("[GodCord] Uninjecting...");

  // Remove app/ directory
  if (fs.existsSync(appDirPath)) {
    fs.rmSync(appDirPath, { recursive: true, force: true });
    console.log("✅ Removed app/ directory");
  }

  // Restore backup
  if (fs.existsSync(backupAsarPath)) {
    if (fs.existsSync(appAsarPath)) {
      fs.unlinkSync(appAsarPath);
    }
    fs.copyFileSync(backupAsarPath, appAsarPath);
    fs.unlinkSync(backupAsarPath);
    console.log("✅ Restored app.asar from backup");
  }

  console.log("\n✅ GodCord uninjected!");
  console.log("Restart Discord to use vanilla client.\n");
}

const command = process.argv[2] || "inject";

if (command === "inject") {
  await inject();
} else if (command === "uninject") {
  uninject();
} else {
  console.log("Usage: node inject-asar-patch.mjs [inject|uninject]");
  process.exit(1);
}
