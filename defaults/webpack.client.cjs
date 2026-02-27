const path = require("path");
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");

const projectRoot = process.cwd();
const frameworkDistDir = path.resolve(__dirname, "..", "dist");
const clientEntry = process.env.WEBFRAMEZ_REACT_CLIENT_ENTRY
  ? path.resolve(projectRoot, process.env.WEBFRAMEZ_REACT_CLIENT_ENTRY)
  : path.resolve(projectRoot, "src/client.tsx");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: {
    client: clientEntry,
  },
  output: {
    path: path.resolve(projectRoot, "dist"),
    filename: "[name].js",
    chunkFilename: "chunks/[name]-[contenthash].js",
    publicPath: "auto",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
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
  },
  plugins: [
    new ReactFlightWebpackPlugin({
      isServer: false,
      clientReferences: [
        {
          directory: path.resolve(projectRoot, "dist/pages"),
          recursive: true,
          include: /\.js$/,
        },
        {
          directory: path.resolve(projectRoot, "dist/src/components"),
          recursive: true,
          include: /\.js$/,
        },
        {
          directory: frameworkDistDir,
          recursive: false,
          include: /navigation\.(js|cjs)$/,
        },
      ],
    }),
  ],
};
