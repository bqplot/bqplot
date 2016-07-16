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

var d3 = require("d3");
var _ = require("underscore");
var markmodel = require("./MarkModel");

var LabelModel = markmodel.MarkModel.extend({

    defaults: _.extend({}, markmodel.MarkModel.prototype.defaults, {
        _model_name: "LabelModel",
        _view_name: "Label",

        x: [],
        y: [],
        x_offset: 0,
        y_offset: 0,
        scales_metadata: {
            x: { orientation: "horizontal", dimension: "x" },
            y: { orientation: "vertical", dimension: "y" },
            color: { dimension: "colors" }
        },
        colors: null,
        rotate_angle: 0.0,
        text: [],
        font_size: "14px",
        font_weight: "bold",
        align: "start"
    }),

    initialize: function() {
        // TODO: Normally, color, opacity and size should not require a redraw
        LabelModel.__super__.initialize.apply(this);
        this.on_some_change(["x", "y"], this.update_data, this);
        this.on_some_change(["text"], function() {
            this.trigger("data_updated");
        }, this);
        // FIXME: replace this with on("change:preserve_domain"). It is not done here because
        // on_some_change depends on the GLOBAL backbone on("change") handler which
        // is called AFTER the specific handlers on("change:foobar") and we make that
        // assumption.
        this.update_data();
    },

    update_data: function() {
        this.dirty = true;
        var x_data = this.get_typed_field("x"),
            y_data = this.get_typed_field("y"),
            text = this.get("text"),
            scales = this.get("scales"),
            x_scale = scales.x,
            y_scale = scales.y;

        if (x_data.length === 0 || y_data.length === 0) {
            this.mark_data = [];
        } else {
            //FIXME:Temporary fix to avoid misleading NaN error due to X and Y
            //being of different lengths. In particular, if Y is of a smaller
            //length, throws an error on the JS side
            var min_len = Math.min(x_data.length, y_data.length);
            x_data = x_data.slice(0, min_len);

            this.mark_data = x_data.map(function(d, i) {
                return {
                    x: d,
                    y: y_data[i],
                    text: text[i],
                };
            });
        }
        this.update_unique_ids();
        this.dirty = false;
        this.trigger("data_updated");
    },

    update_unique_ids: function() {
        this.mark_data.forEach(function(data, index){
                                   data.unique_id = "Label" + index;
        });
    }
});

module.exports = {
    LabelModel: LabelModel
};
