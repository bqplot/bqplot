// Configure requirejs
if (window.require) {
    window.require.config({
        map: {
            "*" : {
                "bqplot": "nbextensions/bqplot/index",
                "jupyter-js-widgets": "nbextensions/jupyter-js-widgets/extension"
            }
        }
    });
}

// Export the required load_ipython_extention
module.exports = {
    load_ipython_extension: function() {}
};

// Export all the content of bqplot-js
for (var name in require("./index")) {
    if (widgets.hasOwnProperty(name)) {
        module.exports[name] = widgets[name];
    }
}
