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

var widgets = require("@jupyter-widgets/base");
var d3 = require("d3");
var _ = require("underscore");
var basemodel = require("./BaseModel");
var semver_range = "^" + require("../package.json").version;

var FigureModel = basemodel.BaseModel.extend({

    defaults: function() {
        return _.extend(basemodel.BaseModel.prototype.defaults(), {
            _model_name: "FigureModel",
            _view_name: "Figure",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,

            title: "",
            axes: [],
            marks: [],
            interaction: null,
            scale_x: undefined,
            scale_y: undefined,
            fig_color: null,
            title_style: {},
            background_style: {},
            legend_style: {},
            legend_text: {},

            preserve_aspect: false,
            min_aspect_ratio: 0,
            max_aspect_ratio: 100,

            fig_margin: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 60
            },

            padding_x: 0.0,
            padding_y: 0.025,
            legend_location: "top-right",
            animation_duration: 0
        });
    },

    initialize: function() {
        FigureModel.__super__.initialize.apply(this, arguments);
        this.on("msg:custom", this.handle_custom_messages, this);
    },

    handle_custom_messages: function(msg) {
        if (msg.type === 'save_png') {
            this.trigger("save_png", msg.filename, msg.scale);
        }
        else if (msg.type === 'save_svg') {
            this.trigger("save_svg", msg.filename);
        }
    },

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
    }, basemodel.BaseModel.serializers)
});

module.exports = {
    FigureModel: FigureModel
};
