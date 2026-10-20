import * as esbuild from "esbuild";
import path from "node:path";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  sourcemap: true,
  minify: false,
  logLevel: "info",
  target: "es2022",
};

const builds = [
  {
    ...shared,
    entryPoints: ["src/main/index.ts"],
    outfile: "dist/main.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  },
  {
    ...shared,
    entryPoints: ["src/preload/index.ts"],
    outfile: "dist/preload.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  },
  {
    ...shared,
    entryPoints: ["src/renderer/index.ts"],
    outfile: "dist/renderer.js",
    platform: "browser",
    format: "iife",
  },
];

if (watch) {
  console.log("[GodCord] Watching for changes...");
  const contexts = await Promise.all(builds.map((opts) => esbuild.context(opts)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  console.log("[GodCord] Building...");
  await Promise.all(builds.map((opts) => esbuild.build(opts)));
  console.log("[GodCord] Build completed!");
}
