// src/build-plugin.ts
import fs from "node:fs";
import path from "node:path";
function fileExists(filePath) {
  return fs.existsSync(filePath);
}
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
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
  for (const chunk of collectManifestChunks(path.join(distRootDir, "react-client-manifest.json"))) {
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
