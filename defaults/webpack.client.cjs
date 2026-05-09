const fs = require("fs");
const path = require("path");
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");
const { fileURLToPath, pathToFileURL } = require("url");

const projectRoot = process.cwd();
const frameworkDistDir = path.resolve(__dirname, "..", "dist");
const clientEntry = process.env.WEBFRAMEZ_REACT_CLIENT_ENTRY
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_CLIENT_ENTRY)
  : path.resolve(__dirname, "default-client.js");
const pagesDir = process.env.WEBFRAMEZ_REACT_PAGES_DIR
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_PAGES_DIR)
  : path.resolve(projectRoot, "dist/pages");
const distDir = process.env.WEBFRAMEZ_REACT_DIST_ROOT_DIR
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_DIST_ROOT_DIR)
  : path.resolve(projectRoot, "dist");
const runtimePagesDir = process.env.WEBFRAMEZ_REACT_RUNTIME_PAGES_DIR
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_RUNTIME_PAGES_DIR)
  : pagesDir;
const isWatchMode = process.argv.includes("--watch");
const mode =
  process.env.NODE_ENV === "production" || (typeof process.env.NODE_ENV === "undefined" && !isWatchMode)
    ? "production"
    : "development";
const frameworkCacheFiles = [
  path.join(frameworkDistDir, "client.js"),
  path.join(frameworkDistDir, "route-slot.js"),
  path.join(frameworkDistDir, "navigation.js"),
].filter((filePath) => fs.existsSync(filePath));
const frameworkCacheVersion = frameworkCacheFiles
  .map((filePath) => `${path.basename(filePath)}:${fs.statSync(filePath).mtimeMs}:${fs.statSync(filePath).size}`)
  .join("|");

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });

class ClientManifestExportAliasesPlugin {
  apply(compiler) {
    compiler.hooks.done.tap("ClientManifestExportAliasesPlugin", () => {
      const manifestPath = path.join(distDir, "react-client-manifest.json");
      if (!fs.existsSync(manifestPath)) {
        return;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      let changed = false;

      for (const [key, value] of Object.entries(manifest)) {
        if (!key.startsWith("file://")) {
          continue;
        }

        let absolutePath = null;
        try {
          absolutePath = fileURLToPath(key);
        } catch (error) {
          absolutePath = null;
        }

        if (!absolutePath || !fs.existsSync(absolutePath)) {
          continue;
        }

        const relativeToProject = path.relative(projectRoot, absolutePath).split(path.sep).join("/");
        const relativeAlias = relativeToProject.startsWith(".") ? relativeToProject : `./${relativeToProject}`;
        const aliases = [
          { key, force: false },
          { key: absolutePath, force: false },
          { key: relativeAlias, force: false },
          { key: relativeToProject, force: false },
        ];
        const relativeToPagesDir = path.relative(pagesDir, absolutePath);

        if (!relativeToPagesDir.startsWith("..") && !path.isAbsolute(relativeToPagesDir)) {
          const runtimeAbsolutePath = path.resolve(runtimePagesDir, relativeToPagesDir);
          const runtimeRelativeToProject = path.relative(projectRoot, runtimeAbsolutePath).split(path.sep).join("/");
          const runtimeRelativeAlias = runtimeRelativeToProject.startsWith(".")
            ? runtimeRelativeToProject
            : `./${runtimeRelativeToProject}`;
          aliases.push(
            { key: pathToFileURL(runtimeAbsolutePath).href, force: false },
            { key: runtimeAbsolutePath, force: false },
            { key: runtimeRelativeAlias, force: false },
            { key: runtimeRelativeToProject, force: false },
          );
        }

        const relativeToFrameworkDist = path.relative(frameworkDistDir, absolutePath);
        if (
          !relativeToFrameworkDist.startsWith("..") &&
          !path.isAbsolute(relativeToFrameworkDist) &&
          /\.(js)$/.test(relativeToFrameworkDist) &&
          /^(navigation|route-slot)\.js$/.test(relativeToFrameworkDist)
        ) {
          const cjsAbsolutePath = absolutePath.replace(/\.js$/, ".cjs");
          if (fs.existsSync(cjsAbsolutePath)) {
            const cjsRelativeToProject = path.relative(projectRoot, cjsAbsolutePath).split(path.sep).join("/");
            const cjsRelativeAlias = cjsRelativeToProject.startsWith(".")
              ? cjsRelativeToProject
              : `./${cjsRelativeToProject}`;
            aliases.push(
              { key: pathToFileURL(cjsAbsolutePath).href, force: true },
              { key: cjsAbsolutePath, force: true },
              { key: cjsRelativeAlias, force: true },
              { key: cjsRelativeToProject, force: true },
            );
          }
        }

        for (const alias of aliases) {
          if (alias.force || !(alias.key in manifest)) {
            manifest[alias.key] = value;
            changed = true;
          }
        }

        const source = fs.readFileSync(absolutePath, "utf-8");
        const exportNames = new Set();
        const exportPattern = /exports\.([A-Za-z0-9_$]+)\s*=/g;
        let match = null;
        while ((match = exportPattern.exec(source)) !== null) {
          if (match[1] && match[1] !== "__esModule") {
            exportNames.add(match[1]);
          }
        }

        for (const exportName of exportNames) {
          const exportValue =
            value && typeof value === "object"
              ? {
                  ...value,
                  name: exportName,
                }
              : value;
          for (const alias of aliases) {
            const aliasKey = `${alias.key}#${exportName}`;
            if (alias.force || !(aliasKey in manifest)) {
              manifest[aliasKey] = exportValue;
              changed = true;
            }
          }

          if (exportName === "default") {
            for (const alias of aliases) {
              const aliasKey = `${alias.key}#`;
              if (alias.force || !(aliasKey in manifest)) {
                manifest[aliasKey] = exportValue;
                changed = true;
              }
            }
          }
        }
      }

      if (changed) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
    });
  }
}

module.exports = {
  mode,
  cache: {
    type: "filesystem",
    version: frameworkCacheVersion,
    buildDependencies: {
      config: [__filename, ...frameworkCacheFiles],
    },
  },
  entry: {
    client: clientEntry,
  },
  output: {
    path: distDir,
    filename: "client.js",
    chunkFilename: "chunks/[name]-[contenthash].js",
    publicPath: "auto",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    modules: [path.resolve(projectRoot, "node_modules"), "node_modules"],
    alias: {
      react: path.resolve(projectRoot, "node_modules", "react"),
      "react-dom": path.resolve(projectRoot, "node_modules", "react-dom"),
      "react/jsx-runtime": path.resolve(projectRoot, "node_modules", "react", "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(projectRoot, "node_modules", "react", "jsx-dev-runtime.js"),
      scheduler: path.resolve(projectRoot, "node_modules", "scheduler"),
    },
  },
  watchOptions: {
    aggregateTimeout: 150,
    poll: Number(process.env.WEBFRAMEZ_REACT_WATCH_POLL || 1000),
    ignored: [
      path.resolve(projectRoot, "node_modules", "**"),
      path.resolve(distDir, "**"),
      path.resolve(projectRoot, "build", "node_modules", "**"),
    ],
  },
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    moduleIds: "named",
    chunkIds: "named",
  },
  plugins: [
    new ReactFlightWebpackPlugin({
      isServer: false,
      clientReferences: [
        {
          directory: pagesDir,
          recursive: true,
          include: /\.js$/,
        },
        {
          directory: frameworkDistDir,
          recursive: false,
          include: /(navigation|route-slot)\.js$/,
        },
      ],
    }),
    new ClientManifestExportAliasesPlugin(),
  ],
};
