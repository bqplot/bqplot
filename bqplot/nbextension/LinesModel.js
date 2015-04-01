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

    var LinesModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            LinesModel.__super__.initialize.apply(this);
            this.on_some_change(["x", "y", "color"], this.update_data, this);
            // FIXME: replace this with on("change:preserve_domain"). It is not done here because
            // on_some_change depends on the GLOBAL backbone on("change") handler which
            // is called AFTER the specific handlers on("change:foobar") and we make that
            // assumption.
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.display_el_classes = ["line", "legendtext"];
            this.event_metadata = {"mouse_over":      {"msg_name": "hover",
                                                       "lookup_data": true,
                                                       "hit_test": true },
                                   "legend_clicked":  {"msg_name": "legend_click",
                                                       "hit_test": true },
                                   "element_clicked": {"msg_name": "element_click",
                                                       "lookup_data": true,
                                                       "hit_test": true},
                                   "parent_clicked":  {"msg_name": "background_click",
                                                       "hit_test": false}
                                  };
        },
        update_data: function() {
            this.dirty = true;
            // Handling data updates
            var that = this;
            this.x_data = this.get_typed_field("x");
            this.y_data = this.get_typed_field("y");
            this.color_data = this.get_typed_field("color");

            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];
            var curve_labels = this.get("labels");
            if (this.x_data.length === 0 || this.y_data.length === 0) {
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
                            color: that.color_data[i],
                            index: i,
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
                            color: that.color_data[i],
                            index: i,
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
            if(!this.mark_data) {
                return;
            }
            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];
            var color_scale = scales["color"];

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
            if(color_scale !== null && color_scale !== undefined) {
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                        return elem.color;
                    }), this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
        },
        get_data_dict: function(data, index) {
            return data;
        },
    });

    var FlexLineModel = LinesModel.extend({
        update_data:function() {
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
                this.data_len = 0;
            } else {
                this.x_data = this.x_data[0] instanceof Array ?
                    this.x_data : [this.x_data];
                this.y_data = this.y_data[0] instanceof Array ?
                    this.y_data : [this.y_data];
                curve_labels = this.update_labels();
                var color_data = this.get_typed_field("color");
                var width_data = this.get_typed_field("width");
                this.data_len = Math.min(this.x_data[0].length, this.y_data[0].length);

                this.mark_data = [{ name: curve_labels[0],
                            values: _.range(this.data_len - 1)
                                .map(function(val, index) {
                                return {x1: that.x_data[0][index],
                                        y1: that.y_data[0][index],
                                        x2: that.x_data[0][index+1],
                                        y2: that.y_data[0][index+1],
                                        color: color_data[index],
                                        size: width_data[index]};
                            })
                        }];
            }

            this.update_domains();
            this.dirty = false;
            this.trigger("data_updated");
        },
        update_domains: function() {
            if(!this.mark_data) {
                return;
            }
            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];
            var color_scale = scales["color"];
            var width_scale = scales["width"];

            if(!this.get("preserve_domain")["x"]) {
                x_scale.compute_and_set_domain(this.x_data[0].slice(0, this.data_len), this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["y"]) {
                y_scale.compute_and_set_domain(this.y_data[0].slice(0, this.data_len), this.id);
            } else {
                y_scale.del_domain([], this.id);
            }

            if(color_scale !== null && color_scale !== undefined) {
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) { return d.color; })
                    }), this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
            if(width_scale !== null && width_scale !== undefined) {
                if(!this.get("preserve_domain")["width"]) {
                    width_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) { return d.size; })
                    }), this.id);
                } else {
                    width_scale.del_domain([], this.id);
                }
            }
        },
    });

    return {
        LinesModel: LinesModel,
        FlexLineModel: FlexLineModel,
    };
});
