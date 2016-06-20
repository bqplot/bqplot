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

    var bqSymbol = markers.symbol;

    var Lines = MarkViewModule.Mark.extend({

        render: function() {
            var base_render_promise = Lines.__super__.render.apply(this);
            var that = this;
            this.dot = bqSymbol().size(this.model.get("marker_size"));
            if (this.model.get("marker")) {
                this.dot.type(this.model.get("marker"))
            }

            // TODO: create_listeners is put inside the promise success handler
            // because some of the functions depend on child scales being
            // created. Make sure none of the event handler functions make that
            // assumption.
            this.displayed.then(function() {
                that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
                that.create_tooltip();
            });

            this.display_el_classes = ["line", "legendtext"];
            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
                that.compute_view_padding();
                that.draw();
            });
        },

        set_ranges: function() {
            var x_scale = this.scales.x;
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            }
            var y_scale = this.scales.y;
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            }
        },

        set_positional_scales: function() {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.update_line_xy(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.update_line_xy(); }
            });
        },

        initialize_additional_scales: function() {
            var color_scale = this.scales.color;
            if(color_scale) {
                this.listenTo(color_scale, "domain_changed", function() {
                    this.update_style();
                });
                color_scale.on("color_scale_range_changed", this.update_style, this);
            }
        },

        create_listeners: function() {
            Lines.__super__.create_listeners.apply(this);
            this.el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
                .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move");}, this))
                .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out");}, this));

            this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);

            // FIXME: multiple calls to update_path_style. Use on_some_change.
            this.listenTo(this.model, "change:interpolation", this.update_path_style, this);
            this.listenTo(this.model, "change:close_path", this.update_path_style, this);

            // FIXME: multiple calls to update_style. Use on_some_change.
            this.listenTo(this.model, "change:colors", this.update_style, this);
            this.listenTo(this.model, "change:opacities", this.update_style, this);
            this.listenTo(this.model, "change:fill_opacities", this.update_style, this);
            this.listenTo(this.model, "change:fill_colors", this.update_style, this);

            this.listenTo(this.model, "change:fill", this.update_fill, this);

            this.listenTo(this.model, "data_updated", function() {
                var animate = true;
                this.draw(animate);
            }, this);
            this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
            this.listenTo(this.model, "change:labels_visibility", this.update_legend_labels, this);
            this.listenTo(this.model, "change:curves_subset", this.update_curves_subset, this);
            this.listenTo(this.model, "change:line_style", this.update_line_style, this);
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.parent, "bg_clicked", function() {
                this.event_dispatcher("parent_clicked");
            });

            this.listenTo(this.model, "change:marker", this.update_marker, this);
            this.listenTo(this.model, "change:marker_size", this.update_marker_size, this);
        },

        update_legend_labels: function() {
            if(this.model.get("labels_visibility") === "none") {
                this.el.selectAll(".legend")
                  .attr("display", "none");
                this.el.selectAll(".curve_label")
                  .attr("display", "none");
            } else if(this.model.get("labels_visibility") === "label") {
                this.el.selectAll(".legend")
                  .attr("display", "none");
                this.el.selectAll(".curve_label")
                  .attr("display", "inline");
            } else {
                this.el.selectAll(".legend")
                  .attr("display", "inline");
                this.el.selectAll(".curve_label")
                  .attr("display", "none");
            }
        },

        get_line_style: function() {
            switch (this.model.get("line_style")) {
                case "solid":
                    return "none";
                case "dashed":
                    return "10,10";
                case "dotted":
                    return "2,10";
                case "dash_dotted":
                    return "10,5,2,5";
            }
        },

        // Updating the style of the curve, stroke, colors, dashed etc...
        // Could be fused in a single function for increased readability
        // and to avoid code repetition
        update_line_style: function() {
            this.el.selectAll(".curve").select(".line")
              .style("stroke-dasharray", _.bind(this.get_line_style, this));
            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("stroke-dasharray", _.bind(this.get_line_style, this));
            }
        },

        update_stroke_width: function(model, stroke_width) {
            this.compute_view_padding();
            this.el.selectAll(".curve").select(".line")
              .style("stroke-width", stroke_width);
            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("stroke-width", stroke_width);
            }
        },

        update_style: function() {
            var that = this,
                fill = this.model.get("fill"),
                fill_color = this.model.get("fill_colors"),
                opacities = this.model.get("opacities"),
                fill_opacities = this.model.get("fill_opacities");
            // update curve colors
            var curves = this.el.selectAll(".curve")
            curves.select(".line")
                .style("opacity", function(d, i) { return opacities[i]; })
                .style("stroke", function(d, i) { 
                    return that.get_element_color(d, i) || fill_color[i]; 
                })
                .style("fill", function(d, i) {
                    return fill === "inside" ? that.get_fill_color(d, i) : ""; 
                });
            curves.select(".area")
                .style("fill", function(d, i) { return that.get_fill_color(d, i); })
                .style("opacity", function(d, i) { return fill_opacities[i]; });
            this.update_marker_style();
            // update legend style
            if (this.legend_el){
                this.legend_el.select(".line")
                    .style("stroke", function(d, i) {
                        return that.get_element_color(d, i) || fill_color[i];
                    })
                    .style("opacity", function(d, i) { return opacities[i]; })
                    .style("fill", function(d, i) {
                        return that.model.get("fill") === "none" ?
                            "" : that.get_fill_color(d, i);
                    })
                this.legend_el.select(".dot")
                    .style("stroke", function(d, i) {
                        return that.get_element_color(d, i) || fill_color[i];
                    })
                    .style("opacity", function(d, i) { return opacities[i]; })
                    .style("fill", function(d, i) {
                        return that.get_element_color(d, i) || fill_color[i];
                    });
                this.legend_el.select("text")
                  .style("fill", function(d, i) {
                      return that.get_element_color(d, i) || fill_color[i];
                  })
                  .style("opacity", function(d, i) {
                      return opacities[i];
                  });
            }
            this.update_stroke_width(this.model, this.model.get("stroke_width"));
            this.update_line_style();
        },

        path_closure: function() {
            return this.model.get("close_path") ? "Z" : "";
        },

        update_path_style: function() {
            var interpolation = this.model.get("interpolation");
            this.line.interpolate(interpolation);
            this.area.interpolate(interpolation);
            var that = this;
            this.el.selectAll(".curve").selectAll("path")
              .attr("d", function(d) {
                  return that.line(d.values) + that.path_closure();
              });
            this.el.selectAll(".curve").select(".area")
              .transition().duration(0) //FIXME
              .attr("d", function(d) { return that.area(d.values); });
            if (this.legend_el) {
                this.legend_line.interpolate(interpolation);
                this.legend_el.selectAll("path")
                  .attr("d", this.legend_line(this.legend_path_data) + this.path_closure());
            }
        },

        relayout: function() {
            this.set_ranges();
            this.update_line_xy();
            this.create_labels();
        },

        invert_range: function(start_pxl, end_pxl) {
            if(start_pxl === undefined || end_pxl === undefined) {
                this.model.set("selected", null);
                this.touch();
                return [];
            }
            var x_scale = this.scales.x;

            var indices = _.range(this.x_pixels.length);
            var that = this;
            var selected = _.filter(indices, function(index) {
                var elem = that.x_pixels[index];
                return (elem >= start_pxl && elem <= end_pxl);
            });
            this.model.set("selected", selected);
            this.touch();
        },

        invert_point: function(pixel) {
            if(pixel === undefined) {
                this.model.set("selected", null);
                this.touch();
                return;
            }

            var x_scale = this.scales.x;
            var index = Math.min(this.bisect(this.x_pixels, pixel),
              Math.max((this.x_pixels.length - 1), 0));
            this.model.set("selected", [index]);
            this.touch();
        },

        update_multi_range: function(brush_extent) {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            var x_start = brush_extent[0];
            var x_end = brush_extent[1];

            var data = this.model.x_data[0] instanceof Array ?
                this.model.x_data[0] : this.model.x_data;
            var idx_start = this.bisect(data, x_start);
            var idx_end = Math.min(this.bisect(data, x_end),
                Math.max((data.length - 1), 0));

            this.selector_model.set("selected", [idx_start, idx_end]);
            this.selector.touch();
        },

        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var curve_labels = this.model.update_labels();
            var legend_data = this.model.mark_data.map(function(d) {
                return {index: d.index, name: d.name, color: d.color,
                        opacity: d.opacity};
            });
            this.legend_el = elem.selectAll(".legend" + this.uuid)
              .data(legend_data, function(d, i) { return d.name; });

            var that = this,
                rect_dim = inter_y_disp * 0.8,
                fill_colors = this.model.get("fill_colors"),
                opacities = this.model.get("opacities");

            this.legend_line = d3.svg.line()
                .interpolate(this.model.get("interpolation"))
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; });

            this.legend_path_data = [[0, rect_dim],
                                     [rect_dim / 2, 0],
                                     [rect_dim, rect_dim / 2]];

            var legend = this.legend_el.enter()
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

            legend.append("path")
                .attr("class", "line")
                .attr("fill", "none")
                .attr("d", this.legend_line(this.legend_path_data) + this.path_closure())
                .style("stroke", function(d, i) {
                    return that.get_element_color(d, i) || fill_colors[i];
                })
                .style("fill", function(d, i) {
                    return that.model.get("fill") === "none" ?
                        "" : that.get_fill_color(d, i);
                })
                .style("opacity", function(d, i) { return opacities[i]; })
                .style("stroke-width", this.model.get("stroke_width"))
                .style("stroke-dasharray", _.bind(this.get_line_style, this));

            if (this.model.get("marker")) {
                legend.append("path")
                    .attr("class", "dot")
                    .attr("transform", "translate(" + rect_dim / 2 + ",0)")
                    .attr("d", that.dot.size(25))
                    .style("fill", function(d, i) { return that.get_element_color(d, i); });
            }

            this.legend_el.append("text")
              .attr("class", "legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) { return curve_labels[i]; })
              .style("fill", function(d, i) {
                  return that.get_element_color(d, i) || fill_colors[i];
              })
              .style("opacity", function(d, i) { return opacities[i]; });

            var max_length = d3.max(curve_labels, function(d) {
                return d.length;
            });
            this.legend_el.exit().remove();
            return [this.model.mark_data.length, max_length];
        },

        create_labels: function() {
            var x_scale = this.scales.x, y_scale = this.scales.y,
                that = this;
            var curves_sel = this.el.selectAll(".curve");

            curves_sel.selectAll(".curve_label").remove();
            curves_sel.append("text")
              .attr("class", "curve_label")
              .datum(function(d) {
                  return {name: d.name, value: d.values[d.values.length - 1]};
              }).attr("transform", function(d) {
                  return "translate(" + x_scale.scale(d.value.x) +
                                  "," + y_scale.scale(d.value.y) + ")";
              }).attr("x", 3)
              .attr("dy", ".35em")
              .attr("display", function(d) {
                  return (that.model.get("labels_visibility") !== "label") ?
                    "none" : "inline";
              }).text(function(d) { return d.name; });
        },

        update_curves_subset: function() {
            var that = this;
            // Show a subset of the curves
            var curves_subset = this.model.get("curves_subset");
            if (curves_subset.length > 0) {
                this.el.selectAll(".curve")
                  .select("path")
                  .attr("display", function(d, i) {
                      return curves_subset.indexOf(i) !== -1 ?
                          "inline" : "none";
                  });
                this.el.selectAll(".curve")
                  .select(".curve_label")
                  .attr("display", function(d, i) {
                      return (curves_subset.indexOf(i) !== -1 && that.model.get("labels_visibility") === "label") ?
                          "inline" : "none";
                  });
            } else { //make all curves visible
                this.el.selectAll(".curve")
                  .select("path").attr("display", "inline");
                this.el.selectAll(".curve")
                  .select(".curve_label").attr("display", function(d) {
                      return that.model.get("labels_visibility") === "label" ?
                          "inline" : "none";
                  });
            }
        },

        update_fill: function() {
            var fill = this.model.get("fill"),
                area = (fill === "top" || fill === "bottom");

            this.area.y0(fill === "bottom" ? this.parent.plotarea_height : 0)
              .defined(function(d) { return area && d.y !== null; });

            var that = this;
            this.el.selectAll(".curve").select(".area")
              .attr("d", function(d) {
                  return that.area(d.values);
              })
            this.el.selectAll(".curve").select(".line")
              .style("fill", function(d, i) {
                  return fill === "inside" ? that.get_fill_color(d, i) : "";
              })
            // update legend fill
            if (this.legend_el) {
               this.legend_el.select("path")
                 .style("fill", function(d, i) {
                     return fill === "none" ? "" : that.get_fill_color(d, i);
                 })
            }
        },

        get_element_color: function(data, index) {
            var color_scale = this.scales.color;
            if(color_scale && data.color !== undefined && data.color !== null) {
                return color_scale.scale(data.color);
            }
            return this.get_colors(index);
        },

        get_fill_color: function(data, index) {
            var fill_colors = this.model.get("fill_colors");
            var that = this;
            return fill_colors.length === 0 ?
                that.get_element_color(data, index) : fill_colors[index];
        },

        update_line_xy: function(animate) {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            this.line
              .x(function(d) { return x_scale.scale(d.x) + x_scale.offset; })
              .y(function(d) { return y_scale.scale(d.y) + y_scale.offset; })

            var fill = this.model.get("fill");
            this.area
              .x(function(d) { return x_scale.scale(d.x) + x_scale.offset; })
              .y0(fill === "bottom" ? this.parent.plotarea_height : 0)
              .y1(function(d) { return y_scale.scale(d.y) + y_scale.offset; })

            var that = this;
            this.el.selectAll(".curve").select(".line")
              .transition().duration(animation_duration)
              .attr("d", function(d) {
                  return that.line(d.values) + that.path_closure();
              });

            this.el.selectAll(".curve").select(".area")
              .transition().duration(animation_duration)
              .attr("d", function(d) { return that.area(d.values); });

            this.update_dots_xy(animate);
            this.x_pixels = (this.model.mark_data.length > 0) ? this.model.mark_data[0].values.map(function(el)
                                                                        { return x_scale.scale(el.x) + x_scale.offset; })
                                                              : [];
        },

        draw: function(animate) {
            this.set_ranges();
            var curves_sel = this.el.selectAll(".curve")
              .data(this.model.mark_data, function(d, i) { return d.name; });

            var new_curves = curves_sel.enter().append("g")
              .attr("class", "curve");
            new_curves.append("path")
              .attr("class", "line")
              .attr("fill", "none");
            new_curves.append("path")
              .attr("class", "area");

            var fill = this.model.get("fill"),
                area = (fill === "top" || fill === "bottom");
            var that = this;
            curves_sel.select(".line")
              .attr("id", function(d, i) { return "curve" + (i+1); })
              .on("click", _.bind(function() {
                  this.event_dispatcher("element_clicked");
              }, this));

            this.draw_dots();

            this.line = d3.svg.line()
              .interpolate(this.model.get("interpolation"))
              .defined(function(d) { return d.y !== null; });

            this.area = d3.svg.area()
              .interpolate(this.model.get("interpolation"))
              .defined(function(d) { return area && d.y !== null; });

            // Having a transition on exit is complicated. Please refer to
            // Scatter.js for detailed explanation.
            curves_sel.exit().remove();
            this.update_line_xy(animate);
            this.update_style();

            curves_sel.select(".curve_label")
              .attr("display", function(d) {
                  return that.model.get("labels_visibility") === "label" ?
                      "inline" : "none";
              });

            // alter the display only if a few of the curves are visible
            var curves_subset = this.model.get("curves_subset");
            if(curves_subset.length > 0) {
                curves_sel.select("path")
                  .attr("display", function(d, i) {
                      return curves_subset.indexOf(i) !== -1 ?
                          "inline" : "none";
                  });
                curves_sel.select(".curve_label")
                  .attr("display", function(d, i) {
                      return (curves_subset.indexOf(i) !== -1 &&
                              that.model.get("labels_visibility") === "label") ?
                          "inline" : "none";
                  });
            }
            this.create_labels();
        },

        draw_dots: function() {
            if (this.model.get("marker")) {
                var that = this;
                var dots = this.el.selectAll(".curve").selectAll(".dot")
                    .data(function(d, i) {
                        return d.values.map(function(e) {
                            return {x: e.x, y: e.y}; });
                    });
                dots.enter().append("path").attr("class", "dot");
                dots.exit().remove();
            }
        },

        update_dots_xy: function(animate) {
            if (this.model.get("marker")) {
                var that = this;
                var x_scale = this.scales.x, y_scale = this.scales.y;
                var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
                var dots = this.el.selectAll(".curve").selectAll(".dot");

                dots.transition().duration(animation_duration)
                    .attr("transform", function(d) { return "translate(" + (x_scale.scale(d.x) + x_scale.offset) +
                            "," + (y_scale.scale(d.y) + y_scale.offset) + ")";
                    })
                    .attr("d", this.dot.size(this.model.get("marker_size"))
                                   .type(this.model.get("marker")));
            }
        },

        compute_view_padding: function() {
            //This function sets the padding for the view through the variables
            //x_padding and y_padding which are view specific paddings in pixel
            var x_padding;
            if (this.model.get("marker")) {
                var marker_padding = Math.sqrt(this.model.get("marker_size")) / 2 + 1.0;
                var line_padding = this.model.get("stroke_width") / 2.0;
                x_padding = Math.max(marker_padding, line_padding);
            } else {
                x_padding = this.model.get("stroke_width") / 2.0;
            }

            var y_padding = x_padding;
            if(x_padding !== this.x_padding || y_padding !== this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = y_padding;
                this.trigger("mark_padding_updated");
            }
        },

	update_marker_style: function() {
            var that = this,
                fill_color = this.model.get("fill_colors"),
                opacities = this.model.get("opacities");
	    this.el.selectAll(".curve")
		.each(function(d, i) {
		    var curve = d3.select(this);	
                    curve.selectAll(".dot")
                        .style("opacity", opacities[i])
                        .style("fill", that.get_element_color(d, i) || fill_color[i]);
		});
	},

        update_marker: function(model, marker) {
            if (marker) {
                this.draw_dots();
                this.update_dots_xy();
		this.update_marker_style();
                if (this.legend_el) {
                    this.legend_el.select(".dot").attr("d", this.dot.type(marker).size(25));
                }
            } else {
                this.el.selectAll(".dot").remove();
                if (this.legend_el) {
                    this.legend_el.select(".dot").attr("d", this.dot.size(0));
                }
            }
        },

        update_marker_size: function(model, marker_size) {
            this.compute_view_padding();
            this.el.selectAll(".dot").attr("d", this.dot.size(marker_size));
        },

        update_selected_in_lasso: function(lasso_name, lasso_vertices,
                                           point_in_lasso_func)
        {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            var idx = this.model.get("selected");
            var selected = idx ? utils.deepCopy(idx) : [];
            var data_in_lasso = false;
            var that = this;
            if(lasso_vertices !== null && lasso_vertices.length > 0) {
                // go through each line and check if its data is in lasso
                _.each(this.model.mark_data, function(line_data) {
                   var line_name = line_data.name;
                   var data = line_data.values;
                   var indices = _.range(data.length);
                   var idx_in_lasso = _.filter(indices, function(index) {
                       var elem = data[index];
                       var point = [x_scale.scale(elem.x), y_scale.scale(elem.y)];
                       return point_in_lasso_func(point, lasso_vertices);
                   });
                   if (idx_in_lasso.length > 0) {
                       data_in_lasso = true;
                       selected.push({
                           line_name: line_name,
                           lasso_name: lasso_name,
                           indices: idx_in_lasso,
                       });
                   }
               });
               that.model.set("selected", selected);
               that.touch();
            } else {
                // delete the lasso specific selected
                this.model.set("selected", _.filter(selected, function(lasso) {
                    return lasso.lasso_name !== lasso_name;
                }));
                this.touch();
            }

            //return true if there are any mark data inside lasso
            return data_in_lasso;
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
    });

    return {
        Lines: Lines,
    };
});
