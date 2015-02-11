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
    var LinesModel = MarkModel.extend({
        initialize: function() {
            LinesModel.__super__.initialize.apply(this);
            this.on_some_change(["x", "y"], this.update_data, this);
            // FIXME: replace this with on("change:preserve_domain"). It is not done here because
            // on_some_change depends on the GLOBAL backbone on("change") handler which
            // is called AFTER the specific handlers on("change:foobar") and we make that
            // assumption.
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.on("change:stroke_width", this.update_bounding_box, this);
        },
        update_bounding_box: function(model, value) {
            this.x_padding = this.y_padding = this.get("stroke_width") / 2;
            this.trigger("mark_padding_updated");
        },
        update_data: function() {
            this.dirty = true;
            // Handling data updates
            var that = this;
            this.x_data = this.get_typed_field("x");
            this.y_data = this.get_typed_field("y");

            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];
            var curve_labels = this.get("labels");
            if (this.x_data.length == 0 || this.y_data.length == 0) {
                this.mark_data = [];
            } else {
                this.x_data = this.x_data[0] instanceof Array ?
                    this.x_data : [this.x_data];
                this.y_data = this.y_data[0] instanceof Array ?
                    this.y_data : [this.y_data];
                curve_labels = this.update_labels();

                if (this.x_data.length == 1 && this.y_data.length > 1) {
                    // same x for all y
                    this.mark_data = curve_labels.map(function(name, i) {
                        return {
                            name: name,
                            values: that.y_data[i].map(function(d, j) {
                                return {x: that.x_data[0][j], y: d};
                            }),
                            opacity: 1,
                        };
                    });
                } else {
                    this.mark_data = curve_labels.map(function(name, i) {
                        var xy_data = d3.zip(that.x_data[i], that.y_data[i]);
                        return {
                            name: name,
                            values: xy_data.map(function(d, j) {
                                return {x: d[0], y: d[1]};
                            }),
                            opacity: 1,
                        };
                    });
                }
            }
            this.update_domains();
            this.dirty = false;
            this.trigger("data_updated");
        },
        update_labels: function() {
            // Function to set the labels appropriately.
            // Setting the labels to the value sent and filling in the
            // remaining values.
            var curve_labels = this.get("labels");
            var data_length = (this.x_data.length == 1) ?
                (this.y_data.length) : Math.min(this.x_data.length, this.y_data.length);
            if(curve_labels.length > data_length) {
                curve_labels = curve_labels.slice(0, data_length);
            }
            else if(curve_labels.length < data_length) {
                _.range(curve_labels.length, data_length).forEach(function(index) {
                    curve_labels[index] = "C" + (index+1);
                });
            }
            return curve_labels;
        },
        update_domains: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];

            if(!this.get("preserve_domain")["x"]) {
                x_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) { return d.x; });
                }), this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["y"]) {
                y_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) { return d.y; });
                }), this.id);
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.LinesModel", LinesModel);

    var FlexLineModel = LinesModel.extend({
        update_data:function() {
            FlexLineModel.__super__.update_data.apply(this);
            var scales = this.get("scales");

            var color_data = this.get_typed_field("color");
            var x_data = this.get_typed_field("x");
            var width_data = this.get_typed_field("width");

            var color_scale = scales["color"];
            var width_scale = scales["width"];

            if(color_scale && color_data.length > 0){
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(color_data, this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }

            if(width_scale && width_data.length > 0){
                if(!this.get("preserve_domain")["width"]) {
                    width_scale.compute_and_set_domain(width_data, this.id);
                } else {
                    width_scale.del_domain([], this.id);
                }
            }

            this.new_mark_data = this.mark_data.map(function(curve_elem) {
                return {   name: curve_elem["name"],
                           values: curve_elem["values"].slice(0, curve_elem["values"].length - 1)
                             .map(function(val, index, values_array) {
                               return {x1: val["x"],
                                       y1: val["y"],
                                       x2: curve_elem["values"][index+1]["x"],
                                       y2: curve_elem["values"][index+1]["y"],
                                       color: color_data[index],
                                       size: width_data[index]};
                           }),
                       };
            });
            this.trigger("data_updated");
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.FlexLineModel", FlexLineModel);
    return [LinesModel, FlexLineModel];
});
