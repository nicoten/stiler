const rules = require('./webpack.rules');
const path = require('path');

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.js',
  // Put your normal webpack config below here
  module: {
    rules: [
      ...rules,
      // {
      //   resolve: {
      //     extensions: ['.ts', '.js'],
      //   },
      // },
      // {
      //   resolve: {
      //     modules: [path.resolve(__dirname, './src'), 'node_modules'],
      //     fallback: {
      //       stream: require.resolve('stream-browserify'),
      //     },
      //   },
      // },
    ],
  },
};
