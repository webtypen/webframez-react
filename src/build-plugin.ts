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

  for (const chunk of collectManifestChunks(path.join(distRootDir, "react-client-manifest.json"))) {
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
