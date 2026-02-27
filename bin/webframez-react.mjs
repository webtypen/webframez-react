#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const binFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(binFilePath), "..");
const projectRoot = process.cwd();

const command = process.argv[2];
const passthroughStart = process.argv[3] === "--" ? 4 : 3;
const passthroughArgs = process.argv.slice(passthroughStart);

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
    ].join("\n"),
  );
}

function hasFlag(flag) {
  return passthroughArgs.includes(flag);
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

function run(binaryName, args) {
  const binary = resolveBinary(binaryName);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
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

  if (command === "build:server" || command === "watch:server") {
    const config = resolveConfig("tsconfig.server.json", "tsconfig.server.json");
    console.log(`[webframez-react] tsc config (${config.source}): ${config.path}`);

    const args = ["-p", config.path, ...passthroughArgs];
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

    const args = ["--config", config.path, ...passthroughArgs];
    if (command === "watch:client" && !hasFlag("--watch")) {
      args.push("--watch");
    }

    const code = await run("webpack", args);
    process.exit(code);
    return;
  }

  if (command === "build:server:webpack" || command === "watch:server:webpack") {
    const config = resolveConfig("webpack.server.cjs", "webpack.server.cjs");
    console.log(`[webframez-react] webpack server config (${config.source}): ${config.path}`);

    const args = ["--config", config.path, ...passthroughArgs];
    if (command === "watch:server:webpack" && !hasFlag("--watch")) {
      args.push("--watch");
    }

    const code = await run("webpack", args);
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
