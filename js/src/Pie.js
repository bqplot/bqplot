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
var mark = require("./Mark");
var utils = require("./utils");
var _ = require("underscore");

var Pie = mark.Mark.extend({
    render: function() {
        var base_creation_promise = Pie.__super__.render.apply(this);
        this.selected_indices = this.model.get("selected");
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");

        this.display_el_classes = ["slice", "text"];
        var that = this;
        this.pie_g = this.d3el.append("g").attr("class", "pie");
        this.pie_g.append("g").attr("class", "slices");
        this.pie_g.append("g").attr("class", "labels");
        this.pie_g.append("g").attr("class", "lines");

        var radius = this.model.get("radius");
        var inner_radius = this.model.get("inner_radius");

        var display_labels = this.model.get("display_labels");

        if(display_labels === "outside") {
            this.arc = d3.svg.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(inner_radius * 0.8);

            this.outer_arc = d3.svg.arc()
                .innerRadius(radius * 0.9)
                .outerRadius(radius * 0.9);
        } else {
            this.arc = d3.svg.arc()
                .outerRadius(radius)
                .innerRadius(inner_radius);
        }

        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        this.join_key = function(d) { return d.data.label; };

        return base_creation_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.compute_view_padding();
            that.draw();
        }, null);
    },

    set_ranges: function() {
        var x_scale = this.scales.x;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            this.x_offset = x_scale.offset;
        }
        var y_scale = this.scales.y;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            this.y_offset = y_scale.offset;
        }
    },

    set_positional_scales: function() {
        // If no scale for "x" or "y" is specified, figure scales are used.
        var x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        var y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        var that = this;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!that.model.dirty) { that.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!that.model.dirty) { that.draw(); }
        });
    },

    create_listeners: function() {
        Pie.__super__.create_listeners.apply(this);
        this.d3el
          .on("mouseover", _.bind(function() {
              this.event_dispatcher("mouse_over");
          }, this))
          .on("mousemove", _.bind(function() {
              this.event_dispatcher("mouse_move");
          }, this))
          .on("mouseout", _.bind(function() {
              this.event_dispatcher("mouse_out");
          }, this));

        this.listenTo(this.model, "data_updated", function() {
            //animate on data update
            var animate = true;
            this.draw(animate);
        }, this);
        this.listenTo(this.model, "change:colors", this.update_colors, this);
        this.listenTo(this.model, "colors_updated", this.update_colors, this);
        this.model.on_some_change(["inner_radius", "radius"], function() {
            this.compute_view_padding();
            var animate = true;
            this.update_radii(animate);
        }, this);
        this.model.on_some_change(["stroke", "opacities"], this.update_stroke_and_opacities, this);
        this.model.on_some_change(["x", "y"], this.position_center, this);
        this.model.on_some_change(["display_labels", "label_color", "font_size", "font_weight"],
                                  this.update_labels, this);
        this.model.on_some_change(["start_angle", "end_angle", "sort"], function() {
            var animate = true;
            this.draw(animate);
        }, this);

        this.model.on_some_change(["display_values", "values_format"],
                                  this.update_values, this);

        this.listenTo(this.model, "labels_updated", this.update_values, this);
        this.listenTo(this.model, "change:selected", function() {
            this.selected_indices = this.model.get("selected");
            this.apply_styles();
        }, this);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    },

    process_interactions: function() {
        var interactions = this.model.get("interactions");
        if(_.isEmpty(interactions)) {
            //set all the event listeners to blank functions
            this.reset_interactions();
        } else {
            if(interactions.click !== undefined &&
              interactions.click !== null) {
                if(interactions.click === "tooltip") {
                    this.event_listeners.element_clicked = function() {
                        return this.refresh_tooltip(true);
                    };
                    this.event_listeners.parent_clicked = this.hide_tooltip;
                } else if (interactions.click === "select") {
                    this.event_listeners.parent_clicked = this.reset_selection;
                    this.event_listeners.element_clicked = this.click_handler;
                }
            } else {
                this.reset_click();
            }
            if(interactions.hover !== undefined &&
              interactions.hover !== null) {
                if(interactions.hover === "tooltip") {
                    this.event_listeners.mouse_over = this.refresh_tooltip;
                    this.event_listeners.mouse_move = this.move_tooltip;
                    this.event_listeners.mouse_out = this.hide_tooltip;
                }
            } else {
                this.reset_hover();
            }
            if(interactions.legend_click !== undefined &&
              interactions.legend_click !== null) {
                if(interactions.legend_click === "tooltip") {
                    this.event_listeners.legend_clicked = function() {
                        return this.refresh_tooltip(true);
                    };
                    this.event_listeners.parent_clicked = this.hide_tooltip;
                }
            } else {
                this.event_listeners.legend_clicked = function() {};
            }
            if(interactions.legend_hover !== undefined &&
              interactions.legend_hover !== null) {
                if(interactions.legend_hover === "highlight_axes") {
                    this.event_listeners.legend_mouse_over = _.bind(this.highlight_axes, this);
                    this.event_listeners.legend_mouse_out = _.bind(this.unhighlight_axes, this);
                }
            } else {
                this.reset_legend_hover();
            }
        }
    },

    relayout: function() {
        this.set_ranges();
        this.position_center();
        this.update_radii();
    },

    position_center: function(animate) {
        var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        var x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        var y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;
        var x = (x_scale.model.type === "date") ?
            this.model.get_date_elem("x") : this.model.get("x");
        var y = (y_scale.model.type === "date") ?
            this.model.get_date_elem("y") : this.model.get("y");
        var transform = "translate(" + (x_scale.scale(x) + x_scale.offset) +
                                ", " + (y_scale.scale(y) + y_scale.offset) + ")";
        this.pie_g
            .transition("position_center").duration(animation_duration)
            .attr("transform", transform);
    },

    update_radii: function(animate) {
        var animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        var radius = this.model.get("radius");
        var inner_radius = this.model.get("inner_radius");
        var display_labels = this.model.get("display_labels");

        if(display_labels === "inside") {
            this.arc.outerRadius(radius).innerRadius(inner_radius);
        } else if(display_labels === "outside") {
            this.arc.outerRadius(radius * 0.8).innerRadius(inner_radius * 0.8);
            this.outer_arc.innerRadius(radius * 0.9).outerRadius(radius * 0.9);
        }

        var slices = this.pie_g.select(".slices");
        var labels = this.pie_g.select(".labels");
        var lines = this.pie_g.select(".lines");

        var that = this;

        slices.selectAll("path.slice")
            .transition("update_radii").duration(animation_duration)
            .attr("d", this.arc);

        if(display_labels === "inside") {
            labels.selectAll("text")
                .transition("update_radii").duration(animation_duration)
                .attr("transform", function(d) {
                    return "translate(" + that.arc.centroid(d) + ")";
                });
        } else if(display_labels === "outside") {
            labels.selectAll("text")
                .transition("update_radii").duration(animation_duration)
                .attr("transform", function(d) {
                    var pos = that.outer_arc.centroid(d);
                    pos[0] = radius * (that.is_mid_angle_left(d) ? -1 : 1);
                    return "translate(" + pos + ")";
                });

            lines.selectAll("polyline")
                .transition("update_radii").duration(animation_duration)
                .attr("points", function(d) {
                    var pos = that.outer_arc.centroid(d);
                    pos[0] = radius * 0.95 * (that.is_mid_angle_left(d) ? -1 : 1);
                    return [that.arc.centroid(d), that.outer_arc.centroid(d), pos];
                });
        }
    },

    outer_join: function(first, second) {
        var common_keys = d3.set(first.concat(second).map(function(d) {
            return d.label;
        })).values().sort();

        // convert first array to map keyed with label
        var first_map = {};
        first.forEach(function(d) { first_map[d.label] = d; });

        // convert second array to map keyed with label
        var second_map = {};
        second.forEach(function(d) { second_map[d.label] = d; });

        // create new first array with missing labels filled with 0
        var new_first = [],
            new_second = []
        common_keys.forEach(function(d) {
            if(d in first_map) {
                new_first.push(first_map[d]);
            } else {
                var missing_d = utils.deepCopy(second_map[d]);
                missing_d.size = 0;
                new_first.push(missing_d);
            }

            if(d in second_map) {
                new_second.push(second_map[d]);
            } else {
                var missing_d = utils.deepCopy(first_map[d]);
                missing_d.size = 0;
                new_second.push(missing_d);
            }
        });

        return {first: new_first, second: new_second};
    },

    is_mid_angle_left: function(arc_data) {
        // decides if the mid angle of the arc is toward left or right (to aid the
        // placement of label text and polylines)
        var mid_angle = (arc_data.startAngle + arc_data.endAngle) / 2;
        return mid_angle > Math.PI || (mid_angle < 0 && mid_angle > -Math.PI);
    },

    draw: function(animate) {
        this.set_ranges();
        this.position_center(animate);
        var new_data = this.model.mark_data;

        var old_data = this.pie_g.select(".slices").selectAll("path.slice")
            .data().map(function(d) { return d.data; });
        if (old_data.length === 0) {
            old_data = new_data;
        }
        var joined = this.outer_join(old_data, new_data);
        var was = joined.first;
        var is = joined.second;

        var pie = d3.layout.pie()
            .startAngle(this.model.get("start_angle") * 2 * Math.PI/360)
            .endAngle(this.model.get("end_angle") * 2 * Math.PI/360)
            .value(function(d) { return d.size; });

        if(!this.model.get("sort")) { pie.sort(null); }

        var that = this;
        var animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        var slices = this.pie_g.select(".slices")
            .selectAll("path.slice")
            .data(pie(was), this.join_key);

        slices.enter()
            .insert("path")
            .attr("class", "slice")
            .style("fill", function(d, i) {
                return that.get_colors(i);
            })
            .each(function(d) {
                this._current = d;
            });

        slices = this.pie_g.select(".slices")
            .selectAll("path.slice")
            .data(pie(is), this.join_key);

        slices.transition("draw").duration(animation_duration)
            .attrTween("d", function(d) {
                var interpolate = d3.interpolate(this._current, d);
                var _this = this;
                return function(t) {
                    _this._current = interpolate(t);
                    return that.arc(_this._current);
                };
            });

        slices = this.pie_g.select(".slices")
            .selectAll("path.slice")
            .data(pie(new_data), this.join_key);

        slices.exit()
            .transition("draw")
            .delay(animation_duration)
            .duration(0)
            .remove();

        var labels = this.pie_g.select(".labels")
            .selectAll("text")
            .data(pie(was), this.join_key);

        labels.enter()
            .append("text")
            .attr("dy", ".35em")
            .style("opacity", 0)
            .text(function(d) {
                return d.data.label;
            })
            .each(function(d) {
                this._current = d;
            });

        labels = this.pie_g.select(".labels")
            .selectAll("text")
            .data(pie(is), this.join_key);

        var label_trans = labels.transition("draw")
            .duration(animation_duration)
            .style("opacity", function(d) {
                return d.data.value === 0 ? 0 : 1;
            });
        var display_labels = this.model.get("display_labels");

        if(display_labels === "inside") {
            label_trans.attr("transform", function(d) {
                return "translate(" + that.arc.centroid(d) + ")";
            })
            .style("text-anchor", "middle");
        } else if(display_labels === "outside") {
            label_trans.attrTween("transform", function(d) {
                var interpolate = d3.interpolate(this._current, d);
                var _this = this;
                return function(t) {
                    var d2 = interpolate(t);
                    _this._current = d2;
                    var pos = that.outer_arc.centroid(d2);
                    pos[0] = that.model.get("radius") *
                        (that.is_mid_angle_left(d2) ?  -1 : 1);
                    return "translate(" + pos + ")";
                };
            })
            .styleTween("text-anchor", function(d) {
                var interpolate = d3.interpolate(this._current, d);
                return function(t) {
                    var d2 = interpolate(t);
                    return that.is_mid_angle_left(d2) ? "end":"start";
                };
            });
        }

        labels = this.pie_g.select(".labels")
            .selectAll("text")
            .data(pie(new_data), this.join_key);

        labels.exit()
            .transition("draw").delay(animation_duration)
            .remove();

        // for labels which are displayed outside draw the polylines
        if(display_labels === "outside") {
            var polylines = this.pie_g.select(".lines")
                .selectAll("polyline")
                .data(pie(was), this.join_key);

            polylines.enter()
                .append("polyline")
                .style("opacity", 0)
                .each(function(d) {
                    this._current = d;
                });

            polylines = this.pie_g.select(".lines")
                .selectAll("polyline")
                .data(pie(is), this.join_key);

            polylines.transition("draw")
                .duration(animation_duration)
                .style("opacity", function(d) {
                    return d.data.value === 0 ? 0 : 0.5;
                })
                .attrTween("points", function(d) {
                    this._current = this._current;
                    var interpolate = d3.interpolate(this._current, d);
                    var _this = this;
                    return function(t) {
                        var d2 = interpolate(t);
                        _this._current = d2;
                        var pos = that.outer_arc.centroid(d2);
                        pos[0] = that.model.get("radius") * 0.95 *
                            (that.is_mid_angle_left(d2) ? -1 : 1);
                        return [that.arc.centroid(d2), that.outer_arc.centroid(d2), pos];
                    };
                });

            polylines = this.pie_g.select(".lines")
                .selectAll("polyline")
                .data(pie(new_data), this.join_key);

            polylines.exit()
                .transition("draw").delay(animation_duration)
                .remove();
        }

        slices.order();

        slices.on("click", function(d, i) {
            return that.event_dispatcher("element_clicked", {data: d, index: i});
        });

        this.update_labels();
        this.update_values();
        this.apply_styles();
    },

    update_stroke_and_opacities: function() {
        var stroke = this.model.get("stroke");
        var opacities = this.model.get("opacities");
        this.pie_g.selectAll("path.slice")
            .style("stroke", stroke)
            .style("opacity", function(d, i) { return opacities[i]; });
    },

    update_colors: function() {
        var that = this;
        var color_scale = this.scales.color;
        this.pie_g.select(".slices")
          .selectAll("path.slice")
          .style("fill", function(d, i) {
              return (d.data.color !== undefined && color_scale !== undefined) ?
                  color_scale.scale(d.data.color) : that.get_colors(d.data.index);
          });
    },

    update_labels: function() {
        var display_labels = this.model.get("display_labels");

        var labels = this.pie_g.selectAll(".labels text")
            .style("visibility",  display_labels === "none" ? "hidden" : "visible")
            .style("font-weight", this.model.get("font_weight"))
            .style("font-size", this.model.get("font_size"));

        var color = this.model.get("label_color");
        if(color !== undefined) {
            labels.style("fill", color);
        }
    },

    update_values: function() {
        var display_values = this.model.get("display_values");
        var values_format = d3.format(this.model.get("values_format"));

        var labels = this.pie_g.selectAll(".labels text")
            .text(function(d) {
                return d.data.label +
                    (display_values ? ": " + values_format(d.data.size) : "");
            })
    },

    clear_style: function(style_dict, indices) {
        // Function to clear the style of a dict on some or all the elements of the
        // chart. If indices is null, clears the style on all elements. If
        // not, clears on only the elements whose indices are matching.
        var elements = this.pie_g.selectAll("path.slice");
        if(indices) {
            elements = elements.filter(function(d, index) {
                return indices.indexOf(index) !== -1;
            });
        }
        var clearing_style = {};
        for(var key in style_dict) {
            clearing_style[key] = null;
        }
        elements.style(clearing_style);
    },

    set_style_on_elements: function(style, indices) {
        // If the index array is undefined or of length=0, exit the
        // function without doing anything
        if(indices === undefined || indices === null || indices.length === 0) {
            return;
        }
        var elements = this.pie_g.selectAll(".slice");
        elements = elements.filter(function(data, index) {
            return indices.indexOf(index) !== -1;
        });
        elements.style(style);
    },

    set_default_style: function(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        this.update_colors();
        this.update_stroke_and_opacities();
    },

    click_handler: function (args) {
        var data = args.data;
        var index = args.index;
        var that = this;
        var idx = this.model.get("selected");
        var selected = idx ? utils.deepCopy(idx) : [];
            // index of slice i. Checking if it is already present in the list.
        var elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        var accelKey = d3.event.ctrlKey || d3.event.metaKey;
        if(elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the element from the list
            selected.splice(elem_index, 1);
        } else {
            if(d3.event.shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if(elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //slice which has been clicked
                var min_index = (selected.length !== 0) ?
                    d3.min(selected) : -1;
                var max_index = (selected.length !== 0) ?
                    d3.max(selected) : that.model.mark_data.length;
                if(index > max_index){
                    _.range(max_index+1, index).forEach(function(i) {
                        selected.push(i);
                    });
                } else if(index < min_index){
                    _.range(index+1, min_index).forEach(function(i) {
                        selected.push(i);
                    });
                }
                } else if(!accelKey) {
                selected = [];
            }
            // updating the array containing the slice indexes selected
            // and updating the style
            selected.push(index);
        }
        this.model.set("selected",
            ((selected.length === 0) ? null : selected),
            {updated_view: this});
        this.touch();
        if(!d3.event) {
            d3.event = window.event;
        }
        var e = d3.event;
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
        this.selected_indices = selected;
        this.apply_styles();
    },

    reset_selection: function() {
        this.model.set("selected", null);
        this.touch();
        this.selected_indices = null;
        this.clear_style(this.selected_style);
        this.clear_style(this.unselected_style);
        this.set_default_style();
    },

    compute_view_padding: function() {
        var scales = this.model.get("scales");
        var r = d3.max([this.model.get("radius"), this.model.get("inner_radius")]);

        var x_padding = (scales.x) ? (r+1) : 0;
        var y_padding = (scales.y) ? (r+1) : 0;
        if(x_padding !== this.x_padding || y_padding !== this.y_padding) {
            this.x_padding = x_padding;
            this.y_padding = y_padding;
            this.trigger("mark_padding_updated");
        }
    }
});

module.exports = {
    Pie: Pie
};
