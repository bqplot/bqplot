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

define(["jupyter-js-widgets", "./BaseModel", "underscore"],
       function(widgets, BaseModel, _) {
    "use strict";

    var MarketMapModel = BaseModel.BaseModel.extend({}, {

        defaults: _.extend({}, BaseModel.BaseModel.prototype.defaults, {
            _model_name: "MarketMapModel",
            _model_module: "nbextensions/bqplot/MarketMapModel",
            _view_name: "MarketMap",
            _view_module: "nbextensions/bqplot/MarketMap",

            map_width: 1080,
            map_height: 800,

            names: [],
            groups: [],
            display_text: [],
            ref_data: undefined,

            tooltip_fields: [],
            tooltip_formats: [],
            show_groups: false,

            cols: 0,
            rows: 0,

            row_groups: 1,
            colors: [], ///////////////// = List(CATEGORY10).tag(sync=True)
            scales: {},
            axes: [],
            color: [],
            map_margin: {
                top: 50,
                right: 50,
                left: 50,
                bottom: 50
            },
            preserve_aspect: false,
            stroke: "white",
            group_stroke: "black",
            selected_stroke: "dodgerblue",
            hovered_stroke: "orangered",

            selected: [],
            enable_hover: true,
            enable_select: true,
            tooltip_widget: null
        }),

        serializers: _.extend({
            scales: { deserialize: widgets.unpack_models },
            axes: { deserialize: widgets.unpack_models },
            tooltip_widget: { deserialize: widgets.unpack_models },
            style: { deserialize: widgets.unpack_models },
        }, BaseModel.BaseModel.serializers),
    });

    return {
        MarketMapModel: MarketMapModel,
    };
});
