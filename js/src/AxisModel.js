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

var AxisModel = basemodel.BaseModel.extend({

    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name: "AxisModel",
            _view_name: "Axis",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,

            orientation: "horizontal",
            side: null,
            label: "",
            grid_lines: "solid",
            tick_format: null,
            scale: undefined,
            num_ticks: null,
            tick_values: [],
            offset: {},
            label_location: "middle",
            label_color: null,
            grid_color: null,
            color: null,
            label_offset: null,
            visible: true,
            tick_style: {}
        });
    },

    initialize: function() {
        AxisModel.__super__.initialize.apply(this, arguments);
        this.on("change:side", this.validate_orientation, this);
        this.on("change:orientation", this.validate_side, this);
        this.validate_orientation();
        this.validate_side();
    },

    validate_side: function() {
        var orientation = this.get("orientation"),
            side = this.get("side");
        if(orientation === "vertical") {
            if (side !== "left" && side !== "right") {
                this.set("side", "left");
            }
        } else {
            if (side !== "bottom" && side !== "top") {
                this.set("side", "bottom");
            }
        }
        this.save_changes();
    },

    validate_orientation: function() {
        var orientation = this.get("orientation"),
            side = this.get("side");
        if (side) {
            if(side === "left" || side === "right") {
                this.set("orientation", "vertical");
            } else {
                this.set("orientation", "horizontal");
            }
            this.save_changes();
        }
    }
}, {
    serializers: _.extend({
         scale: { deserialize: widgets.unpack_models },
         offset: { deserialize: widgets.unpack_models }
    }, widgets.WidgetModel.serializers)
});

var ColorAxisModel = AxisModel.extend({

    defaults: function() {
        return _.extend(AxisModel.prototype.defaults(), {
            _model_name: "ColorAxisModel",
            _view_name: "ColorAxis"
        });
    }
});


module.exports = {
    AxisModel: AxisModel,
    ColorAxisModel: ColorAxisModel
};
