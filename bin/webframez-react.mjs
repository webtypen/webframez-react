#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const binFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(binFilePath), "..");
const projectRoot = process.cwd();

const command = process.argv[2];
const passthroughStart = process.argv[3] === "--" ? 4 : 3;
const passthroughArgs = process.argv.slice(passthroughStart);
const customArgPrefixes = ["--client-entry", "--server-entry"];

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
      "  webframez-react build:server:webpack",
      "  webframez-react watch:server:webpack",
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

async function main() {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
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
