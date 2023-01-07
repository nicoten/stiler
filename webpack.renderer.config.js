const path = require('path');
const rules = require('./webpack.rules');

module.exports = {
  module: {
    rules: [
      ...rules,
      {
        resolve: {
          modules: [path.resolve(__dirname, './src'), 'node_modules'],
          fallback: {
            stream: require.resolve('stream-browserify'),
          },
        },
      },
      {
        test: /\.js?$/,
        use: {
          loader: 'babel-loader',
          options: {
            exclude: /node_modules/,
            presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]],
          },
        },
      },
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
};
