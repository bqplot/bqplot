/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


requirejs.config({
    map: {
        '*' : {
            "bqplot": "nbextensions/bqplot/index",
            "jupyter-js-widgets": "nbextensions/widgets/extension",
            "less": "nbextensions/bqplot/components/require-less/less"
        }
    }
});

define([
    "underscore",
    "less!./bqplot.less",
    "./Axis",
    "./GridHeatMapModel",
    "./Mark",
    "./AxisModel",
    "./HandDraw",
    "./MarkModel",
    "./Bars",
    "./HandDrawModel",
    "./OHLC",
    "./BarsModel",
    "./Hist",
    "./OHLCModel",
    "./BaseModel",
    "./HistModel",
    "./SelectorModel",
    "./Boxplot",
    "./IndexSelector",
    "./OrdinalColorScale",
    "./BoxplotModel",
    "./Interaction",
    "./OrdinalScale",
    "./Label",
    "./OrdinalScaleModel",
    "./BrushSelector",
    "./LassoSelector",
    "./PanZoom",
    "./ColorAxis",
    "./lasso_test",
    "./PanZoomModel",
    "./colorbrewer",
    "./ColorScale",
    "./Pie",
    "./ColorUtils",
    "./ColorScaleModel",
    "./PieModel",
    "./DateColorScale",
    "./LinearScale",
    "./Scale",
    "./DateColorScaleModel",
    "./LinearScaleModel",
    "./ScaleModel",
    "./DateScale",
    "./Lines",
    "./Scatter",
    "./DateScaleModel",
    "./LinesModel",
    "./ScatterModel",
    "./FastIntervalSelector",
    "./LogScale",
    "./Selector",
    "./Figure",
    "./LogScaleModel",
    "./SquareMarketMap",
    "./FigureModel",
    "./Map",
    "./Tooltip",
    "./FlexLine",
    "./MapModel",
    "./GeoScale",
    "./Markers",
    "./utils",
    "./GeoScaleModel",
    "./MarketMap",
    "./GridHeatMap",
    "./MarketMapModel",
    "./Toolbar",
    "./components/d3/d3",
    "./components/topojson/topojson"
], function() {
    var exports = Array.prototype.slice.call(arguments, 2).reduce(function(obj, e) {
        return _.extend(obj, e);
    });

    exports['load_ipython_extension'] = function() {};

    return exports;
});
