// Karma configuration
// Generated on Wed Jun 20 2018 16:46:14 GMT+0200 (CEST)
var webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'sinon', 'karma-typescript'],
    files: [
        {pattern: 'test/**/*.ts'},
    ],
    exclude: ['**/embed.js'],
    preprocessors: {
        'test/**/*.ts': "karma-typescript"
    },
    mime: {
      'text/x-typescript':  ['ts']
    },
    preprocessors: {
            "**/*.ts": "karma-typescript"
    },
    karmaTypescriptConfig: {
        compilerOptions: {
        // "noImplicitAny": true,
        "lib": ["dom", "es5", "es2015.promise", "es2015.iterable"],
        "noEmitOnError": true,
        // "strictNullChecks": true,
        "module": "commonjs",
        "moduleResolution": "node",
        "target": "ES5",
        "outDir": "lib",
        "skipLibCheck": true,
        "sourceMap": true,
        "allowJs": true
      }
  },
    reporters: ['progress', 'karma-typescript'],
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
    // singleRun: true,
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}