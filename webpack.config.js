const path = require("path");

const config = {
  mode: "production",
  entry: "./src/extension.ts",
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    extensions: [".ts", ".js", ".json"]
  },
  node: {
    __filename: false,
    __dirname: false
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      }
    ]
  }
};

const nodeConfig = {
  ...config,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  }
};

const webConfig = {
  ...config,
  target: "webworker",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension-web.js",
    libraryTarget: "commonjs2",
  }
};


module.exports = [nodeConfig, webConfig];