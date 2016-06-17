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

define(["d3", "./Mark", "./utils", "./Markers", "underscore"],
       function(d3, MarkViewModule, utils, markers, _) {
    "use strict";

    var min_size = 10;

    var bqSymbol = markers.symbol;

    var Scatter = MarkViewModule.Mark.extend({

        render: function() {
            var base_creation_promise = Scatter.__super__.render.apply(this);

            this.dot = bqSymbol()
              .type(this.model.get("marker"))
              .size(this.model.get("default_size"))
              .skew(this.model.get("default_skew"));

            var that = this;
            this.drag_listener = d3.behavior.drag()
              .on("dragstart", function(d, i) { return that.drag_start(d, i, this); })
              .on("drag", function(d, i) { return that.on_drag(d, i, this); })
              .on("dragend", function(d, i) { return that.drag_ended(d, i, this); });

            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");
            this.selected_indices = this.model.get("selected");

            this.display_el_classes = ["dot", "legendtext"];
            this.event_metadata = {
                "mouse_over": {
                    "msg_name": "hover",
                    "lookup_data": false,
                    "hit_test": true
                },
                "legend_clicked":  {
                    "msg_name": "legend_click",
                    "hit_test": true
                },
                "element_clicked": {
                    "msg_name": "element_click",
                    "lookup_data": false,
                    "hit_test": true
                },
                "parent_clicked": {
                    "msg_name": "background_click",
                    "hit_test": false
                }
            };
            this.displayed.then(function() {
                that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
                that.create_tooltip();
            });

            return base_creation_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
                that.compute_view_padding();
                that.draw();
            });
        },

        set_ranges: function() {
            var x_scale = this.scales.x,
                y_scale = this.scales.y,
                size_scale = this.scales.size,
                opacity_scale = this.scales.opacity,
                skew_scale = this.scales.skew,
                rotation_scale = this.scales.rotation;
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            }
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            }
            if(size_scale) {
                // I don't know how to set the lower bound on the range of the
                // values that the size scale takes. I guess a reasonable
                // approximation is that the area should be proportional to the
                // value. But I also want to set a lower bound of 10px area on
                // the size. This is what I do in the step below.

                // I don't know how to handle for ordinal scale.
                var size_domain = size_scale.scale.domain();
                var ratio = d3.min(size_domain) / d3.max(size_domain);
                size_scale.set_range([d3.max([(this.model.get("default_size") * ratio), min_size]),
                                     this.model.get("default_size")]);
            }
            if(opacity_scale) {
                opacity_scale.set_range([0.2, 1]);
            }
            if(skew_scale) {
                skew_scale.set_range([0, 1]);
            }
            if(rotation_scale) {
                rotation_scale.set_range([0, 180]);
            }
        },

        set_positional_scales: function() {
            var x_scale = this.scales.x,
                y_scale = this.scales.y;
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) {
                    var animate = true;
                    this.update_xy_position(animate); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) {
                    var animate = true;
                    this.update_xy_position(animate);
                }
            });
        },

        initialize_additional_scales: function() {
            // function to create the additional scales and create the
            // listeners for the additional scales
            var color_scale = this.scales.color,
                size_scale = this.scales.size,
                opacity_scale = this.scales.opacity,
                skew_scale = this.scales.skew,
                rotation_scale = this.scales.rotation;
            // the following handlers are for changes in data that does not
            // impact the position of the elements
            if (color_scale) {
                this.listenTo(color_scale, "domain_changed", function() {
                    var animate = true;
                    this.color_scale_updated(animate);
                });
                color_scale.on("color_scale_range_changed",
                                this.color_scale_updated, this);
            }
            if (size_scale) {
                this.listenTo(size_scale, "domain_changed", function() {
                    var animate = true;
                    this.update_default_size(animate);
                });
            }
            if (opacity_scale) {
                this.listenTo(opacity_scale, "domain_changed", function() {
                    var animate = true;
                    this.update_default_opacities(animate);
                });
            }
            if (skew_scale) {
                this.listenTo(skew_scale, "domain_changed", function() {
                    var animate = true;
                    this.update_default_skew(animate);
                });
            }
            if (rotation_scale) {
                this.listenTo(rotation_scale, "domain_changed", function() {
                    var animate = true;
                    this.update_xy_position(animate);
                });
            }
        },

        create_listeners: function() {
            Scatter.__super__.create_listeners.apply(this);
            this.el.on("mouseover", _.bind(function() {
                  this.event_dispatcher("mouse_over");
              }, this))
              .on("mousemove", _.bind(function() {
                  this.event_dispatcher("mouse_move");
              }, this))
              .on("mouseout", _.bind(function() {
                  this.event_dispatcher("mouse_out");
              }, this));

            this.listenTo(this.model, "change:default_colors", this.update_default_colors, this);
            this.listenTo(this.model, "change:stroke", this.update_stroke, this);
            this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
            this.listenTo(this.model, "change:default_opacities", this.update_default_opacities, this);
            this.listenTo(this.model, "change:default_skew", this.update_default_skew, this);
            this.listenTo(this.model, "change:default_rotation", this.update_xy_position, this);
            this.listenTo(this.model, "data_updated", function() {
                //animate dots on data update
                var animate = true;
                this.draw(animate);
            }, this);
            this.listenTo(this.model, "change:marker", this.update_marker, this);
            this.listenTo(this.model, "change:default_size", this.update_default_size, this);
            this.listenTo(this.model, "change:fill", this.update_fill, this);
            this.listenTo(this.model, "change:display_names", this.update_display_names, this);
            this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);
            this.listenTo(this.model, "change:enable_hover", function() { this.hide_tooltip(); }, this);
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.model, "change:enable_move", this.set_drag_behavior);
            this.listenTo(this.model, "change:selected", this.update_selected);
            this.listenTo(this.parent, "bg_clicked", function() {
                this.event_dispatcher("parent_clicked");
            });
        },

        update_default_colors: function(model, new_colors) {
            if(!this.model.dirty) {
                var that = this,
                    stroke = this.model.get("stroke"),
                    len = new_colors.length;
                this.el.selectAll(".dot")
                .style("fill", this.model.get("fill") ?
                    function(d, i) {
                        return that.get_element_color(d, i);
                    } : "none")
                .style("stroke", stroke ? stroke : function(d, i) {
                    return that.get_element_color(d, i);
                });

                if (this.legend_el) {
                    this.legend_el.select("path")
                    .style("fill", function(d, i) {
                        return new_colors[i % len];
                    })
                    .style("stroke", stroke ? stroke : function(d, i) {
                            return new_colors[i % len];
                        }
                    );
                    this.legend_el.select("text")
                    .style("fill", this.model.get("fill") ? function(d, i) {
                        return new_colors[i % len];
                    } : "none");
                }
            }
        },

        update_fill: function(model, fill) {
            var that = this,
                default_colors = this.model.get("default_colors"),
                len = default_colors.length;
            this.el.selectAll(".dot").style("fill", fill  ? function(d, i) {
                return that.get_element_color(d, i);
            } : "none");
            if (this.legend_el) {
                this.legend_el.selectAll("path")
                    .style("fill", fill  ? function(d, i) {
                        return default_colors[i % len];
                    } : "none");
            }
        },

        update_stroke_width: function() {
            var stroke_width = this.model.get("stroke_width");

            this.el.selectAll(".dot")
              .style("stroke-width", stroke_width);

            if (this.legend_el) {
                this.legend_el.selectAll("path")
                  .style("stroke-width", stroke_width);
            }
        },

        update_stroke: function(model, fill) {
            var that = this,
                stroke = this.model.get("stroke");
            this.el.selectAll(".dot")
                .style("stroke", stroke ? stroke : function(d, i) {
                    return that.get_element_color(d, i);
                });

            if (this.legend_el) {
                this.legend_el.selectAll("path")
                    .style("stroke", stroke);
            }
        },

        update_default_opacities: function(animate) {
            if (!this.model.dirty) {
                var default_opacities = this.model.get("default_opacities");
                var default_colors = this.model.get("default_colors");
                var len = default_colors.length;
                var len_opac = default_opacities.length;
                var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

                // update opacity scale range?
                var that = this;
                this.el.selectAll(".dot")
                    .transition()
                    .duration(animation_duration)
                    .style("opacity", function(d, i) {
                        return that.get_element_opacity(d, i);
                    });
                if (this.legend_el) {
                    this.legend_el.select("path")
                    .style("opacity", function(d, i) {
                        return default_opacities[i % len_opac];
                    })
                    .style("fill", function(d, i) {
                        return default_colors[i % len];
                    });
                }
            }
        },

        update_marker: function(model, marker) {
            if (!this.model.dirty) {
                this.el.selectAll(".dot")
                    .transition()
                    .duration(this.parent.model.get("animation_duration"))
                    .attr("d", this.dot.type(marker));
                this.legend_el.select("path")
                    .attr("d", this.dot.type(marker));
            }
        },

        update_default_skew: function(animate) {
            if (!this.model.dirty) {
                var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
                var that = this;
                this.el.selectAll(".dot")
                    .transition()
                    .duration(animation_duration)
                    .attr("d", this.dot.skew(function(d) {
                        return that.get_element_skew(d);
                    }));
            }
        },
        update_default_size: function(animate) {
            this.compute_view_padding();
            // update size scale range?
            if (!this.model.dirty) {
                var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
                var that = this;
                this.el.selectAll(".dot")
                    .transition()
                    .duration(animation_duration)
                    .attr("d", this.dot.size(function(d) {
                        return that.get_element_size(d);
                    }));
            }
        },

        // The following three functions are convenience functions to get
        // the fill color / opacity / size of an element given the data.
        // In fact they are more than convenience functions as they limit the
        // points of entry to that logic which makes it easier to manage and to
        // keep consistent across different places where we use it.
        get_element_color: function(data, index) {
            var color_scale = this.scales.color;
            var default_colors = this.model.get("default_colors");
            var len = default_colors.length;
            if(color_scale && data.color !== undefined && data.color !== null) {
                return color_scale.scale(data.color);
            }
            return default_colors[index % len];
        },

        get_element_size: function(data) {
            var size_scale = this.scales.size;
            if(size_scale && data.size !== undefined) {
                return size_scale.scale(data.size);
            }
            return this.model.get("default_size");
        },

        get_element_opacity: function(data, index) {
            var opacity_scale = this.scales.opacity;
            var default_opacities = this.model.get("default_opacities");
            var len = default_opacities.length;
            if(opacity_scale && data.opacity !== undefined) {
                return opacity_scale.scale(data.opacity);
            }
            return default_opacities[index % len];
        },

        get_element_skew: function(data) {
            var skew_scale = this.scales.skew;
            if(skew_scale && data.skew !== undefined) {
                return skew_scale.scale(data.skew);
            }
            return this.model.get("default_skew");
        },

        get_element_rotation: function(d) {
            var rotation_scale = this.scales.rotation;
            return (!rotation_scale || !d.rotation) ? "" :
                "rotate(" + rotation_scale.scale(d.rotation) + ")";
        },

        color_scale_updated: function(animate) {
            var that = this,
                fill = this.model.get("fill"),
                stroke = this.model.get("stroke");
                var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            this.el.selectAll(".dot_grp")
              .select("path")
              .transition()
              .duration(animation_duration)
              .style("fill", fill ?
                  function(d, i) {
                      return that.get_element_color(d, i);
                  } : "none")
              .style("stroke", stroke ? stroke : function(d, i) {
                      return that.get_element_color(d, i);
                  });
        },

        relayout: function() {
            this.set_ranges();
            this.update_xy_position();
        },

        update_xy_position: function(animate) {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            var that = this;
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            this.el.selectAll(".dot_grp").transition()
                .duration(animation_duration)
                .attr("transform", function(d) {
                    return "translate(" + (x_scale.scale(d.x) + x_scale.offset) +
                                    "," + (y_scale.scale(d.y) + y_scale.offset) + ")" +
                           that.get_element_rotation(d);
                });
            this.x_pixels = this.model.mark_data.map(function(el) { return x_scale.scale(el.x) + x_scale.offset; });
            this.y_pixels = this.model.mark_data.map(function(el) { return y_scale.scale(el.y) + y_scale.offset; });
        },

        draw: function(animate) {
            this.set_ranges();
            var x_scale = this.scales.x, y_scale = this.scales.y;
            var that = this,
                fill = this.model.get("fill");

            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            var elements = this.el.selectAll(".dot_grp")
                .data(this.model.mark_data, function(d) { return d.unique_id; });
            var elements_added = elements.enter().append("g")
                .attr("class", "dot_grp")
                .attr("transform", function(d) {
                    return "translate(" + (x_scale.scale(d.x) + x_scale.offset) +
                                    "," + (y_scale.scale(d.y) + y_scale.offset) + ")" +
                           that.get_element_rotation(d);
                });

            elements_added.append("path").attr("class", "dot");
            elements_added.append("text").attr("class", "dot_text");
            elements.select("path").transition()
                .duration(animation_duration)
                .attr("d", this.dot
                    .size(function(d) { return that.get_element_size(d); })
                    .skew(function(d) { return that.get_element_skew(d); }));
            this.update_xy_position(animate);

            this.set_drag_behavior();
            elements.on("click", _.bind(function(d, i) {
                this.event_dispatcher("element_clicked",
				      {"data": d, "index": i});
            }, this));

            var names = this.model.get_typed_field("names"),
                text_loc = Math.sqrt(this.model.get("default_size")) / 2.0,
                show_names = (this.model.get("display_names") && names.length !== 0);

            elements.select("text")
                .text(function(d) { return d.name; })
                .attr("transform", function(d) {
                    return "translate(" + (text_loc) + "," + (-text_loc) + ")";})
                .attr("display", function(d) { return (show_names) ? "inline": "none"; });

            // Removed the transition on exit as it was causing issues.
            // Elements are not removed until the transition is complete and
            // hence the setting styles function doesn't behave as intended.
            // The only way to call the function after all of the elements are
            // removed is round-about and doesn't look very nice visually.
            elements.exit().remove();
            this.apply_styles();
        },

        process_interactions: function() {
            var interactions = this.model.get("interactions");
            if(_.isEmpty(interactions)) {
                //set all the event listeners to blank functions
                this.reset_interactions();
            }
            else {
                if(interactions.click !== undefined &&
                  interactions.click !== null) {
                    if(interactions.click === "tooltip") {
                        this.event_listeners.element_clicked = function() {
                            return this.refresh_tooltip(true);
                        };
                        this.event_listeners.parent_clicked = this.hide_tooltip;
                    } else if (interactions.click === "add") {
                        this.event_listeners.parent_clicked = this.add_element;
                        this.event_listeners.element_clicked = function() {};
                    }
		    else if (interactions.click == 'select') {
       		        this.event_listeners.parent_clicked = this.reset_selection;
			this.event_listeners.element_clicked = this.scatter_click_handler;
		    }
                } else {
                    this.reset_click();
                }
                if(interactions.hover !== undefined &&
                  interactions.hover !== null) {
                    if(interactions.hover === "tooltip") {
                        this.event_listeners.mouse_over = this.refresh_tooltip;
                        this.event_listeners.mouse_move = this.show_tooltip;
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

        reset_selection: function() {
            this.model.set("selected", null);
            this.selected_indices = null;
            this.touch();
        },

	scatter_click_handler: function(args) {
            var data = args.data;
            var index = args.index;
            var that = this;
            var idx = this.model.get("selected");
            var selected = idx ? utils.deepCopy(idx) : [];
            // index of bar i. Checking if it is already present in the list.
            var elem_index = selected.indexOf(index);
            // Replacement for "Accel" modifier.
            var accelKey = d3.event.ctrlKey || d3.event.metaKey;

	    if(elem_index > -1 && accelKey) {
                // if the index is already selected and if accel key is
                // pressed, remove the element from the list
                selected.splice(elem_index, 1);
            } else {
		if(accelKey) {
                    //If accel is pressed and the bar is not already selcted
                    //add the bar to the list of selected bars.
                    selected.push(index);
                }
                // updating the array containing the bar indexes selected
                // and updating the style
                else {
                    //if accel is not pressed, then clear the selected ones
                    //and set the current element to the selected
                    selected = [];
                    selected.push(index);
                }
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
	},
	

        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            this.legend_el = elem.selectAll(".legend" + this.uuid)
              .data([this.model.mark_data[0]]);
            var default_colors = this.model.get("default_colors"),
                len = default_colors.length,
                stroke = this.model.get("stroke");

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            var el_added = this.legend_el.enter()
              .append("g")
                .attr("class", "legend" + this.uuid)
                .attr("transform", function(d, i) {
                    return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
                })
                .on("mouseover", _.bind(function() {
                   this.event_dispatcher("legend_mouse_over");
                }, this))
                .on("mouseout", _.bind(function() {
                   this.event_dispatcher("legend_mouse_out");
                }, this))
                .on("click", _.bind(function() {
                    this.event_dispatcher("legend_clicked");
                }, this));
            el_added.append("path")
              .attr("transform", function(d, i) {
                  return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
              })
              .attr("d", this.dot.size(64))
              .style("fill", this.model.get("fill")  ?
                     function(d, i) {
                        return default_colors[i % len];
                    } : "none")
              .style("stroke", stroke ? stroke :
                     function(d, i)
                     {
                         return default_colors[i % len];
                     }
              );

            this.legend_el.append("text")
              .attr("class","legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) {
                  return that.model.get("labels")[i];
              })
              .style("fill", function(d, i) {
                  return default_colors[i % len];
              });

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [1, max_length];
        },

        update_display_names: function(model, value) {
            var names = this.model.get_typed_field("names"),
                show_names = (value && names.length !== 0);
            this.el.selectAll(".dot_grp").select("text")
                .attr("display", function(d) {
                    return (show_names) ? "inline": "none";
                });
        },

        invert_point: function(pixel) {
            if(pixel === undefined) {
                this.model.set("selected", null);
                this.touch();
                return;
            }

            var x_scale = this.scales.x;
            var abs_diff = this.x_pixels.map(function(elem) { return Math.abs(elem - pixel); });
            var sel_index = abs_diff.indexOf(d3.min(abs_diff));

            this.model.set("selected", [sel_index]);
            this.touch();
        },

        invert_range: function(start_pxl, end_pxl) {
            if(start_pxl === undefined || end_pxl === undefined) {
                this.model.set("selected", null);
                this.touch();
                return [];
            }

            var x_scale = this.scales.x;
            var that = this;
            var indices = _.range(this.model.mark_data.length);

            var selected = _.filter(indices, function(index) {
                var elem = that.x_pixels[index];
                return (elem >= start_pxl && elem <= end_pxl);
            });
            this.model.set("selected", selected);
            this.touch();
        },

        invert_2d_range: function(x_start, x_end, y_start, y_end) {
            //y_start is usually greater than y_end as the y_scale is invert
            //by default
            if(!x_end) {
                this.model.set("selected", null);
                this.touch();
                return _.range(this.model.mark_data.length);
            }
            var x_scale = this.scales.x, y_scale = this.scales.y;

            var indices = _.range(this.model.mark_data.length);
            var that = this;
            var selected = _.filter(indices, function(index) {
                var elem_x = that.x_pixels[index],
                    elem_y = that.y_pixels[index];
                return (elem_x >= x_start && elem_x <= x_end &&
                        elem_y <= y_start && elem_y >= y_end);
            });
            this.model.set("selected", selected);
            this.touch();
            return selected;
        },

        update_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles();
        },

        set_style_on_elements: function(style, indices) {
            // If the index array is undefined or of length=0, exit the
            // function without doing anything
            if(!indices || indices.length === 0) {
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
            if(!indices || indices.length === 0) {
                return;
            }
            var elements = this.el.selectAll(".dot").filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            var fill = this.model.get("fill"),
                stroke = this.model.get("stroke"),
                stroke_width = this.model.get("stroke_width"),
                that = this;
            elements
              .style("fill", fill ? function(d, i) {
                 return that.get_element_color(d, i);
              } : "none")
              .style("stroke", stroke ? stroke : function(d, i) {
                  return that.get_element_color(d, i);
              }).style("opacity", function(d, i) {
                  return that.get_element_opacity(d, i);
              }).style("stroke-width", stroke_width);
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

        compute_view_padding: function() {
            //This function computes the padding along the x and y directions.
            //The value is in pixels.
            var x_padding = Math.sqrt(this.model.get("default_size")) / 2 + 1.0;

            if(x_padding !== this.x_padding || x_padding !== this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = x_padding;
                this.trigger("mark_padding_updated");
            }
        },

        update_selected_in_lasso: function(lasso_name, lasso_vertices,
                                           point_in_lasso_func)
        {
            var x_scale = this.scales.x, y_scale = this.scales.y,
                idx = this.model.get("selected"),
                selected = idx ? utils.deepCopy(idx) : [],
                data_in_lasso = false;
            if(lasso_vertices !== null && lasso_vertices.length > 0) {
                var indices = _.range(this.model.mark_data.length);
                var that = this;
                var idx_in_lasso = _.filter(indices, function(index) {
                    var elem = that.model.mark_data[index];
                    var point = [x_scale.scale(elem.x), y_scale.scale(elem.y)];
                    return point_in_lasso_func(point, lasso_vertices);
                });
                data_in_lasso = idx_in_lasso.length > 0;
                if (data_in_lasso) {
                    this.update_selected(idx_in_lasso);
                    selected.push({lasso_name: lasso_name, indices: idx_in_lasso});
                    this.model.set("selected", selected);
                    this.touch();
                }
            } else { //delete the lasso specific selected
                var to_be_deleted_lasso = _.filter(selected, function(lasso_data) {
                    return lasso_data.lasso_name === lasso_name;
                });
                this.update_selected(to_be_deleted_lasso.indices);

                this.model.set("selected", _.filter(selected, function(lasso_data) {
                    return lasso_data.lasso_name !== lasso_name;
                }));
                this.touch();
            }

            //return true if there are any mark data inside lasso
            return data_in_lasso;
        },

        update_array: function(d, i) {
            var x_scale = this.scales.x,
                y_scale = this.scales.y;

            if (!this.model.get("restrict_y")){
                var x_data = [];
                this.model.get_typed_field("x").forEach(function(elem) {
                    x_data.push(elem);
                });
                x_data[i] = x_scale.scale.invert(d[0]);
                this.model.set_typed_field("x", x_data);
            }
            if (!this.model.get("restrict_x")){
                var y_data = [];
                this.model.get_typed_field("y").forEach(function(elem) {
                    y_data.push(elem);
                });
                y_data[i] = y_scale.scale.invert(d[1]);
                this.model.set_typed_field("y", y_data);
            }
            this.touch();
        },

        set_drag_behavior: function() {
            var elements = this.el.selectAll(".dot_grp");
            if (this.model.get("enable_move")) {
                elements.call(this.drag_listener);
            }
            else { 
                elements.on(".drag", null); 
            }
        },
        
        drag_start: function(d, i, dragged_node) {
            // d[0] and d[1] will contain the previous position (in pixels)
            // of the dragged point, for the length of the drag event
            var x_scale = this.scales.x, y_scale = this.scales.y;
            d[0] = x_scale.scale(d.x) + x_scale.offset;
            d[1] = y_scale.scale(d.y) + y_scale.offset;

            d3.select(dragged_node)
              .select("path")
              .classed("drag_scatter", true)
              .transition()
              .attr("d", this.dot.size(5 * this.model.get("default_size")));

            var drag_color = this.model.get("drag_color");
            if (drag_color) {
                d3.select(dragged_node)
                  .select("path")
                  .style("fill", drag_color)
                  .style("stroke", drag_color);
            }
            this.send({
                event: "drag_start",
                point: {x : d.x, y: d.y},
                index: i
            });
        },

        on_drag: function(d, i, dragged_node) {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            // If restrict_x is true, then the move is restricted only to the X
            // direction.
            var restrict_x = this.model.get("restrict_x"),
                restrict_y = this.model.get("restrict_y");
            if (restrict_x && restrict_y) { return; }
            if (!restrict_x) { d[0] = d3.event.x; }
            if (!restrict_y) { d[1] = d3.event.y; }

            d3.select(dragged_node)
              .attr("transform", function() {
                  return "translate(" + d[0] + "," + d[1] + ")";
              });
            this.send({
                event: "drag",
                origin: {x: d.x, y: d.y},
		        point: {x: x_scale.invert(d[0]), 
                        y: y_scale.invert(d[1])},
                index: i
            });
            if(this.model.get("update_on_move")) {
                // saving on move if flag is set
                this.update_array(d, i);
            }
        },

        drag_ended: function(d, i, dragged_node) {
            var stroke = this.model.get("stroke"),
                original_color = this.get_element_color(d, i),
                x_scale = this.scales.x,
                y_scale = this.scales.y;

            d3.select(dragged_node)
              .select("path")
              .classed("drag_scatter", false)
              .transition()
              .attr("d", this.dot.size(this.get_element_size(d)));

            if (this.model.get("drag_color")) {
                d3.select(dragged_node)
                  .select("path")
                  .style("fill", original_color)
                  .style("stroke", stroke ? stroke : original_color)
            }
            this.update_array(d, i);
            this.send({
                event: "drag_end",
                point: {x: x_scale.invert(d[0]), 
                        y: y_scale.invert(d[1])},
                index: i
            });
        },

        selected_deleter: function() {
            d3.event.stopPropagation();
            return;
        },

        add_element: function() {
            var mouse_pos = d3.mouse(this.el.node());
            var curr_pos = [mouse_pos[0], mouse_pos[1]];

            var x_scale = this.scales.x, y_scale = this.scales.y;
            //add the new point to data
            var x_data = [];
            this.model.get_typed_field("x").forEach(function(d) {
                x_data.push(d);
            });
            var y_data = [];
            this.model.get_typed_field("y").forEach(function(d) {
                y_data.push(d);
            });
            x_data.push(x_scale.scale.invert(curr_pos[0]));
            y_data.push(y_scale.scale.invert(curr_pos[1]));
            this.model.set_typed_field("x", x_data);
            this.model.set_typed_field("y", y_data);
            this.touch();
            //adding the point and saving the model automatically triggers a
            //draw which adds the new point because the data now has a new
            //point
        },
    });

    return {
        Scatter: Scatter,
    };
});
