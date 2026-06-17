import fs from "node:fs";
import path from "node:path";

type WebframezBuildContext = {
  projectRoot: string;
  stagingDir: string;
  outDir: string;
  run: (binaryName: string, args: string[], envAdditions?: Record<string, string>) => Promise<number>;
};

function fileExists(filePath: string) {
  return fs.existsSync(filePath);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getEmittedChunkAssetsByName(distRootDir: string) {
  const chunksDir = path.join(distRootDir, "chunks");
  const assetsByName = new Map<string, string>();
  if (!fileExists(chunksDir)) {
    return assetsByName;
  }

  const fileNames = fs
    .readdirSync(chunksDir)
    .map((fileName) => ({
      fileName,
      mtimeMs: fs.statSync(path.join(chunksDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((entry) => entry.fileName);

  for (const fileName of fileNames) {
    const match = fileName.match(/^(.*)-[a-f0-9]+\.js$/i);
    if (match?.[1] && !assetsByName.has(match[1])) {
      assetsByName.set(match[1], path.join("chunks", fileName));
    }
  }

  return assetsByName;
}

function normalizeManifestChunkFiles(distRootDir: string, manifestPath: string) {
  const manifest = readJson(manifestPath);
  const assetsByName = getEmittedChunkAssetsByName(distRootDir);
  if (assetsByName.size === 0) {
    return;
  }

  let changed = false;
  for (const value of Object.values(manifest)) {
    const entry = value as { chunks?: unknown };
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

function collectManifestChunks(manifestPath: string) {
  const manifest = readJson(manifestPath);
  const chunks = new Set<string>();

  for (const value of Object.values(manifest)) {
    const entry = value as { chunks?: unknown };
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

function validateRouteDist(distRootDir: string) {
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

function findReactRouteDistRoots(stagingDir: string) {
  const reactRoot = path.join(stagingDir, "webframez-react");
  if (!fileExists(reactRoot)) {
    return [];
  }

  return fs
    .readdirSync(reactRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(reactRoot, entry.name));
}

export function createPlugin() {
  return {
    name: "webframez-react",

    async buildAssets(context: WebframezBuildContext) {
      const routesPath = path.join(context.stagingDir, "app", "routes.js");
      if (!fileExists(routesPath)) {
        return;
      }

      const code = await context.run("webframez-react", [
        "build:routes",
        `--routes=${routesPath}`,
        `--out-dir=${context.stagingDir}`,
        `--runtime-out-dir=${context.outDir}`,
      ]);

      if (code !== 0) {
        throw new Error(`webframez-react build failed with code ${code}`);
      }
    },

    validateBuild(context: WebframezBuildContext) {
      for (const distRootDir of findReactRouteDistRoots(context.stagingDir)) {
        validateRouteDist(distRootDir);
      }
    },
  };
}

export default createPlugin;
