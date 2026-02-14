const path = require("path");

module.exports = {
  mode: "development",
  target: "node",
  entry: path.resolve(__dirname, "src/server.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
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
