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
    var BarsModel = MarkModel.extend({
        initialize: function() {
            BarsModel.__super__.initialize.apply(this);
            this.is_y_2d = false;
            this.on_some_change(["x", "y"], this.update_data, this);
            this.on("change:color",  function() { this.update_color();
                                                  this.trigger("colors_updated"); }
                                                  , this);
            this.on("change:permeable", this.update_domains, this);
        },
        update_data: function() {
            var x_data = this.get_typed_field("x");
            var y_data = this.get_typed_field("y");
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            y_data = (y_data.length == 0 || y_data[0] instanceof Array) ? y_data : [y_data];
            this.curve_labels = this.get("labels");
            if (x_data.length == 0 || y_data.length == 0) {
                this.mark_data = [];
                this.is_y_2d = false;
            }
            else {
                x_data = x_data.slice(0, d3.min(y_data.map(function(d) { return d.length; })));
                this.mark_data = x_data.map(function (x_elem, index) {
                    var data = {};
                    var y0 = 0;
                    var y0_neg = 0;
                    data.key = x_elem;
                    data.values = y_data.map(function(y_elem, y_index) { var value = y_elem[index];
                                                                        var positive = (value >= 0);
                                                                        return {y0: (positive) ? y0 : y0_neg,
                                                                                y1: (positive) ? (y0 += y_elem[index]) : (function() {
                                                                                                                            y0_neg += y_elem[index];
                                                                                                                            return (y0_neg - y_elem[index]);
                                                                                                                        }()),
                                                                                val: y_elem[index],
                                                                                };
                                                              }
                                            );
                    data.pos_max = y0;
                    data.neg_max = y0_neg;
                    return data;
                });
                this.is_y_2d = (this.mark_data[0].values.length > 1);
                this.update_color();
            }
            this.update_domains();
            this.trigger("data_updated");
        },
        update_color: function() {
            //Function to update the color attribute for the data. In scatter,
            //this is taken care of by the update_data itself. This is separate
            //in bars because update data does a lot more complex calculations
            //which should be avoided when possible
            var color = this.get_typed_field("color");
            var color_scale = this.get("scales")["color"];
            var color_mode = this.get("color_mode");
            var apply_color_to_groups = ((color_mode == "group") || (color_mode == "auto" && !(this.is_y_2d)));
            this.mark_data.forEach(function(single_bar_d, bar_grp_index) {
                                    single_bar_d.values.forEach(function(bar_d, bar_index) {
                                        bar_d.color_index = (apply_color_to_groups) ? bar_grp_index : bar_index;
                                        bar_d.color = color[bar_d.color_index];
                                    });
                                });
            if(color_scale && color.length > 0) {
                color_scale.compute_and_set_domain(color, this.id);
            }
        },
        update_domains: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            if(!this.get("permeable")["x"]) {
                x_scale.compute_and_set_domain(this.mark_data.map(function(elem) { return elem.key; }), this.id);
            }
            else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("permeable")["y"]) {
                if(this.get("type") == "stacked") {
                    y_scale.compute_and_set_domain([d3.min(this.mark_data, function(c) { return c.neg_max; }),
                                                   d3.max(this.mark_data, function(c) { return c.pos_max; })], this.id);
                } else {

                    var min = d3.min(this.mark_data, function(c) { return d3.min(c.values, function(val) { return val.val; }); });
                    min = Math.min(0, min);
                    var max = d3.max(this.mark_data, function(c) { return d3.max(c.values, function(val) { return val.val; }); });
                    max = Math.max(0, max);
                    y_scale.compute_and_set_domain([min, max], this.id);
                }
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.BarsModel", BarsModel);
    return [BarsModel];
});
