#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const binFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(binFilePath), "..");
const projectRoot = process.cwd();
const require = createRequire(import.meta.url);

const command = process.argv[2];
const passthroughStart = process.argv[3] === "--" ? 4 : 3;
const passthroughArgs = process.argv.slice(passthroughStart);
const customArgPrefixes = ["--client-entry", "--server-entry", "--routes", "--out-dir", "--runtime-out-dir"];

function printHelp() {
  console.log(
    [
      "webframez-react CLI",
      "",
      "Usage:",
      "  webframez-react build:server",
      "  webframez-react watch:server",
      "  webframez-react build:client",
      "  webframez-react watch:client",
      "  webframez-react build:routes --routes=dist/app/routes.js --out-dir=dist",
      "  webframez-react watch:routes --routes=dist/app/routes.js --out-dir=dist",
      "  webframez-react build:server:webpack",
      "  webframez-react watch:server:webpack",
      "  webframez-react exec -- <command> [args...]",
      "",
      "Config fallback order:",
      "  1) project root override file",
      "  2) package default in @webtypen/webframez-react/defaults",
      "",
      "Override file names:",
      "  - tsconfig.server.json",
      "  - webpack.client.cjs",
      "  - webpack.server.cjs",
      "",
      "Optional project config file:",
      "  - webframez-react.config.mjs|cjs|js|json",
      "",
      "Optional CLI overrides:",
      "  --client-entry=src/client.tsx",
      "  --server-entry=src/server.ts",
      "  --routes=dist/app/routes.js",
      "  --out-dir=dist",
      "  --runtime-out-dir=dist",
    ].join("\n"),
  );
}

function hasFlag(flag) {
  return passthroughArgs.includes(flag);
}

function normalizeRelativePath(value) {
  return value.replace(/\\/g, "/");
}

function readCustomArg(name) {
  const withEquals = `${name}=`;
  for (let index = 0; index < passthroughArgs.length; index += 1) {
    const value = passthroughArgs[index];
    if (value === name) {
      return passthroughArgs[index + 1] || null;
    }
    if (value.startsWith(withEquals)) {
      return value.slice(withEquals.length);
    }
  }
  return null;
}

function requireCustomArg(name, description) {
  const value = readCustomArg(name);
  if (!value) {
    throw new Error(`Missing ${description || name}.`);
  }
  return value;
}

function stripCustomArgs(args) {
  const filtered = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    const matchedPrefix = customArgPrefixes.find(
      (prefix) => value === prefix || value.startsWith(`${prefix}=`),
    );
    if (!matchedPrefix) {
      filtered.push(value);
      continue;
    }

    if (value === matchedPrefix) {
      index += 1;
    }
  }
  return filtered;
}

function resolveConfig(localFileName, fallbackFileName) {
  const localPath = path.resolve(projectRoot, localFileName);
  if (fs.existsSync(localPath)) {
    return {
      path: localPath,
      source: "project",
      name: localFileName,
    };
  }

  return {
    path: path.resolve(packageRoot, "defaults", fallbackFileName),
    source: "package",
    name: fallbackFileName,
  };
}

function resolveBinary(name) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const localBinary = path.resolve(projectRoot, "node_modules", ".bin", `${name}${extension}`);
  if (fs.existsSync(localBinary)) {
    return localBinary;
  }

  return name;
}

function buildReactServerNodeOptions() {
  const existing = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
  return `${existing}--conditions react-server -r @webtypen/webframez-react/register`.trim();
}

function hasReactServerCondition() {
  if (process.execArgv.includes("--conditions=react-server")) {
    return true;
  }

  for (let index = 0; index < process.execArgv.length; index += 1) {
    if (process.execArgv[index] === "--conditions" && process.execArgv[index + 1] === "react-server") {
      return true;
    }
  }

  return /\b--conditions(?:=|\s+)react-server\b/.test(process.env.NODE_OPTIONS || "");
}

async function reexecWithReactServerConditionIfNeeded() {
  if (
    (command !== "build:routes" && command !== "watch:routes") ||
    hasReactServerCondition() ||
    process.env.WEBFRAMEZ_REACT_CLI_REEXEC === "1"
  ) {
    return false;
  }

  const child = spawn(process.execPath, [
    "--conditions",
    "react-server",
    "--require",
    path.resolve(packageRoot, "register.cjs"),
    binFilePath,
    ...process.argv.slice(2),
  ], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      WEBFRAMEZ_REACT_CLI_REEXEC: "1",
    },
  });

  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (exitCode) => resolve(exitCode || 0));
  });

  process.exit(code);
  return true;
}

