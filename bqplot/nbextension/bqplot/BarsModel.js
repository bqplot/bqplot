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
            this.on_some_change(["x", "y"], this.update_data, this);
            this.on_some_change(["set_x_domain", "set_y_domain"], this.update_domains, this);
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
                this.bar_data = [];
            }
            else {
                x_data = x_data.slice(0, d3.min(y_data.map(function(d) { return d.length; })));
                this.bar_data = x_data.map(function (x_elem, index) {
                    var data = {};
                    var y0 = 0;
                    var y0_neg = 0;
                    data.key = x_elem;
                    data.values = y_data.map(function(y_elem) { var value = y_elem[index];
                                                                var positive = (value >= 0);
                                                                return {y0: (positive) ? y0 : y0_neg, y1: (positive) ? (y0 += y_elem[index]) : (function() { y0_neg += y_elem[index];
                                                                                                                                                            return (y0_neg - y_elem[index]);
                                                                                                                                                            }()), val: y_elem[index]} });
                    var y_vals = data.values.map(function(d) { return d.y1; });
                    data.pos_max = y0;
                    data.neg_max = y0_neg;
                    return data;
            });
            }
            this.update_domains();
            this.trigger("data_updated");
        },
        update_domains: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            if(this.get("set_x_domain")) {
                x_scale.compute_and_set_domain(this.bar_data.map(function(elem) { return elem.key; }), this.id);
            }
            else {
                x_scale.del_domain([], this.id);
            }

            if(this.get("set_y_domain")) {
                if(this.get("type") == "stacked") {
                    var min = d3.min(this.bar_data, function(c) { return c.neg_max; });
                    y_scale.compute_and_set_domain([min, d3.max(this.bar_data, function(c) { return c.pos_max; })], this.id);
                } else {
                    var min = d3.min(this.bar_data, function(c) { return d3.min(c.values, function(val) { return val.val; }); });
                    min = d3.min([0, min]);
                    var max = d3.max(this.bar_data, function(c) { return d3.max(c.values, function(val) { return val.val; }); });
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
