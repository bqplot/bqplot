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
        var Scatter = Mark.extend({
        render: function() {
            var base_creation_promise = Scatter.__super__.render.apply(this);
            this.stroke = this.model.get("stroke");
            this.default_opacity = this.model.get("default_opacity");
            this.dot = d3.svg.symbol().type(this.model.get("marker")).size(this.model.get("default_size"));

            //container for mouse clicks
            this.el.append("rect")
              .attr("class", "mouseeventrect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", this.width)
              .attr("visibility", "hidden")
              .attr("pointer-events", "all")
              .attr("height", this.height)
              .style("pointer-events", "all")
              .on("click", $.proxy(this.click, this));

            var that = this;
            this.drag_listener = d3.behavior.drag()
              .on("dragstart", function(d) { return that.drag_start(d, this); })
              .on("drag", function(d, i) { return that.on_drag(d, i, this); })
              .on("dragend", function(d, i) { return that.drag_ended(d, i, this); });

            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");

            this.selected_indices = this.model.get("idx_selected");
            var self = this;
            return base_creation_promise.then(function() {
                self.color_scale =  self.scales["color"];
                self.size_scale = self.scales["size"];
                self.opacity_scale = self.scales["opacity"];
                // the following change handler is for the case when the colors of
                // the scale change. The positional data does not need to be changed.
                if(self.color_scale) {
                    self.color_scale.on("color_scale_range_changed", self.color_scale_updated, self);
                }
                self.create_listeners();
                self.draw();},
            null);
        },
        create_listeners: function() {
            Scatter.__super__.create_listeners.apply(this);
            this.model.on("change:default_color", this.update_default_color, this);
            this.model.on("change:stroke", this.update_stroke, this);
            this.model.on("change:default_opacity", this.update_default_opacity, this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:marker", this.update_marker, this);
            this.model.on("change:default_size", this.update_default_size, this);
            this.model.on("change:fill", this.update_fill, this);
            this.model.on("change:display_names", this.update_display_names, this);
            this.listenTo(this.model, "change:idx_selected", this.update_idx_selected);
            this.model.on("change:selected_style", this.selected_style_updated, this);
            this.model.on("change:unselected_style", this.unselected_style_updated, this);
        },
        update_default_color: function(model, new_color) {
            var that = this;
            this.el.selectAll(".dot")
              .style("fill", this.model.get("fill") ?
                     function(d) { ireturn that.get_element_color(d); } : "none")
              .style("stroke", this.stroke ?
                     this.stroke : function(d) {
                  return that.get_element_color(d);
              });

            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("fill", new_color)
                  .style("stroke", this.stroke ? this.stroke : new_color);
                this.legend_el.select("text")
                  .style("fill", this.model.get("fill") ? new_color : "none");
            }
        },
        update_fill: function(model, fill) {
            var default_color = this.model.get("default_color");
            var that = this;
            this.el.selectAll(".dot").style("fill", fill  ? function(d) {
                return that.get_element_color(d);
            } : "none");
            if (this.legend_el) {
                this.legend_el.selectAll("path")
                  .style("fill", fill  ? default_color : "none");
            }
        },
        update_stroke: function(model, fill) {
            this.stroke = this.model.get("stroke");
            var that = this;
            this.el.selectAll(".dot")
              .style("stroke", this.stroke ? this.stroke : function(d) {
                  return that.get_element_color(d);
              });
            if (this.legend_el) {
                this.legend_el.selectAll("path")
                  .style("stroke", this.stroke);
            }
        },
        update_default_opacity: function() {
            this.default_opacity = this.model.get("default_opacity");
            // update opacity scale range?
            var that = this;
            this.el.selectAll(".dot")
              .style("opacity", function(data) {
                  return that.get_element_opacity(data);
              });
            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("opacity", this.default_opacity)
                  .style("fill", this.model.get("default_color"));
            }
        },
        update_marker: function(model, marker) {
            this.dot.type(this.model.get("marker"))
            this.el.selectAll(".dot").attr("d", this.dot);
            if (this.legend_el) {
                this.legend_el.select("path").attr("d", this.dot.size(64));
            }
        },
        update_default_size: function(model, new_size) {
            // update size scale range?
            var that = this;
            this.el.selectAll(".dot").attr("d", this.dot.size(function(data) {
                return that.get_element_size(data);
            }));
        },
        // The following three functions are convenience functions to get
        // the fill color / opacity / size of an element given the data.
        // In fact they are more than convenience functions as they limit the
        // points of entry to that logic which makes it easier to manage and to
        // keep consistent across different places where we use it.
        get_element_color: function(data) {
           if(this.color_scale !== undefined && data.z !== undefined) {
              return this.color_scale.scale(data.z);
           }
           return this.model.get("default_color");
        },
        get_element_size: function(data) {
           if(this.size_scale !== undefined && data.size !== undefined) {
              return this.size_scale.scale(data.size);
           }
           return this.model.get("default_size");
        },
        get_element_opacity: function(data) {
           if(this.opacity_scale !== undefined && data.opacity !== undefined) {
              return this.opacity_scale.scale(data.opacity);
           }
           return this.model.get("default_opacity");
        },
        rescale: function() {
            Scatter.__super__.rescale.apply(this);
            this.set_ranges();
            this.el.select(".mouseeventrect")
              .attr("width", this.width)
              .attr("height", this.height);

            var that = this;

            this.el.selectAll(".dot_grp").transition().duration(this.model.get("animate_dur"))
              .attr("transform", function(d) {
                    return "translate(" + (that.x_scale.scale(d.x) + that.x_offset) +
                    "," + (that.y_scale.scale(d.y) + that.y_offset) + ")";
              });
        },
        update_array: function(d, i) {
            if (!this.model.get("restrict_y")){
                var x_data = [];
                this.model.get_typed_field("x").forEach(function(elem) {
                    x_data.push(elem);
                });
                x_data[i] = this.x_scale.scale.invert(d[0]);
                this.model.set_typed_field("x", x_data);
            }
            if (!this.model.get("restrict_x")){
                var y_data = [];
                this.model.get_typed_field("y").forEach(function(elem) {
                    y_data.push(elem);
                });
                y_data[i] = this.y_scale.scale.invert(d[1]);
                this.model.set_typed_field("y", y_data);
            }
            this.touch();
        },
        drag_start: function(d, dragged_node) {
            if (!this.model.get("enable_move")) {
                return;
            }
            this.drag_started = true
            var dot = this.dot;
            dot.size(5 * this.model.get("default_size"));

            d3.select(dragged_node)
              .select("path")
              .transition()
              .attr("d", dot)
              .style("fill", this.model.get("drag_color"))
              .style("stroke", this.model.get("drag_color"));
        },
        on_drag: function(d, i, dragged_node) {
            if(!this.drag_started){
                return;
            }
            if(!this.model.get("enable_move")) {
                return;
            }
            var that = this;

            // If restrict_x is true, then the move is restricted only to the X
            // direction.
            if (!(this.model.get("restrict_y")) && this.model.get("restrict_x")) {
                d[0] = d3.event.x;
                d[1] = that.y_scale.scale(d.y);
            }
            else if (!(this.model.get("restrict_x")) && this.model.get("restrict_y")) {
                d[0] = that.x_scale.scale(d.x);
                d[1] = d3.event.y;
            }
            else if (this.model.get("restrict_x") && this.model.get("restrict_y")) {
                return;
            }
            else  {
                d[0] = d3.event.x;
                d[1] = d3.event.y;
            }

            d3.select(dragged_node)
              .attr("transform", function() {
                  return "translate(" + d[0] + "," + d[1] + ")";
              });
            if(this.model.get("update_on_move")) {
                // saving on move if flag is set
                this.update_array(d, i);
            }
        },
        drag_ended: function(d, i, dragged_node) {
            if (!this.model.get("enable_move")) {
                return;
            }
            if(!this.drag_started) {
                return;
            }
            var dot = this.dot;
            dot.size(this.model.get("default_size"));

            var that = this;
            d3.select(dragged_node)
              .select("path")
              .transition()
              .attr("d", dot)
              .style("fill",  that.model.get("default_color"))
              .style("stroke", that.model.get("default_color"));

            this.update_array(d, i);
            this.send({event: "drag_end",
                       point: {"x": d.x, "y": d.y},
                       index: i});
        },
        selected_deleter: function() {
            d3.event.stopPropagation();
            return;
        },
        click: function() {
            if (!this.model.get("enable_add")) {
                return;
            }
            var mouse_pos = d3.mouse(this.el.node());
            var curr_pos = [mouse_pos[0], mouse_pos[1]];
            var that = this;

            //add the new point to dat
            var x_data = [];
            this.model.get_typed_field("x").forEach(function(d) {
                x_data.push(d);
            });
            var y_data = [];
            this.model.get_typed_field("y").forEach(function(d) {
                y_data.push(d);
            });
            x_data.push(this.x_scale.scale.invert(curr_pos[0]));
            y_data.push(this.y_scale.scale.invert(curr_pos[1]));
            this.model.set_typed_field("x", x_data);
            this.model.set_typed_field("y", y_data);
            this.touch();
            //adding the point and saving the model automatically triggers a
            //draw which adds the new point because the data now has a new
            //point
        },
        draw: function() {
            this.set_ranges();
            var that = this;
            var default_color = this.model.get("default_color");
            var labels = this.model.get("labels");
            var fill = this.model.get("fill");

            var elements = this.el.selectAll(".dot_grp")
              .data(this.model.mark_data, function(d) {
                  return d.name;
              });
            var elements_added = elements.enter().append("g")
              .attr("class", "dot_grp");

            var animate_dur = this.model.get("animate_dur");
            elements_added.append("path").attr("class", "dot");
            elements_added.append("text").attr("class", "dot_text");

            elements.transition().duration(animate_dur)
              .attr("transform", function(d) {
                  return "translate(" + (that.x_scale.scale(d.x) + that.x_offset) + ","
                                      + (that.y_scale.scale(d.y) + that.y_offset) + ")";
              });

            var text_loc = Math.sqrt(this.model.get("default_size")) / 2.0;
            elements.select("path")
              .attr("d", this.dot.size(function(d) {
                  return that.get_element_size(d);
              }));

            elements.call(this.drag_listener);

            var names = this.model.get_typed_field("names")
            var show_names = (this.model.get("display_names") && names.length !== 0);

            elements.select("text")
              .text(function(d) {
                  return d.name;
              }).attr("transform", function(d) {
                  return "translate(" + (text_loc) + "," + (-text_loc) + ")";
              }).attr("display", function(d) {
                  return (show_names) ? "inline": "none";
              });

            // Removed the transition on exit as it was causing issues.
            // Elements are not removed until the transition is complete and
            // hence the setting styles function doesn't behave as intended.
            // The only way to call the function after all of the elements are
            // removed is round-about and doesn't look very nice visually.
            elements.exit().remove();
            this.apply_styles(this.selected_indices);
        },
        color_scale_updated: function() {
            var that = this;
            var default_color = this.model.get("default_color");
            var fill = this.model.get("fill");

            this.el.selectAll(".dot_grp")
              .select("path")
              .style("fill", fill ?
                     function(d) { return that.get_element_color(d); } : "none")
              .style("stroke", this.stroke ?
                     this.stroke : function(d) {
                         return that.get_element_color(d);
                     });
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            this.legend_el = elem.selectAll(".legend" + this.uuid)
              .data([this.model.mark_data]);
            var default_color = this.model.get("default_color");

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            this.legend_el.enter()
              .append("g")
              .attr("class", "legend" + this.uuid)
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
              }).on("mouseover", $.proxy(this.highlight_axis, this))
              .on("mouseout", $.proxy(this.unhighlight_axis, this))
              .append("path")
              .attr("transform", function(d, i) {
                  return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
              })
              .attr("d", this.dot.size(64))
              .style("fill", this.model.get("fill")  ? default_color : "none")
              .style("stroke", this.stroke ? this.stroke : default_color);

            this.legend_el.append("text")
              .attr("class","legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) { return that.model.get("labels")[i]; })
              .style("fill", default_color);

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [1, max_length];
        },
        update_display_names: function(model, value) {
            var names = this.model.get_typed_field("names")
            var show_names = (value && names.length !== 0);
            this.el.selectAll(".dot_grp").select("text")
                .attr("display", function(d) {
                    return (show_names) ? "inline": "none";
                });
        },
        invert_2d_range: function(x_start, x_end, y_start, y_end) {
            if(x_end === undefined) {
                this.model.set("idx_selected", null);
                this.touch();
                return _.range(this.model.mark_data.length);
            }
            var xmin = this.x_scale.scale.invert(x_start),
                xmax = this.x_scale.scale.invert(x_end),
                ymin = this.y_scale.scale.invert(y_start),
                ymax = this.y_scale.scale.invert(y_end);

            var indices = _.range(this.model.mark_data.length);
            var that = this;
            var idx_selected = _.filter(indices, function(index) {
                var elem = that.model.mark_data[index];
                return (elem.x >= xmin && elem.x <= xmax &&
                        elem.y >= ymin && elem.y <= ymax);
            });
            this.model.set("idx_selected", idx_selected);
            this.touch();
            return idx_selected;
        },
        update_idx_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles(value);
        },
        set_style_on_elements: function(style, indices) {
            // If the index array is undefined or of length=0, exit the
            // function without doing anything
            if(indices === undefined || indices.length === 0) {
                return;
            }
            // Also, return if the style object itself is blank
            if(Object.keys(style).length === 0) {
                return;
            }
            var elements = this.el.selectAll(".dot");
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            elements.style(style);
        },
        set_default_style: function(indices) {
            // For all the elements with index in the list indices, the default
            // style is applied.
            if(indices === undefined || indices.length === 0) {
                return;
            }
            var elements = this.el.selectAll(".dot").filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            var fill = this.model.get("fill");
            var that = this;
            elements
              .style("fill", fill ? function(d) {
                 return that.get_element_color(d);
              } : "none")
              .style("stroke", this.stroke ? this.stroke : function(d) {
                  return that.get_element_color(d);
              }).style("opacity", function(d) {
                  return that.get_element_opacity(d);
              });
        },
        clear_style: function(style_dict, indices) {
            // Function to clear the style of a dict on some or all the elements of the
            // chart.If indices is null, clears the style on all elements. If
            // not, clears on only the elements whose indices are mathcing.
            //
            // This function is not used right now. But it can be used if we
            // decide to accomodate more properties than those set by default.
            // Because those have to cleared specifically.
            var elements = this.el.selectAll(".dot");
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
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Scatter", Scatter);
});
