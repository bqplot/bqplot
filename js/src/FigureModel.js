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

define(["jupyter-js-widgets", "./BaseModel", "underscore"], function(widgets, BaseModel, _) {
    "use strict";

    var FigureModel = BaseModel.BaseModel.extend({

        defaults: _.extend({}, BaseModel.BaseModel.prototype.defaults, {
            _model_name: "FigureModel",
            _view_name: "Figure",
            _model_module: "bqplot",
            _view_module: "bqplot",

            title: "",
            axes: [],
            marks: [],
            interaction: null,
            scale_x: undefined,
            scale_y: undefined,
            fig_color: null,
            layout: undefined,
            min_aspect_ratio: 16 / 9,
            max_aspect_ratio: 16 / 9,

            fig_margin: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 60
            },

            padding_x: 0.0,
            padding_y: 0.025,
            legend_location: "top-right",
            animation_duration: 0,
        }),

        save_png: function() {
            // TODO: Any view of this Figure model will pick up this event
            // and render a png. Remove this eventually.
            this.trigger("save_png");
        }
    }, {
        serializers: _.extend({
            marks: { deserialize: widgets.unpack_models },
            axes:  { deserialize: widgets.unpack_models },
            interaction: { deserialize: widgets.unpack_models },
            scale_x: { deserialize: widgets.unpack_models },
            scale_y: { deserialize: widgets.unpack_models },
            layout:  { deserialize: widgets.unpack_models },
        }, BaseModel.BaseModel.serializers),
    });

    return {
        FigureModel: FigureModel,
    };
});
