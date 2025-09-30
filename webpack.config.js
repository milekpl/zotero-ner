const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'zotero-ner-bundled.js',
    path: path.resolve(__dirname, 'content/scripts'),
    library: 'ZoteroNER',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  target: 'web',
  mode: 'production',
  resolve: {
    extensions: ['.js'],
    fallback: {
      'fs': false,
      'path': false,
      'os': false,
      'crypto': false,
      'stream': false,
      'buffer': false,
      'util': false,
      'assert': false,
      'process': false,
      'zlib': false,
      'http': false,
      'https': false,
      'url': false,
      'net': false,
      'tls': false,
      'child_process': false
    }
  },
  externals: {
    // Exclude Zotero and other external dependencies
    'zotero': 'Zotero',
    'services': 'Services',
    'components': 'Components',
    'chrome': 'ChromeUtils'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: { ie: '11' } }]],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
  },
};