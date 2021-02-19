module.exports = {
  "transform": {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.js$": "babel-jest",
    "^.+\\.glsl$": "jest-raw-loader"
  },
  "transformIgnorePatterns": [
    "node_modules/?!(@jupyter-widgets)",
  ],
  "setupFiles": [
    './tests/setupFile.js'
  ]
}
