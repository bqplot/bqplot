// Configure requirejs
if (window.require) {
    window.require.config({
        map: {
            "*" : {
                "bqplot": "nbextensions/bqplot/extension",
                "jupyter-js-widgets": "nbextensions/jupyter-js-widgets/extension"
            }
        }
    });
}

// Export the required load_ipython_extention
module.exports = {
    load_ipython_extension: function() {}
};

var bqplot = require("./index");

// Export all the content of bqplot-js
for (var name in bqplot) {
    if (bqplot.hasOwnProperty(name)) {
        module.exports[name] = bqplot[name];
    }
}
