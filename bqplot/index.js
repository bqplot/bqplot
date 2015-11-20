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

require('underscore');
[
    require("./nbextension/Axis.js"),
    require("./nbextension/GridHeatMapModel.js"),
    require("./nbextension/Mark.js"),
    require("./nbextension/AxisModel.js"),
    require("./nbextension/HandDraw.js"),
    require("./nbextension/MarkModel.js"),
    require("./nbextension/Bars.js"),
    require("./nbextension/HandDrawModel.js"),
    require("./nbextension/OHLC.js"),
    require("./nbextension/BarsModel.js"),
    require("./nbextension/Hist.js"),
    require("./nbextension/OHLCModel.js"),
    require("./nbextension/BaseModel.js"),
    require("./nbextension/HistModel.js"),
    require("./nbextension/OneDSelectorModel.js"),
    require("./nbextension/Boxplot.js"),
    require("./nbextension/IndexSelector.js"),
    require("./nbextension/OrdinalColorScale.js"),
    require("./nbextension/BoxplotModel.js"),
    require("./nbextension/Interaction.js"),
    require("./nbextension/OrdinalScale.js"),
    require("./nbextension/bqplot.less"),
    require("./nbextension/Label.js"),
    require("./nbextension/OrdinalScaleModel.js"),
    require("./nbextension/BrushSelector.js"),
    require("./nbextension/LassoSelector.js"),
    require("./nbextension/PanZoom.js"),
    require("./nbextension/ColorAxis.js"),
    require("./nbextension/lasso_test.js"),
    require("./nbextension/PanZoomModel.js"),
    require("./nbextension/colorbrewer.js"),
    require("./nbextension/LinearColorScale.js"),
    require("./nbextension/Pie.js"),
    require("./nbextension/ColorUtils.js"),
    require("./nbextension/LinearColorScaleModel.js"),
    require("./nbextension/PieModel.js"),
    require("./nbextension/DateColorScale.js"),
    require("./nbextension/LinearScale.js"),
    require("./nbextension/Scale.js"),
    require("./nbextension/DateColorScaleModel.js"),
    require("./nbextension/LinearScaleModel.js"),
    require("./nbextension/ScaleModel.js"),
    require("./nbextension/DateScale.js"),
    require("./nbextension/Lines.js"),
    require("./nbextension/Scatter.js"),
    require("./nbextension/DateScaleModel.js"),
    require("./nbextension/LinesModel.js"),
    require("./nbextension/ScatterModel.js"),
    require("./nbextension/FastIntervalSelector.js"),
    require("./nbextension/LogScale.js"),
    require("./nbextension/Selector.js"),
    require("./nbextension/Figure.js"),
    require("./nbextension/LogScaleModel.js"),
    require("./nbextension/SquareMarketMap.js"),
    require("./nbextension/FigureModel.js"),
    require("./nbextension/Map.js"),
    require("./nbextension/Tooltip.js"),
    require("./nbextension/FlexLine.js"),
    require("./nbextension/MapModel.js"),
    require("./nbextension/TwoDSelectorModel.js"),
    require("./nbextension/GeoScale.js"),
    require("./nbextension/Markers.js"),
    require("./nbextension/utils.js"),
    require("./nbextension/GeoScaleModel.js"),
    require("./nbextension/MarketMap.js"),
    require("./nbextension/GridHeatMap.js"),
    require("./nbextension/MarketMapModel.js"),

    require("./nbextension/components/d3/d3.js"),
    require("./nbextension/components/topojson/topojson.js")
].forEach(function(module) {
    Object.keys(module).forEach(function(name) {
        exports[name] = module[name];
    });
});
