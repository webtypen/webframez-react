var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/build-plugin.ts
var build_plugin_exports = {};
__export(build_plugin_exports, {
  createPlugin: () => createPlugin,
  default: () => build_plugin_default
});
module.exports = __toCommonJS(build_plugin_exports);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
function fileExists(filePath) {
  return import_node_fs.default.existsSync(filePath);
}
function readJson(filePath) {
  return JSON.parse(import_node_fs.default.readFileSync(filePath, "utf-8"));
}
function getEmittedChunkAssetsByName(distRootDir) {
  const chunksDir = import_node_path.default.join(distRootDir, "chunks");
  const assetsByName = /* @__PURE__ */ new Map();
  if (!fileExists(chunksDir)) {
    return assetsByName;
  }
  for (const fileName of import_node_fs.default.readdirSync(chunksDir)) {
    const match = fileName.match(/^(.*)-[a-f0-9]+\.js$/i);
    if (match?.[1]) {
      assetsByName.set(match[1], import_node_path.default.join("chunks", fileName));
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
    import_node_fs.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
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
    const filePath = import_node_path.default.join(distRootDir, requiredFile);
    if (!fileExists(filePath)) {
      throw new Error(`webframez-react build output missing: ${filePath}`);
    }
  }
  const clientManifestPath = import_node_path.default.join(distRootDir, "react-client-manifest.json");
  normalizeManifestChunkFiles(distRootDir, clientManifestPath);
  for (const chunk of collectManifestChunks(clientManifestPath)) {
    const chunkPath = import_node_path.default.join(distRootDir, chunk);
    if (!fileExists(chunkPath)) {
      throw new Error(`webframez-react manifest references missing chunk: ${chunkPath}`);
    }
  }
}
function findReactRouteDistRoots(stagingDir) {
  const reactRoot = import_node_path.default.join(stagingDir, "webframez-react");
  if (!fileExists(reactRoot)) {
    return [];
  }
  return import_node_fs.default.readdirSync(reactRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => import_node_path.default.join(reactRoot, entry.name));
}
function createPlugin() {
  return {
    name: "webframez-react",
    async buildAssets(context) {
      const routesPath = import_node_path.default.join(context.stagingDir, "app", "routes.js");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPlugin
});
