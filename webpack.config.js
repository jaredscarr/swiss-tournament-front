const path = require('path'); 

module.exports = { 
  mode: "development", 
  entry: "./src/index.js", 
  output: { 
    path: __dirname + 'dist', 
    filename: "main.js",
    clean: true
  }, 
devtool: 'eval-cheap-module-source-map', 
devServer: { 
  static: {
    directory: path.resolve(__dirname, "dist"),
    staticOptions: {},
    // Don't be confused with `devMiddleware.publicPath`, it is `publicPath` for static directory
    // Can be:
    // publicPath: ['/static-public-path-one/', '/static-public-path-two/'],
    publicPath: "/",
    // Can be:
    // serveIndex: {} (options for the `serveIndex` option you can find https://github.com/expressjs/serve-index)
    serveIndex: true,
    // Can be:
    // watch: {} (options for the `watch` option you can find https://github.com/paulmillr/chokidar)
    watch: true,
  },
  historyApiFallback: true,
}, 
module: { 
  rules: [ { 
    test: /\.css$/, 
    use: [ "style-loader", "css-loader" ] 
  }, 
  { 
    test: /\.js$/, 
    exclude: /node_modules/, 
    use: { 
      loader: "babel-loader", 
      options: { 
        presets: [ "@babel/preset-env", ] 
      } 
    } 
  }, 
] }};