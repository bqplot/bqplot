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

define(["widgets/js/manager", "d3", "./MarkModel"], function(WidgetManager, d3, MarkModel) {
    var MarkModel = MarkModel[1];
    var PieModel = MarkModel.extend({
        initialize: function() {
            PieModel.__super__.initialize.apply(this);
            this.on("change:data", this.update_data, this);
            this.on("change:color", function() {
                this.update_color();
                this.trigger("colors_updated");
            }, this);
            this.on_some_change(["preserve_domain"], this.update_domains, this);
        },
        update_data: function() {
            data = this.get_typed_field("data");
            /*this.mark_data = data.map(function(d, i) {
                return {data: d,
                        color: color[i],
                        };
            })*/
            //y_data = (y_data.length === 0 || y_data[0] instanceof Array) ? y_data : [y_data];
            this.curve_labels = this.get("labels");
            this.update_color();
            this.update_domains();
            this.trigger("data_updated");
        },
        update_color: function() {
            var color = this.get_typed_field("color");
            var color_scale = this.get("scales")["color"];
            /*this.mark_data.forEach(function(single_bar_d, bar_grp_index) {
                single_bar_d.values.forEach(function(bar_d, bar_index) {
                    bar_d.color_index = (apply_color_to_groups) ? bar_grp_index : bar_index;
                    bar_d.color = color[bar_d.color_index];
                });
            });
            if(color_scale && color.length > 0) {
                    if(!this.get("preserve_domain")["color"]) {
                        color_scale.compute_and_set_domain(color, this.id);
                    } else {
                        color_scale.del_domain([], this.id);
                    }
            }*/
        },
        update_domains: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            if(x_scale) {
                if(!this.get("preserve_domain")["x"]) {
                    x_scale.compute_and_set_domain([this.get("x")], this.id);
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
    WidgetManager.WidgetManager.register_widget_model("bqplot.PieModel", PieModel);
    return [PieModel];
});
