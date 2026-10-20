import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

console.log("[GodCord] Final Injection Method - Discordion Style");

function assertBuilt() {
  for (const file of ["main.js", "preload.js", "renderer.js"]) {
    if (!fs.existsSync(path.join(dist, file))) {
      console.error(`❌ Missing dist/${file}. Run: node scripts/build.mjs`);
      process.exit(1);
    }
    const size = fs.statSync(path.join(dist, file)).size;
    console.log(`[GodCord] dist/${file} OK (${size} bytes)`);
  }
}

function findDiscordPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    console.error("❌ LOCALAPPDATA not found!");
    process.exit(1);
  }

  const discordBase = path.join(localAppData, "Discord");
  if (!fs.existsSync(discordBase)) {
    console.error(`❌ Discord not found at: ${discordBase}`);
    process.exit(1);
  }

  const apps = fs.readdirSync(discordBase)
    .filter(name => name.startsWith("app-"))
    .sort()
    .reverse();

  if (apps.length === 0) {
    console.error("❌ No Discord app-* folders found!");
    process.exit(1);
  }

  const chosen = path.join(discordBase, apps[0], "resources");
  console.log(`[GodCord] Using Discord at ${chosen}`);
  return chosen;
}

function inject() {
  assertBuilt();
  const resources = findDiscordPath();
  const asar = path.join(resources, "app.asar");
  const backup = path.join(resources, "_app.asar");
  const appDir = path.join(resources, "app");

  if (fs.existsSync(appDir)) {
    console.log("[GodCord] Already injected (resources/app exists). Re-copying build files…");
  } else {
    // Rename app.asar to _app.asar
    if (!fs.existsSync(backup)) {
      if (!fs.existsSync(asar)) {
        console.error(`❌ Neither app.asar nor _app.asar found in ${resources}`);
        process.exit(1);
      }
      console.log("[GodCord] Renaming app.asar → _app.asar");
      fs.renameSync(asar, backup);
    }
    // Create app/ directory
    fs.mkdirSync(appDir, { recursive: true });
  }

  // Copy built files
  for (const file of fs.readdirSync(dist)) {
    if (!file.endsWith(".js") && !file.endsWith(".map") && !file.endsWith(".json")) continue;
    fs.copyFileSync(path.join(dist, file), path.join(appDir, file));
  }

  // Create package.json
  fs.writeFileSync(
    path.join(appDir, "package.json"),
    JSON.stringify(
      {
        name: "discord",
        main: "main.js",
        private: true,
      },
      null,
      2,
    ),
  );

  console.log(`[GodCord] ✅ Injected into ${appDir}`);
  console.log("[GodCord] Restart Discord to load GodCord.");
}

function uninject() {
  const resources = findDiscordPath();
  const asar = path.join(resources, "app.asar");
  const backup = path.join(resources, "_app.asar");
  const appDir = path.join(resources, "app");

  if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true, force: true });
    console.log("[GodCord] Removed resources/app");
  }

  if (fs.existsSync(backup) && !fs.existsSync(asar)) {
    fs.renameSync(backup, asar);
    console.log("[GodCord] Restored _app.asar → app.asar");
  }

  console.log("[GodCord] ✅ Uninjected. Restart Discord.");
}

const cmd = process.argv[2] ?? "inject";
if (cmd === "inject") {
  inject();
} else if (cmd === "uninject") {
  uninject();
} else {
  console.error(`Unknown command: ${cmd}. Use inject | uninject`);
  process.exit(1);
}
