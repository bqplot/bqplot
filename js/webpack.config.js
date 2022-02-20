const path = require('path');

const crypto = require('crypto');

// Workaround for loaders using "md4" by default, which is not supported in FIPS-compliant OpenSSL
const cryptoOrigCreateHash = crypto.createHash;
crypto.createHash = (algorithm) =>
  cryptoOrigCreateHash(algorithm == 'md4' ? 'sha256' : algorithm);

const rules = [
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
  {
    test: /\.less$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'less-loader' },
    ],
  },
  { test: /\.(jpg|png|gif)$/, use: 'file' },
  // required to load font-awesome
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url?limit=10000&mimetype=application/font-woff',
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url?limit=10000&mimetype=application/font-woff',
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url?limit=10000&mimetype=application/octet-stream',
  },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file' },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url?limit=10000&mimetype=image/svg+xml',
  },
];

module.exports = [
  {
    // Notebook extension
    entry: './lib/extension.js',
    output: {
      filename: 'extension.js',
      path: path.resolve(__dirname, '../share/jupyter/nbextensions/bqplot'),
      libraryTarget: 'amd',
      devtoolModuleFilenameTemplate:
        'webpack://jupyter-widgets/bqplot/[resource-path]?[loaders]',
    },
    externals: ['@jupyter-widgets/base'],
    mode: 'production',
  },
  {
    // bqplot bundle for the classic notebook
    entry: './lib/index-classic.js',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, '../share/jupyter/nbextensions/bqplot'),
      libraryTarget: 'amd',
      devtoolModuleFilenameTemplate:
        'webpack://jupyter-widgets/bqplot/[resource-path]?[loaders]',
      publicPath: '',
    },
    devtool: 'source-map',
    module: {
      rules: rules,
    },
    externals: ['@jupyter-widgets/base'],
    mode: 'production',
  },
  {
    // bqplot bundle for unpkg.
    entry: './lib/index-embed.js',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, './dist/'),
      libraryTarget: 'amd',
      devtoolModuleFilenameTemplate:
        'webpack://jupyter-widgets/bqplot/[resource-path]?[loaders]',
    },
    devtool: 'source-map',
    module: {
      rules: rules,
    },
    externals: ['@jupyter-widgets/base'],
    mode: 'production',
  },
];
