import { build, context } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const isWatch = process.argv.includes("--watch");
const isProductionBuild = !isWatch;

const sharedNode = {
  entryPoints: ["src/index.ts", "src/router.ts", "src/types.ts", "src/http.ts", "src/webframez-core.ts", "src/navigation.tsx"],
  bundle: true,
  splitting: false,
  sourcemap: isWatch,
  platform: "node",
  target: "node20",
  jsx: "automatic",
  legalComments: "none",
  external: ["react", "react-dom", "react-dom/server", "react-server-dom-webpack", "node:*", "@webtypen/webframez-core"],
};

const sharedClient = {
  entryPoints: ["src/client.tsx"],
  bundle: true,
  splitting: false,
  sourcemap: isWatch,
  minify: isProductionBuild,
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  legalComments: "none",
  external: ["react", "react-dom", "react-server-dom-webpack/client"],
};

async function copyTypes() {
  await mkdir("dist", { recursive: true });
  await copyFile("src/index.d.ts", "dist/index.d.ts");
  await copyFile("src/router.d.ts", "dist/router.d.ts");
  await copyFile("src/types.d.ts", "dist/types.d.ts");
  await copyFile("src/client.d.ts", "dist/client.d.ts");
  await copyFile("src/navigation.d.ts", "dist/navigation.d.ts");
  await copyFile("src/http.d.ts", "dist/http.d.ts");
  await copyFile("src/webframez-core.d.ts", "dist/webframez-core.d.ts");
}

const builds = [
  {
    ...sharedNode,
    format: "esm",
    outdir: "dist",
  },
  {
    ...sharedNode,
    format: "cjs",
    outdir: "dist",
    outExtension: {
      ".js": ".cjs",
    },
  },
  {
    ...sharedClient,
    format: "esm",
    outfile: "dist/client.js",
  },
  {
    ...sharedClient,
    format: "cjs",
    outfile: "dist/client.cjs",
  },
];

if (!isWatch) {
  for (const options of builds) {
    await build(options);
  }
  await copyTypes();
  process.exit(0);
}

const contexts = [];
for (const options of builds) {
  const ctx = await context(options);
  contexts.push(ctx);
  await ctx.watch();
}

await copyTypes();
console.log("[webframez-react] build watch mode started");

process.on("SIGINT", async () => {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  process.exit(0);
});

await new Promise(() => {});
