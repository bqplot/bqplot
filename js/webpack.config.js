module.exports = {
    entry: './src/extension.js',
    output: {
        filename: 'extension.js',
        path: '../bqplot/static',
        libraryTarget: 'amd'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            { test: /\.css$/, loader: "style-loader!css-loader" },
            { test: /\.less$/, loader: "style-loader!css-loader!less-loader" },
            { test: /\.json$/, loader: "json-loader" },
            // jquery-ui loads some images
            { test: /\.(jpg|png|gif)$/, loader: "file" },
            // required to load font-awesome
            { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
            { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
            { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
            { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
            { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" }
        ]
    },
    externals: ['jupyter-js-widgets']
};