async function loadProjectConfig() {
  const configFiles = [
    "webframez-react.config.mjs",
    "webframez-react.config.cjs",
    "webframez-react.config.js",
    "webframez-react.config.json",
  ];

  for (const fileName of configFiles) {
    const filePath = path.resolve(projectRoot, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    if (fileName.endsWith(".json")) {
      return JSON.parse(await fsp.readFile(filePath, "utf8"));
    }

    const imported = await import(pathToFileURL(filePath).href);
    return imported.default ?? imported;
  }

  return {};
}

function resolveEntryPath(projectConfig, customArgValue, configKey, defaults) {
  const configuredValue = customArgValue || projectConfig?.[configKey];
  if (configuredValue && typeof configuredValue === "string") {
    return path.resolve(projectRoot, configuredValue);
  }

  for (const defaultPath of defaults) {
    const resolved = path.resolve(projectRoot, defaultPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return path.resolve(projectRoot, defaults[0]);
}

async function createServerTsConfig(baseConfig, serverEntryPath, clientEntryPath) {
  const generatedPath = path.resolve(projectRoot, ".webframez-react.tsconfig.server.json");
  const extendsPath =
    baseConfig.source === "project"
      ? `./${normalizeRelativePath(path.basename(baseConfig.path))}`
      : normalizeRelativePath(path.relative(projectRoot, baseConfig.path));

  const include = [
    normalizeRelativePath(path.relative(projectRoot, serverEntryPath)),
    "src/components/**/*.tsx",
    "pages/**/*.tsx",
    "src/types.d.ts",
  ];

  const exclude = [
    normalizeRelativePath(path.relative(projectRoot, clientEntryPath)),
    "dist",
    "node_modules",
  ];

  const generatedConfig = {
    extends: extendsPath,
    include: Array.from(new Set(include)),
    exclude: Array.from(new Set(exclude)),
  };

  await fsp.writeFile(generatedPath, JSON.stringify(generatedConfig, null, 2));
  return generatedPath;
}

function run(binaryName, args, envAdditions = {}) {
  const binary = resolveBinary(binaryName);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        ...envAdditions,
      },
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve(code || 0);
    });
  });
}

function start(binaryName, args, envAdditions = {}) {
  const binary = resolveBinary(binaryName);

  return spawn(binary, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...envAdditions,
    },
  });
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function mapTargetPath(value, fromRoot, toRoot) {
  if (!value) {
    return value;
  }

  const relative = path.relative(fromRoot, value);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return value;
  }

  return path.resolve(toRoot, relative);
}

