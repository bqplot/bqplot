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

module.exports = {};

var loadedModules = [
    require("./Axis"),
    require("./GridHeatMapModel"),
    require("./Mark"),
    require("./AxisModel"),
    require("./HandDraw"),
    require("./MarkModel"),
    require("./Bars"),
    require("./HandDrawModel"),
    require("./OHLC"),
    require("./BarsModel"),
    require("./Hist"),
    require("./OHLCModel"),
    require("./BaseModel"),
    require("./HistModel"),
    require("./SelectorModel"),
    require("./Boxplot"),
    require("./IndexSelector"),
    require("./OrdinalColorScale"),
    require("./BoxplotModel"),
    require("./Interaction"),
    require("./OrdinalScale"),
    require("./Label"),
    require("./LabelModel"),
    require("./OrdinalScaleModel"),
    require("./OrdinalColorScaleModel"),
    require("./BrushSelector"),
    require("./LassoSelector"),
    require("./PanZoom"),
    require("./ColorAxis"),
    require("./lasso_test"),
    require("./PanZoomModel"),
    require("./colorbrewer"),
    require("./ColorScale"),
    require("./Pie"),
    require("./ColorUtils"),
    require("./ColorScaleModel"),
    require("./PieModel"),
    require("./DateColorScale"),
    require("./LinearScale"),
    require("./Scale"),
    require("./DateColorScaleModel"),
    require("./LinearScaleModel"),
    require("./ScaleModel"),
    require("./DateScale"),
    require("./Lines"),
    require("./Scatter"),
    require("./DateScaleModel"),
    require("./LinesModel"),
    require("./ScatterModel"),
    require("./FastIntervalSelector"),
    require("./LogScale"),
    require("./Selector"),
    require("./Figure"),
    require("./LogScaleModel"),
    require("./SquareMarketMap"),
    require("./FigureModel"),
    require("./Map"),
    require("./Tooltip"),
    require("./TooltipModel"),
    require("./FlexLine"),
    require("./MapModel"),
    require("./GeoScale"),
    require("./Markers"),
    require("./utils"),
    require("./GeoScaleModel"),
    require("./MarketMap"),
    require("./GridHeatMap"),
    require("./MarketMapModel"),
    require("./HeatMap"),
    require("./HeatMapModel"),
    require("./Toolbar"),
    require("./GraphModel"),
    require("./Graph"),
    require("./Image"),
    require("./ImageModel")
];

for (var i in loadedModules) {
    if (loadedModules.hasOwnProperty(i)) {
        var loadedModule = loadedModules[i];
        for (var target_name in loadedModule) {
            if (loadedModule.hasOwnProperty(target_name)) {
                module.exports[target_name] = loadedModule[target_name];
            }
        }
    }
}

module.exports["version"] = require("../package.json").version;
