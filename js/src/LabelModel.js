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
var basemodel = require("./ScatterBaseModel");

var LabelModel = basemodel.ScatterBaseModel.extend({

    defaults: function () {
        return _.extend(basemodel.ScatterBaseModel.prototype.defaults(), {
            _model_name: "LabelModel",
            _view_name: "Label",

            x_offset: 0,
            y_offset: 0,
            rotate_angle: 0.0,
            text: [],
            font_size: 16.0,
            font_unit: "px",
            drag_size: 1.0,
            font_weight: "bold",
            align: "start",
        });
    },

    initialize: function() {
        // TODO: Normally, color, opacity and size should not require a redraw
        LabelModel.__super__.initialize.apply(this, arguments);
        this.on("change:text", this.update_data, this);
    },

    update_mark_data: function() {
        LabelModel.__super__.update_mark_data.apply(this);
        var text = this.get_typed_field("text");

        this.mark_data.forEach(function(d, i){ d.text = text[i]; });
    },

    update_unique_ids: function() {
        this.mark_data.forEach(function(data, index){
                                   data.unique_id = "Label" + index;
        });
    },
});

module.exports = {
    LabelModel: LabelModel
};
