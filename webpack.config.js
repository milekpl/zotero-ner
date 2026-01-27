const path = require('path');
const webpack = require('webpack');

// Console polyfill for Zotero 8 compatibility
const consolePolyfill = `
if (typeof console === 'undefined') {
  globalThis.console = {
    log: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer: ' + Array.prototype.join.call(arguments, ' ')); },
    warn: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer WARN: ' + Array.prototype.join.call(arguments, ' ')); },
    error: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer ERROR: ' + Array.prototype.join.call(arguments, ' ')); },
    info: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer INFO: ' + Array.prototype.join.call(arguments, ' ')); },
    debug: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer DEBUG: ' + Array.prototype.join.call(arguments, ' ')); }
  };
}
`;

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'zotero-name-normalizer-bundled.js',
    path: path.resolve(__dirname, 'content/scripts'),
    library: 'ZoteroNameNormalizer',
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
  plugins: [
    new webpack.BannerPlugin({
      banner: consolePolyfill,
      raw: true,
    }),
  ],
};
