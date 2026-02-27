const path = require("path");

const projectRoot = process.cwd();

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  target: "node",
  entry: path.resolve(projectRoot, "src/server.ts"),
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
