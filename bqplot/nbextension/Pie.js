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

define(["./d3", "./Mark", "./utils"], function(d3, MarkViewModule, utils) {
    "use strict";

    var Pie = MarkViewModule.Mark.extend({
        render: function() {
            var base_creation_promise = Pie.__super__.render.apply(this);
            this.selected_indices = this.model.get("idx_selected");
            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");

            var self = this;
            this.el.append("rect")
                .attr("class", "mouseeventrect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.parent.plotarea_width)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .attr("height", this.parent.plotarea_height)
                .style("pointer-events", "all")
                .on("click", function() {
                    if (self.model.get("select_slices"))
                        { self.reset_selection(); }
                });
            this.el.append("g")
              .attr("class", "pielayout");

            return base_creation_promise.then(function() {
                self.create_listeners();
                self.draw();
            }, null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            // If no scale for "x" or "y" is specified, figure scales are used.
            var x_scale = this.scales["x"] ? this.scales["x"] : this.parent.scale_x;
            var y_scale = this.scales["y"] ? this.scales["y"] : this.parent.scale_y;

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
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("colors_updated", this.update_colors, this);
            this.model.on("radii_updated", this.update_radii, this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
            this.model.on_some_change(["x", "y"], this.position_center, this);
            this.model.on_some_change(["start_angle", "end_angle", "sort"], this.draw, this);
            this.model.on("labels_updated", this.update_labels, this);
            this.model.on("change:select_slices", function() {
                if (!this.model.get("select_slices")) {
                    this.reset_selection();
                }
            }, this);
            this.model.on("change:idx_selected", function() {
                this.selected_indices = this.model.get("idx_selected");
                this.apply_styles();
            }, this);
        },
        relayout: function() {
            this.set_ranges();
            this.el.select(".mouseeventrect")
              .attr("width", this.parent.plotarea_width)
              .attr("height", this.parent.plotarea_height);

            this.position_center();
            this.update_radii();
        },
        position_center: function() {
            var x_scale = this.scales["x"] ? this.scales["x"] : this.parent.scale_x;
            var y_scale = this.scales["y"] ? this.scales["y"] : this.parent.scale_y;
            var x = (x_scale.model.type === "date") ?
                this.model.get_date_elem("x") : this.model.get("x");
            var y = (y_scale.model.type === "date") ?
                this.model.get_date_elem("y") : this.model.get("y");
            var transform = "translate(" + x_scale.scale(x) +
                                    ", " + y_scale.scale(y) + ")";
            this.el.select(".pielayout").transition()
              .duration(this.model.get("animate_dur"))
              .attr("transform", transform);
        },
        update_radii: function() {
            var arc = d3.svg.arc()
              .outerRadius(this.model.get("radius"))
              .innerRadius(this.model.get("inner_radius"));

            var elements = this.el.select(".pielayout").selectAll(".slice");

            elements.select("path")
              .transition().duration(this.model.get("animate_dur"))
              .attr("d", arc);

            elements.select("text")
              .attr("transform", function(d) {
                        return "translate(" + arc.centroid(d) + ")"; });
        },
        draw: function() {
            this.set_ranges();
            this.position_center();

            var pie = d3.layout.pie()
              .startAngle(this.model.get("start_angle")*2*Math.PI/360)
              .endAngle(this.model.get("end_angle")*2*Math.PI/360)
                .value(function(d) { return d.size; });
            if (!this.model.get("sort")) { pie.sort(null); }

            var that = this;
            var elements = this.el.select(".pielayout").selectAll(".slice")
              .data(pie(this.model.mark_data));

            var elements_added = elements.enter().append("g")
              .attr("class", "slice")
              .on("click", function(d, i) {return that.click_handler(d, i);});

            elements.append("path");
            elements.append("text")
              .attr("dy", ".35em")
              .attr("pointer-events", "none")
              .style("text-anchor", "middle");

            this.update_radii();
            this.update_labels();
            this.apply_styles();
        },
        update_stroke_and_opacity: function() {
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            this.el.select(".pielayout").selectAll(".slice")
              .style("stroke", (stroke === undefined || stroke === null) ? "none" : stroke)
              .style("opacity", opacity);
        },
        update_colors: function() {
            var that = this;
            var color_scale = this.scales["color"];
            if(color_scale) {
                color_scale.set_range();
            }
            this.el.select(".pielayout").selectAll(".slice")
              .style("fill", function(d, i) {
                  return (d.data.color !== undefined && color_scale !== undefined) ?
                      color_scale.scale(d.data.color) : that.get_colors(i);
              });
        },
        update_labels: function() {
            this.el.select(".pielayout").selectAll(".slice").select("text")
              .text(function(d) { return d.data.label; });
        },
        clear_style: function(style_dict, indices) {
            // Function to clear the style of a dict on some or all the elements of the
            // chart. If indices is null, clears the style on all elements. If
            // not, clears on only the elements whose indices are matching.
            var elements = this.el.select(".pielayout").selectAll(".slice");
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
            var elements = this.el.select(".pielayout").selectAll(".slice");
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            elements.style(style);
        },
        set_default_style: function(indices) {
            // For all the elements with index in the list indices, the default
            // style is applied.
            this.update_colors();
            this.update_stroke_and_opacity();
        },
        click_handler: function (data, index) {
            var that = this;
            if(this.model.get("select_slices")) {
                var idx = this.model.get("idx_selected");
                var idx_selected = idx ? utils.deepCopy(idx) : [];
                var elem_index = idx_selected.indexOf(index);
                // index of slice i. Checking if it is already present in the
                // list
                if(elem_index > -1 && d3.event.ctrlKey) {
                    // if the index is already selected and if ctrl key is
                    // pressed, remove the element from the list
                    idx_selected.splice(elem_index, 1);
                } else {
                    if(d3.event.shiftKey) {
                        //If shift is pressed and the element is already
                        //selected, do not do anything
                        if(elem_index > -1) {
                            return;
                        }
                        //Add elements before or after the index of the current
                        //slice which has been clicked
                        var min_index = (idx_selected.length !== 0) ?
                            d3.min(idx_selected) : -1;
                        var max_index = (idx_selected.length !== 0) ?
                            d3.max(idx_selected) : that.model.mark_data.length;
                        if(index > max_index){
                            _.range(max_index+1, index).forEach(function(i) {
                                idx_selected.push(i);
                            });
                        } else if(index < min_index){
                            _.range(index+1, min_index).forEach(function(i) {
                                idx_selected.push(i);
                            });
                        }
                    } else if(!(d3.event.ctrlKey)) {
                        idx_selected = [];
                    }
                    // updating the array containing the slice indexes selected
                    // and updating the style
                    idx_selected.push(index);
                }
                this.model.set("idx_selected", ((idx_selected.length === 0) ? null : idx_selected), {updated_view: this});
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
                this.selected_indices = idx_selected;
                this.apply_styles();
            }
        },
        reset_selection: function() {
            this.model.set("idx_selected", null);
            this.touch();
            this.selected_indices = null;
            this.clear_style(this.selected_style);
            this.clear_style(this.unselected_style);
            this.set_default_style();
        },
    });

    return {
        Pie: Pie,
    };
});


