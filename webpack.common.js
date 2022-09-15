const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    app: './src/index.js',
  },
  module: {
    rules: [
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
      { 
          test: /\.css$/, 
          use: [ "style-loader", "css-loader" ],
      }, 
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Swiss Tournament',
      template: 'src/index.html'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.EnvironmentPlugin({
      'API_BASE_URL': 'http://localhost:8000'
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
};