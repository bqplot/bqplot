// TODO: Remove this ugliest hack of all hacks once ipywidgets moves to commonjs
// Hack: Trick browserify (and other static analysis based compilers) that these
// files will be imported.  Related, browserify doesn't support dynamically
// required files: https://github.com/substack/node-browserify/issues/377
function requireLocalFiles() {
    require('underscore');
    require('backbone');
    require('jquery');
    require('../../../ipywidgets/ipywidgets/static/widgets/js/utils');
    require('../../../ipywidgets/ipywidgets/static/widgets/js/widget');
    require('../../../ipywidgets/ipywidgets/static/widgets/js/widget_int');
    require('../../../ipywidgets/ipywidgets/static/widgets/js/manager-base');
    require('../../../bqplot/bqplot/nbextension/components/d3/d3');
    require('../../../bqplot/bqplot/nbextension/components/topojson/topojson');

    require("./Axis");
    require("./GridHeatMapModel");
    require("./Mark");
    require("./AxisModel");
    require("./HandDraw");
    require("./MarkModel");
    require("./Bars");
    require("./HandDrawModel");
    require("./OHLC");
    require("./BarsModel");
    require("./Hist");
    require("./OHLCModel");
    require("./BaseModel");
    require("./HistModel");
    require("./OneDSelectorModel");
    require("./Boxplot");
    require("./IndexSelector");
    require("./OrdinalColorScale");
    require("./BoxplotModel");
    require("./Interaction");
    require("./OrdinalScale");
    require("./bqplot.less");
    require("./Label");
    require("./OrdinalScaleModel");
    require("./BrushSelector");
    require("./LassoSelector");
    require("./PanZoom");
    require("./ColorAxis");
    require("./lasso_test");
    require("./PanZoomModel");
    require("./colorbrewer");
    require("./LinearColorScale");
    require("./Pie");
    require("./ColorUtils");
    require("./LinearColorScaleModel");
    require("./PieModel");
    require("./DateColorScale");
    require("./LinearScale");
    require("./Scale");
    require("./DateColorScaleModel");
    require("./LinearScaleModel");
    require("./ScaleModel");
    require("./DateScale");
    require("./Lines");
    require("./Scatter");
    require("./DateScaleModel");
    require("./LinesModel");
    require("./ScatterModel");
    require("./FastIntervalSelector");
    require("./LogScale");
    require("./Selector");
    require("./Figure");
    require("./LogScaleModel");
    require("./SquareMarketMap");
    require("./FigureModel");
    require("./Map");
    require("./Tooltip");
    require("./FlexLine");
    require("./MapModel");
    require("./TwoDSelectorModel");
    require("./GeoScale");
    require("./Markers");
    require("./utils");
    require("./GeoScaleModel");
    require("./MarketMap");
    require("./GridHeatMap");
    require("./MarketMapModel");
}

module.exports = function createDefine(targetModule) {
    var amdefine = require('amdefine')(targetModule, require);
    
    return function define() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 1) {
            args[0] = args[0].map(function(arg) {
                if (arg === 'jqueryui') {
                    arg = 'jquery';
                }
                arg = arg.replace('nbextensions/', '');
                arg = arg.replace('widgets/widgets/js/', '../../../ipywidgets/ipywidgets/static/widgets/js/');
                arg = arg.replace('./components/require-less/less!', '');
                arg = arg.replace('./components/', '../../../bqplot/bqplot/nbextension/components/');
                return arg;
            });
        }
        amdefine.apply(this, args);
    };
};
