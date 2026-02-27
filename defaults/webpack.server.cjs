const path = require("path");
const fs = require("fs");

const projectRoot = process.cwd();
const defaultServerEntry = fs.existsSync(path.resolve(projectRoot, "src/server.ts"))
  ? path.resolve(projectRoot, "src/server.ts")
  : path.resolve(projectRoot, "src/server.tsx");
const serverEntry = process.env.WEBFRAMEZ_REACT_SERVER_ENTRY
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_SERVER_ENTRY)
  : defaultServerEntry;

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  target: "node",
  entry: serverEntry,
  output: {
    path: path.resolve(projectRoot, "dist"),
    filename: "server.cjs",
    libraryTarget: "commonjs2",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    conditionNames: ["react-server", "node", "import", "require", "default"],
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
  externalsPresets: { node: true },
};
