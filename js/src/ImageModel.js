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
var markmodel = require("./MarkModel");

var ImageModel = markmodel.MarkModel.extend({

    defaults: function() {
        return _.extend(markmodel.MarkModel.prototype.defaults(), {
            _model_name: "ImageModel",
            _view_name: "Image",
            x0: 0.0,
            y0: 0.0,
            x1: 1.0,
            y1: 1.0,
            scales_metadata: {
                'x': {'orientation': 'horizontal', 'dimension': 'x'},
                'y': {'orientation': 'vertical', 'dimension': 'y'},
            },
        });
    },

    initialize: function() {
        ImageModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(['x0', 'y0', 'x1', 'y1'], this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
    },

    update_data: function() {
        this.update_domains();
        this.trigger("data_updated");
    },

    update_domains: function() {
        if(!this.mark_data) {
            return;
        }
        var scales = this.get("scales");
        var x_scale = scales.x;
        var y_scale = scales.y;

        if(x_scale) {
            var x = (y_scale.type === "date") ?
                [this.get_date_elem("x0"), this.get_date_elem("x1")] : [this.get("x0"), this.get("x1")];
            if(!this.get("preserve_domain").x) {
                x_scale.compute_and_set_domain(x, this.model_id + "_x");
            } else {
                x_scale.del_domain([], this.model_id + "_x");
            }
        }
        if(y_scale) {
            var y = (y_scale.type === "date") ?
                [this.get_date_elem("y0"), this.get_date_elem("y1")] : [this.get("y0"), this.get("y1")];
            if(!this.get("preserve_domain").y) {
                y_scale.compute_and_set_domain(y, this.model_id + "_y");
            } else {
                y_scale.del_domain([], this.model_id + "_y");
            }
        }
    },

}, {
    serializers: _.extend({
        image: { deserialize: widgets.unpack_models },
    }, markmodel.MarkModel.serializers)
});

module.exports = {
    ImageModel: ImageModel
};
