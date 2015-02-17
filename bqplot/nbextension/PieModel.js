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

define(["./d3", "./MarkModel"], function(d3, MarkModelModule) {
    "use strict";

    var PieModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            PieModel.__super__.initialize.apply(this);
            this.on("change:sizes", this.update_data, this);
            this.on("change:color", function() {
                this.update_color();
                this.trigger("colors_updated");
            }, this);
            this.on_some_change(["inner_radius", "radius"], function() {
                this.update_bounding_box();
                this.trigger("radii_updated");
            }, this);
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.on("change:labels", this.update_labels, this);
        },
        update_bounding_box: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];
            if (!x_scale && !y_scale) { return; }
            var r = d3.max([this.get("radius"), this.get("inner_radius")]);
            if (x_scale) { this.x_padding = r; }
            if (y_scale) { this.y_padding = r; }
            this.trigger("mark_padding_updated");
        },
        update_data: function() {
            var sizes = this.get_typed_field("sizes");
            var color = this.get_typed_field("color");
            var labels = this.get("labels");
            this.mark_data = sizes.map(function(d, i) {
                return {size: d,
                        color: color[i],
                        label: labels[i]};
            });
            this.update_color();
            this.update_domains();
            this.trigger("data_updated");
        },
        update_labels: function() {
            if(!this.mark_data) {
                return;
            }
            var labels = this.get("labels");
            this.mark_data.forEach( function(data, index) {
                data["label"] = labels[index];
            });
            this.trigger("labels_updated");
        },
        update_color: function() {
            if(!this.mark_data) {
                return;
            }
            var color = this.get_typed_field("color");
            var color_scale = this.get("scales")["color"];
            if(color_scale) {
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(color, this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
        },
        update_domains: function() {
            if(!this.mark_data) {
                return;
            }
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            if(x_scale) {
                var x = (x_scale.type === "date") ?
                    this.get_date_elem("x") : this.get("x");
                if(!this.get("preserve_domain")["x"]) {
                    x_scale.compute_and_set_domain([x], this.id);
                } else {
                    x_scale.del_domain([], this.id);
                }
            }
            if(y_scale) {
                if(!this.get("preserve_domain")["y"]) {
                    y_scale.compute_and_set_domain([this.get("y")], this.id);
                } else {
                    y_scale.del_domain([], this.id);
                }
            }
        },
    });

    return {
        PieModel: PieModel,
    };
});
