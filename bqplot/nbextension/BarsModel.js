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

    var BarsModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            BarsModel.__super__.initialize.apply(this);
            this.is_y_2d = false;
            this.on_some_change(["x", "y", "base"], this.update_data, this);
            this.on("change:color", function() {
                this.update_color();
                this.trigger("colors_updated");
            }, this);
            // FIXME: replace this with on("change:preserve_domain"). It is not done here because
            // on_some_change depends on the GLOBAL backbone on("change") handler which
            // is called AFTER the specific handlers on("change:foobar") and we make that
            // assumption.
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.fields = ["x", "y", "index", "sub_index", "color"];
        },
        update_data: function() {
            var x_data = this.get_typed_field("x");
            var y_data = this.get_typed_field("y");
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];
            y_data = (y_data.length === 0 || y_data[0] instanceof Array) ?
                y_data : [y_data];
            var self = this;

            this.base_value = this.get("base");
            if(this.base_value === undefined || this.base_value === null) {
                this.base_value = 0;
            }

            if (x_data.length === 0 || y_data.length === 0) {
                this.mark_data = [];
                this.is_y_2d = false;
            }
            else {
                x_data = x_data.slice(0, d3.min(y_data.map(function(d) {
                    return d.length;
                })));
                this.mark_data = x_data.map(function (x_elem, index) {
                    var data = {};
                    var y0 = self.base_value;
                    var y0_neg = self.base_value;
                    data.key = x_elem;
                    data.values = y_data.map(function(y_elem, y_index) {
                        var value = y_elem[index] - self.base_value;
                        var positive = (value >= 0);
                        return {
                            index: index,
                            sub_index: y_index,
                            x: x_elem,
                            y0: (positive) ? y0 : y0_neg,
                            y1: (positive) ? (y0 += value) : (function() {
                                y0_neg += value;
                                return (y0_neg - value);
                            }()),
                            y: value,
                            // analogous to the height of the bar
                        };
                    });
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
        get_data_dict: function(index) {
            return _.reduce(this.fields, function(res, key) {
                                            res[key] = this.mark_data[index][key];
                                            return res}, {}, this);
        },
        update_color: function() {
            //Function to update the color attribute for the data. In scatter,
            //this is taken care of by the update_data itself. This is separate
            //in bars because update data does a lot more complex calculations
            //which should be avoided when possible
            if(!this.mark_data) {
                return;
            }
            var color = this.get_typed_field("color");
            var color_scale = this.get("scales")["color"];
            var color_mode = this.get("color_mode");
            var apply_color_to_groups = ((color_mode === "group") ||
                                         (color_mode === "auto" && !(this.is_y_2d)));
            this.mark_data.forEach(function(single_bar_d, bar_grp_index) {
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
            }
        },
        update_domains: function() {
            if(!this.mark_data) {
                return;
            }
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            if(!this.get("preserve_domain")["x"]) {
                x_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.key;
                }), this.id);
            }
            else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["y"]) {
                if(this.get("type") === "stacked") {
                    y_scale.compute_and_set_domain([d3.min(this.mark_data, function(c) { return c.neg_max; }),
                                                    d3.max(this.mark_data, function(c) { return c.pos_max; }), this.base_value],
                                                    this.id);
                } else {
                    var min = d3.min(this.mark_data,
                        function(c) {
                            return d3.min(c.values, function(val) {
                                return val.val;
                            });
                        });
                    var max = d3.max(this.mark_data, function(c) {
                        return d3.max(c.values, function(val) {
                            return val.val;
                        });
                    });
                    y_scale.compute_and_set_domain([min, max, this.base_value], this.id);
                }
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });
    return {
        BarsModel: BarsModel,
    };
});