async function loadRouteBuildTargets(routesPath, outDir, runtimeOutDir) {
  const coreModulePath = path.resolve(packageRoot, "dist", "webframez-core.cjs");
  const core = require(coreModulePath);
  const Module = require("node:module");
  const originalLoad = Module._load;
  const previousOutDir = process.env.WEBFRAMEZ_REACT_OUT_DIR;
  const previousCaptureRoutes = process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES;
  const fakeRoute = {
    extend(name, factory) {
      this[name] = factory(this);
      return this;
    },
    group(_options, callback) {
      if (typeof callback === "function") {
        callback();
      }
    },
    get() {},
    post() {},
    put() {},
    delete() {},
  };

  process.env.WEBFRAMEZ_REACT_OUT_DIR = runtimeOutDir;
  process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES = "1";
  core.clearRegisteredReactBuildTargets();
  Module._load = function webframezReactCaptureModuleLoad(request, parent, isMain) {
    if (request === "@webtypen/webframez-react") {
      return require(path.resolve(packageRoot, "dist", "index.cjs"));
    }
    if (request === "@webtypen/webframez-react/http") {
      return require(path.resolve(packageRoot, "dist", "http.cjs"));
    }
    if (request === "@webtypen/webframez-react/webframez-core") {
      return require(path.resolve(packageRoot, "dist", "webframez-core.cjs"));
    }
    if (request === "@webtypen/webframez-react/navigation") {
      return require(path.resolve(packageRoot, "dist", "navigation.cjs"));
    }
    if (request === "@webtypen/webframez-react/route-slot") {
      return require(path.resolve(packageRoot, "dist", "route-slot.cjs"));
    }
    if (request === "@webtypen/webframez-react/client") {
      return require(path.resolve(packageRoot, "dist", "client.cjs"));
    }

    if (
      request === "@webtypen/webframez-core" ||
      request === "webframez-core" ||
      request === "@webtypen/webframez-core/dist/Router/Route" ||
      request === "webframez-core/dist/Router/Route"
    ) {
      return {
        Route: fakeRoute,
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const resolvedRoutesPath = path.resolve(projectRoot, routesPath);
    await import(pathToFileURL(resolvedRoutesPath).href);
    return core.getRegisteredReactBuildTargets().map((target) => ({
      ...target,
      runtimeDistRootDir: target.distRootDir,
      runtimePagesDir: target.pagesDir,
      runtimeManifestPath: target.manifestPath,
      distRootDir: mapTargetPath(target.distRootDir, runtimeOutDir, outDir),
      pagesDir: mapTargetPath(target.pagesDir, runtimeOutDir, outDir),
      manifestPath: mapTargetPath(target.manifestPath, runtimeOutDir, outDir),
    }));
  } finally {
    Module._load = originalLoad;
    if (previousOutDir === undefined) {
      delete process.env.WEBFRAMEZ_REACT_OUT_DIR;
    } else {
      process.env.WEBFRAMEZ_REACT_OUT_DIR = previousOutDir;
    }
    if (previousCaptureRoutes === undefined) {
      delete process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES;
    } else {
      process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES = previousCaptureRoutes;
    }
  }
}

async function waitForFile(filePath) {
  const startedAt = Date.now();

  while (!fileExists(filePath)) {
    if (Date.now() - startedAt > 30000) {
      throw new Error(`Timed out waiting for ${filePath}.`);
    }

    console.log(`[webframez-react] waiting for routes file: ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function buildRouteStyles(target) {
  if (!target.styleSrcPath || !fileExists(target.styleSrcPath)) {
    return 0;
  }

  const outputDir = path.join(target.distRootDir, "scss");
  await fsp.mkdir(outputDir, { recursive: true });
  console.log(`[webframez-react] sass: ${target.styleSrcPath} -> ${outputDir}`);

  return run("sass", ["--no-source-map", `${target.styleSrcPath}:${outputDir}`]);
}

async function buildRouteClient(target, passthroughArgsClean) {
  const config = {
    path: path.resolve(packageRoot, "defaults", "webpack.client.cjs"),
    source: "package",
  };
  const clientEntry = target.clientEntryPath || path.resolve(packageRoot, "defaults", "default-client.js");

  console.log(`[webframez-react] route: ${target.path}`);
  console.log(`[webframez-react] webpack config (${config.source}): ${config.path}`);
  console.log(`[webframez-react] pages: ${target.pagesDir}`);
  console.log(`[webframez-react] dist: ${target.distRootDir}`);
  console.log(`[webframez-react] client entry: ${clientEntry}`);

  return run(
    "webpack",
    ["--config", config.path, ...passthroughArgsClean],
    {
      WEBFRAMEZ_REACT_CLIENT_ENTRY: clientEntry,
      WEBFRAMEZ_REACT_DIST_ROOT_DIR: target.distRootDir,
      WEBFRAMEZ_REACT_PAGES_DIR: target.pagesDir,
      WEBFRAMEZ_REACT_RUNTIME_DIST_ROOT_DIR: target.runtimeDistRootDir || target.distRootDir,
      WEBFRAMEZ_REACT_RUNTIME_PAGES_DIR: target.runtimePagesDir || target.pagesDir,
    },
  );
}

function watchRouteStyles(target) {
  if (!target.styleSrcPath || !fileExists(target.styleSrcPath)) {
    return null;
  }

  const outputDir = path.join(target.distRootDir, "scss");
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`[webframez-react] sass watch: ${target.styleSrcPath} -> ${outputDir}`);

  return start("sass", ["--watch", "--poll", "--no-source-map", `${target.styleSrcPath}:${outputDir}`]);
}

function watchRouteClient(target, passthroughArgsClean) {
  const config = {
    path: path.resolve(packageRoot, "defaults", "webpack.client.cjs"),
    source: "package",
  };
  const clientEntry = target.clientEntryPath || path.resolve(packageRoot, "defaults", "default-client.js");
  const args = ["--config", config.path, ...passthroughArgsClean];

  if (!args.includes("--watch")) {
    args.push("--watch");
  }

  console.log(`[webframez-react] route watch: ${target.path}`);
  console.log(`[webframez-react] webpack config (${config.source}): ${config.path}`);
  console.log(`[webframez-react] pages: ${target.pagesDir}`);
  console.log(`[webframez-react] dist: ${target.distRootDir}`);
  console.log(`[webframez-react] client entry: ${clientEntry}`);

  return start("webpack", args, {
    WEBFRAMEZ_REACT_CLIENT_ENTRY: clientEntry,
    WEBFRAMEZ_REACT_DIST_ROOT_DIR: target.distRootDir,
    WEBFRAMEZ_REACT_PAGES_DIR: target.pagesDir,
    WEBFRAMEZ_REACT_RUNTIME_DIST_ROOT_DIR: target.runtimeDistRootDir || target.distRootDir,
    WEBFRAMEZ_REACT_RUNTIME_PAGES_DIR: target.runtimePagesDir || target.pagesDir,
  });
}

async function watchRouteTargets(targets, passthroughArgsClean) {
  const children = [];

  for (const target of targets) {
    const styleChild = watchRouteStyles(target);
    if (styleChild) {
      children.push(styleChild);
    }

    children.push(watchRouteClient(target, passthroughArgsClean));
  }

  if (children.length === 0) {
    return;
  }

  await new Promise((resolve, reject) => {
    for (const child of children) {
      child.on("error", reject);
      child.on("close", (code) => {
        if (code && code !== 0) {
          reject(new Error(`[webframez-react] watch child exited with code ${code}.`));
          return;
        }

        resolve();
      });
    }
  });
}

function getManifestChunkAssetsByName(distRootDir) {
  const chunksDir = path.join(distRootDir, "chunks");
  const assetsByName = new Map();
  if (!fileExists(chunksDir)) {
    return assetsByName;
  }

  for (const fileName of fs.readdirSync(chunksDir)) {
    const match = fileName.match(/^(.*)-[a-f0-9]+\.js$/i);
    if (match && match[1]) {
      assetsByName.set(match[1], path.join("chunks", fileName));
    }
  }

  return assetsByName;
}

function normalizeRouteManifestChunkFiles(distRootDir) {
  const manifestPath = path.join(distRootDir, "react-client-manifest.json");
  if (!fileExists(manifestPath)) {
    return;
  }

  const assetsByName = getManifestChunkAssetsByName(distRootDir);
  if (assetsByName.size === 0) {
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  let changed = false;
  for (const value of Object.values(manifest)) {
    if (!value || typeof value !== "object" || !Array.isArray(value.chunks)) {
      continue;
    }

    const nextChunks = value.chunks.map((chunk, index, chunks) => {
      if (index % 2 === 1 && typeof chunks[index - 1] === "string") {
        return assetsByName.get(chunks[index - 1]) || chunk;
      }

      return chunk;
    });

    if (nextChunks.some((chunk, index) => chunk !== value.chunks[index])) {
      value.chunks = nextChunks;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

function collectMissingManifestChunks(distRootDir) {
  const manifestPath = path.join(distRootDir, "react-client-manifest.json");
  if (!fileExists(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const missing = [];
  for (const value of Object.values(manifest)) {
    if (!value || typeof value !== "object" || !Array.isArray(value.chunks)) {
      continue;
    }

    for (let index = 1; index < value.chunks.length; index += 2) {
      const chunk = value.chunks[index];
      if (typeof chunk === "string" && chunk.includes(".") && !fileExists(path.join(distRootDir, chunk))) {
        missing.push(chunk);
      }
    }
  }

  return Array.from(new Set(missing));
}

async function validateRouteBuild(target) {
  const requiredFiles = [
    path.join(target.distRootDir, "client.js"),
    path.join(target.distRootDir, "react-client-manifest.json"),
    path.join(target.distRootDir, "react-ssr-manifest.json"),
  ];

  const missing = requiredFiles.filter((filePath) => !fileExists(filePath));
  if (missing.length > 0) {
    throw new Error(
      `Route ${target.path} build is incomplete. Missing: ${missing.join(", ")}`,
    );
  }

  const missingChunks = collectMissingManifestChunks(target.distRootDir);
  if (missingChunks.length > 0) {
    throw new Error(
      `Route ${target.path} client manifest references missing chunks: ${missingChunks.join(", ")}`,
    );
  }
}

async function main() {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (await reexecWithReactServerConditionIfNeeded()) {
    return;
  }

  const projectConfig = await loadProjectConfig();
  const customClientEntry = readCustomArg("--client-entry");
  const customServerEntry = readCustomArg("--server-entry");
  const passthroughArgsClean = stripCustomArgs(passthroughArgs);

  const clientEntryPath = resolveEntryPath(
    projectConfig,
    customClientEntry,
    "clientEntryPath",
    ["src/client.tsx"],
  );
  const serverEntryPath = resolveEntryPath(
    projectConfig,
    customServerEntry,
    "serverEntryPath",
    ["src/server.ts", "src/server.tsx"],
  );

  if (command === "build:server" || command === "watch:server") {
    const config = resolveConfig("tsconfig.server.json", "tsconfig.server.json");
    const generatedConfigPath = await createServerTsConfig(
      config,
      serverEntryPath,
      clientEntryPath,
    );
    console.log(`[webframez-react] tsc config (${config.source}): ${config.path}`);
    console.log(`[webframez-react] server entry: ${serverEntryPath}`);

    const args = ["-p", generatedConfigPath, ...passthroughArgsClean];
    if (command === "watch:server") {
      if (!hasFlag("--watch")) {
        args.push("--watch");
      }
      if (!hasFlag("--preserveWatchOutput")) {
        args.push("--preserveWatchOutput");
      }
    }

    const code = await run("tsc", args);
    process.exit(code);
    return;
  }

  if (command === "exec") {
    if (passthroughArgsClean.length === 0) {
      console.error("[webframez-react] Missing command for exec.");
      printHelp();
      process.exit(1);
    }

    const [binaryName, ...binaryArgs] = passthroughArgsClean;
    const code = await run(binaryName, binaryArgs, {
      NODE_OPTIONS: buildReactServerNodeOptions(),
    });
    process.exit(code);
    return;
  }

  if (command === "build:routes" || command === "watch:routes") {
    const routesPath = requireCustomArg("--routes", "--routes=<compiled routes file>");
    const outDir = path.resolve(projectRoot, readCustomArg("--out-dir") || "dist");
    const runtimeOutDir = path.resolve(projectRoot, readCustomArg("--runtime-out-dir") || outDir);
    await waitForFile(path.resolve(projectRoot, routesPath));
    const targets = await loadRouteBuildTargets(routesPath, outDir, runtimeOutDir);

    if (targets.length === 0) {
      throw new Error(`[webframez-react] No React routes were registered by ${routesPath}.`);
    }

    if (command === "watch:routes") {
      await watchRouteTargets(targets, passthroughArgsClean);
      return;
    }

    for (const target of targets) {
      const sassCode = await buildRouteStyles(target);
      if (sassCode !== 0) {
        process.exit(sassCode);
        return;
      }

      const webpackCode = await buildRouteClient(target, passthroughArgsClean);
      if (webpackCode !== 0) {
        process.exit(webpackCode);
        return;
      }

      normalizeRouteManifestChunkFiles(target.distRootDir);
      await validateRouteBuild(target);
    }

    return;
  }

  if (command === "build:client" || command === "watch:client") {
    const config = resolveConfig("webpack.client.cjs", "webpack.client.cjs");
    console.log(`[webframez-react] webpack config (${config.source}): ${config.path}`);
    console.log(`[webframez-react] client entry: ${clientEntryPath}`);

    const args = ["--config", config.path, ...passthroughArgsClean];
    if (command === "watch:client" && !hasFlag("--watch")) {
      args.push("--watch");
    }

    const code = await run("webpack", args, {
      WEBFRAMEZ_REACT_CLIENT_ENTRY: clientEntryPath,
    });
    process.exit(code);
    return;
  }

  if (command === "build:server:webpack" || command === "watch:server:webpack") {
    const config = resolveConfig("webpack.server.cjs", "webpack.server.cjs");
    console.log(`[webframez-react] webpack server config (${config.source}): ${config.path}`);
    console.log(`[webframez-react] server entry: ${serverEntryPath}`);

    const args = ["--config", config.path, ...passthroughArgsClean];
    if (command === "watch:server:webpack" && !hasFlag("--watch")) {
      args.push("--watch");
    }

    const code = await run("webpack", args, {
      WEBFRAMEZ_REACT_SERVER_ENTRY: serverEntryPath,
    });
    process.exit(code);
    return;
  }

  console.error(`[webframez-react] Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("[webframez-react] Build command failed.");
  if (error && typeof error === "object" && "message" in error) {
    console.error(String(error.message));
  } else {
    console.error(error);
  }
  process.exit(1);
});
