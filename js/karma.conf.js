var webpackConfig = require('./webpack.config.js');
// add the .ts loader
webpackConfig[1].module.rules.push({ test: /\.ts?$/, loader: 'ts-loader'})
// remove the json loader (gives issues)
webpackConfig[1].module.rules.splice(2, 1)

var webpack = require('webpack');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
        {pattern: 'test/index.ts'},
    ],
    exclude: ['**/embed.js'],
    preprocessors: {
        'test/**/*.ts': ['webpack', 'sourcemap']
    },
    webpack: {
      module: webpackConfig[1].module,
      devtool: 'source-map',
      mode: 'development',
      resolve: {
            extensions: ['.ts', '.js']
      },
      plugins: [
          // see https://github.com/webpack-contrib/karma-webpack/issues/109#issuecomment-224961264
          new webpack.SourceMapDevToolPlugin({
            filename: null, // if no value is provided the sourcemap is inlined
            test: /\.(ts|js)($|\?)/i // process .js and .ts files only
          })
        ],
    },
    mime: {
      'text/x-typescript':  ['ts']
    },
    mochaReporter: {
       showDiff: true
    },
    reporters: ['progress', 'mocha'],
    port: 9876,
    colors: true,
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    autoWatch: true,
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['HeadlessChrome'],
    customLaunchers: {
      HeadlessChrome: {
        base: 'Chrome',
        flags: ['--headless', '--disable-gpu', '--remote-debugging-port=9222']
      }
    },
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}