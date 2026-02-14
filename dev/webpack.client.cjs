const path = require("path");
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");

module.exports = {
  mode: "development",
  entry: {
    client: path.resolve(__dirname, "src/client.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    chunkFilename: "chunks/[name]-[contenthash].js",
    publicPath: "/react/assets/",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-dom/client": path.resolve(__dirname, "node_modules/react-dom/client.js"),
      "react-server-dom-webpack/client": path.resolve(
        __dirname,
        "node_modules/react-server-dom-webpack/client.browser.js"
      ),
    },
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
          directory: "./dist/pages",
          recursive: true,
          include: /\.js$/,
        },
        {
          directory: "./dist/src/components",
          recursive: true,
          include: /\.js$/,
        },
        {
          directory: "../dist",
          recursive: false,
          include: /navigation\.(js|cjs)$/,
        },
      ],
    }),
  ],
};
