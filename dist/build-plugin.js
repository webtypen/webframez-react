// src/build-plugin.ts
import fs from "node:fs";
import path from "node:path";
function fileExists(filePath) {
  return fs.existsSync(filePath);
}
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function getEmittedChunkAssetsByName(distRootDir) {
  const chunksDir = path.join(distRootDir, "chunks");
  const assetsByName = /* @__PURE__ */ new Map();
  if (!fileExists(chunksDir)) {
    return assetsByName;
  }
  for (const fileName of fs.readdirSync(chunksDir)) {
    const match = fileName.match(/^(.*)-[a-f0-9]+\.js$/i);
    if (match?.[1]) {
      assetsByName.set(match[1], path.join("chunks", fileName));
    }
  }
  return assetsByName;
}
function normalizeManifestChunkFiles(distRootDir, manifestPath) {
  const manifest = readJson(manifestPath);
  const assetsByName = getEmittedChunkAssetsByName(distRootDir);
  if (assetsByName.size === 0) {
    return;
  }
  let changed = false;
  for (const value of Object.values(manifest)) {
    const entry = value;
    if (!entry || !Array.isArray(entry.chunks)) {
      continue;
    }
    const nextChunks = entry.chunks.map((chunk, index, chunks) => {
      if (index % 2 === 1 && typeof chunks[index - 1] === "string") {
        return assetsByName.get(chunks[index - 1]) || chunk;
      }
      return chunk;
    });
    if (nextChunks.some((chunk, index) => chunk !== entry.chunks?.[index])) {
      entry.chunks = nextChunks;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
function collectManifestChunks(manifestPath) {
  const manifest = readJson(manifestPath);
  const chunks = /* @__PURE__ */ new Set();
  for (const value of Object.values(manifest)) {
    const entry = value;
    if (!entry || !Array.isArray(entry.chunks)) {
      continue;
    }
    for (const chunk of entry.chunks) {
      if (typeof chunk === "string" && chunk.includes(".")) {
        chunks.add(chunk);
      }
    }
  }
  return chunks;
}
function validateRouteDist(distRootDir) {
  const requiredFiles = ["client.js", "react-client-manifest.json", "react-ssr-manifest.json"];
  for (const requiredFile of requiredFiles) {
    const filePath = path.join(distRootDir, requiredFile);
    if (!fileExists(filePath)) {
      throw new Error(`webframez-react build output missing: ${filePath}`);
    }
  }
  const clientManifestPath = path.join(distRootDir, "react-client-manifest.json");
  normalizeManifestChunkFiles(distRootDir, clientManifestPath);
  for (const chunk of collectManifestChunks(clientManifestPath)) {
    const chunkPath = path.join(distRootDir, chunk);
    if (!fileExists(chunkPath)) {
      throw new Error(`webframez-react manifest references missing chunk: ${chunkPath}`);
    }
  }
}
function findReactRouteDistRoots(stagingDir) {
  const reactRoot = path.join(stagingDir, "webframez-react");
  if (!fileExists(reactRoot)) {
    return [];
  }
  return fs.readdirSync(reactRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(reactRoot, entry.name));
}
function createPlugin() {
  return {
    name: "webframez-react",
    async buildAssets(context) {
      const routesPath = path.join(context.stagingDir, "app", "routes.js");
      if (!fileExists(routesPath)) {
        return;
      }
      const code = await context.run("webframez-react", [
        "build:routes",
        `--routes=${routesPath}`,
        `--out-dir=${context.stagingDir}`,
        `--runtime-out-dir=${context.outDir}`
      ]);
      if (code !== 0) {
        throw new Error(`webframez-react build failed with code ${code}`);
      }
    },
    validateBuild(context) {
      for (const distRootDir of findReactRouteDistRoots(context.stagingDir)) {
        validateRouteDist(distRootDir);
      }
    }
  };
}
var build_plugin_default = createPlugin;
export {
  createPlugin,
  build_plugin_default as default
};
