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
    paths: {
        "require-less": "/nbextensions/bqplot/require-less",
        "d3": "/nbextensions/bqplot/d3/d3.min",
        "colorbrewer": "/nbextensions/bqplot/d3/lib/colorbrewer/colorbrewer",
    },
    map: {
        "*": {
            "less": "require-less/less",
        }
    },
    shim: {
        "d3": {
            "exports": "d3",
        },
        "colorbrewer": {
            "exports": "colorbrewer",
        },
    },
})

define([
    "less!./bqplot",
    "less!./worldmap",
    "./Figure",
    "./AxisModel",
    "./Axis",
    "./Scale",
    "./MarkModel",
    "./Mark",
    "./LinearScale",
    "./DateScale",
    "./OrdinalScale",
    "./LogScale",
    "./DateColorScale",
    "./LinearColorScale",
    "./OrdinalColorScale",
    "./ScaleModel",
    "./LinearScaleModel",
    "./DateScaleModel",
    "./OrdinalScaleModel",
    "./LinearColorScaleModel",
    "./DateColorScaleModel",
    "./LogScaleModel",
    "./LinesModel",
    "./Lines",
    "./ScatterModel",
    "./Scatter",
    "./BarsModel",
    "./Bars",
    "./HistModel",
    "./Hist",
    "./OHLCModel",
    "./OHLC",
    "./FlexLine",
    "./Label",
    "./ColorAxis",
    "./Interaction",
    "./Selector",
    "./FastIntervalSelector",
    "./IndexSelector",
    "./BrushSelector",
    "./HandDraw",
    "./PanZoom",
    "./MarketMap",
    "./SquareMarketMap",
    "./Map",
    "./Pie",
    "./PieModel",
], function () { console.log('loaded bqplot'); });
