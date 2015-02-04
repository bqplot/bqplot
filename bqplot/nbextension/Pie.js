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

define(["widgets/js/manager", "d3", "./Mark"], function(WidgetManager, d3, mark) {
    var Mark = mark[0];
    var Pie = Mark.extend({
        render: function() {
            this.padding = this.model.get("padding");
            var base_creation_promise = Pie.__super__.render.apply(this);
            this.selected_indices = this.model.get("idx_selected");
            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");

            this.el.append("rect")
                .attr("class", "mouseeventrect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.parent.plotarea_width)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .attr("height", this.parent.plotarea_height)
                .style("pointer-events", "all")
                .on("click", _.bind(this.reset_selection, this));

            var self = this;
            return base_creation_promise.then(function() {
                self.create_listeners();
                self.draw();
            }, null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.get_padded_xrange(x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.get_padded_yrange(y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            // If no scale for "x" or "y" is specified, figure scales are used.
            this.x_scale = this.scales["x"] ? this.scales["x"] : this.parent.scale_x;
            this.y_scale = this.scales["y"] ? this.scales["y"] : this.parent.scale_y;

            var that = this;
            this.listenTo(this.x_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
            this.listenTo(this.y_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            Pie.__super__.create_listeners.apply(this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("colors_updated", this.update_colors, this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
            this.model.on_some_change(["x", "y"], this.position_center, this);
            this.model.on_some_change(["inner_radius", "radius"], this.update_radii, this);
            this.model.on_some_change(["start_angle", "end_angle"], this.draw, this);
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
            var x = (this.x_scale.model.type === "date") ?
                this.model.get_date_elem("x") : this.model.get("x");
            var y = (this.y_scale.model.type === "date") ?
                this.model.get_date_elem("y") : this.model.get("y");
            var transform = "translate(" + this.x_scale.scale(x)
                                      + ", " + this.y_scale.scale(y) + ")";
            this.el.select(".pielayout")
                .attr("transform", transform);
        },
        update_radii: function() {
            var arc = d3.svg.arc()
                .outerRadius(this.model.get("radius"))
                .innerRadius(this.model.get("inner_radius"));

            this.el.select(".pielayout").selectAll(".slice").select("path")
                .transition().duration(this.model.get("animate_dur"))
                .attr("d", arc);
        },
        draw: function() {
            this.set_ranges();
            this.el.selectAll(".pielayout").remove();
            var layout = this.el.append("g")
                .attr("class", "pielayout");
            this.position_center();

            var pie = d3.layout.pie()
                .sort(null)
                .startAngle(this.model.get("start_angle")*2*Math.PI/360)
                .endAngle(this.model.get("end_angle")*2*Math.PI/360)
                .value(function(d) { return d.size; });

            var arcs = layout.selectAll(".slice")
                .data(pie(this.model.mark_data))
               .enter().append("g")
                .attr("class", "slice");

            var that = this;
            arcs.append("path")

            this.update_radii();
            var colors = this.model.get("colors");
            this.apply_styles();
        },
            /*bar_groups.enter()
              .append("g")
              .attr("class", "bargroup")
              .on("click", function(d, i) {
                  return that.bar_click_handler(d, i);
              });
            bar_groups.exit().remove();

            var bars_sel = bar_groups.selectAll(".bar")
              .data(function(d) { return d.values; })
            bars_sel.enter()
              .append("rect")
              .attr("class", "bar");
            this.draw_bars();
            this.apply_styles();*/
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
            /*//legend color update
            if(this.legend_el) {
                this.legend_el.selectAll(".legendrect")
                    .style("fill", function(d, i) {
                    return (d.color && that.color_scale) ?
                        that.color_scale.scale(d.color) : that.get_colors(i);
                });
                this.legend_el.selectAll(".legendtext")
                    .style("fill", function(d, i) {
                    return (d.color !== undefined && that.color_scale !== undefined) ?
                        that.color_scale.scale(d.color) : that.get_colors(i);
                });
            }*/
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            if(!(this.model.is_y_2d) &&
               (this.model.get("colors").length !== 1 &&
                this.model.get("color_mode") !== "element")) {
                return [0, 0];
            }

            this.legend_el = elem.selectAll(".legend" + this.uuid)
                .data(this.model.mark_data[0].values);

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            this.legend_el.enter()
              .append("g")
              .attr("class", "legend" + this.uuid)
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
              }).on("mouseover", _.bind(this.highlight_axes, this))
              .on("mouseout", _.bind(this.unhighlight_axes, this))
              .append("rect")
              .classed("legendrect", true)
              .style("fill", function(d, i) {
                  return (d.color !== undefined && that.color_scale !== undefined) ?
                      that.color_scale.scale(d.color) : that.get_colors(i);
              }).attr({x: 0, y: 0, width: rect_dim, height: rect_dim});

            this.legend_el.append("text")
             .attr("class","legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) { return that.model.get("labels")[i]; })
              .style("fill", function(d, i) {
                  return (d.color !== undefined && that.color_scale !== undefined) ?
                      that.color_scale.scale(d.color) : that.get_colors(i);
              });

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [this.model.mark_data[0].values.length, max_length];
        },
        clear_style: function(style_dict, indices) {
            // Function to clear the style of a dict on some or all the elements of the
            // chart. If indices is null, clears the style on all elements. If
            // not, clears on only the elements whose indices are mathcing.
            //
            // This function is not used right now. But it can be used if we
            // decide to accomodate more properties than those set by default.
            // Because those have to cleared specifically.
            var elements = this.el.select(".pielayout").selectAll(".slice")
            if(indices !== undefined) {
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
            // Also, return if the style object itself is blank
            if(Object.keys(style).length === 0) {
                return;
            }
            var elements = this.el.select(".pielayout").selectAll(".slice")
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
        bar_click_handler: function (data, index) {
            var that = this;
            if(this.model.get("select_bars")) {
                var idx_selected = jQuery.extend(true, [], this.model.get("idx_selected"));
                var elem_index = idx_selected.indexOf(index);
                // index of bar i. Checking if it is already present in the
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
                        //bar which has been clicked
                        min_index = (idx_selected.length !== 0) ?
                            d3.min(idx_selected) : -1;
                        max_index = (idx_selected.length !== 0) ?
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
                    // updating the array containing the bar indexes selected
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
                this.apply_styles(this.selected_indices);
            }
        },
        reset_selection: function() {
            if(this.model.get("select_slices")) {
                this.model.set("idx_selected", null);
                this.touch();
                this.selected_indices = null;
                this.clear_style(this.selected_style);
                this.clear_style(this.unselected_style);
                this.set_default_style();
            }

        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Pie", Pie);
});


