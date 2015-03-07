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

    var Lines = MarkViewModule.Mark.extend({
        render: function() {
            var base_render_promise = Lines.__super__.render.apply(this);
            var that = this;

            // TODO: create_listeners is put inside the promise success handler
            // because some of the functions depend on child scales being
            // created. Make sure none of the event handler functions make that
            // assumption.
            this.after_displayed(function() {
                this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
                this.create_tooltip();
            });

            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
				that.compute_view_padding();
                that.draw();
            });
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            }
        },
        set_positional_scales: function() {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.update_line_xy(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.update_line_xy(); }
            });
        },
        initialize_additional_scales: function() {
            var color_scale = this.scales["color"];
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

            this.model.on("change:tooltip", this.create_tooltip, this);

            // FIXME: multiple calls to update_path_style. Use on_some_change.
            this.model.on("change:interpolation", this.update_path_style, this);
            this.model.on("change:close_path", this.update_path_style, this);
            // FIXME: multiple calls to update_style. Use on_some_change.
            this.model.on("change:colors", this.update_style, this);
            this.model.on("change:fill", this.update_style, this);
            this.model.on("change:opacity", this.update_style, this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:stroke_width", this.update_stroke_width, this);
            this.model.on("change:labels_visibility", this.update_legend_labels, this);
            this.model.on("change:line_style", this.update_line_style, this);
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.parent, "bg_clicked", function() { this.event_dispatcher("parent_clicked")});
        },
        event_dispatcher: function(event_name) {
            if(this.event_listeners[event_name] !== undefined) {
                _.bind(this.event_listeners[event_name], this)();
            }
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
            }
        },
        // Updating the style of the curve, stroke, colors, dashed etc...
        // Could be fused in a single function for increased readability
        // and to avoid code repetition
        update_line_style: function() {
            this.el.selectAll(".curve").selectAll("path")
              .style("stroke-dasharray", _.bind(this.get_line_style, this));
            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("stroke-dasharray", _.bind(this.get_line_style, this));
            }
        },
        update_stroke_width: function(model, stroke_width) {
            this.compute_view_padding();
            this.el.selectAll(".curve").selectAll("path")
              .style("stroke-width", stroke_width);
            if (this.legend_el) {
                this.legend_el.select("path")
                  .style("stroke-width", stroke_width);
            }
        },
        update_style: function() {
            var that = this,
                fill_color = this.model.get("fill"),
                opacity = this.model.get("opacity");
            // update curve colors
            this.el.selectAll(".curve").select("path")
              .style("stroke", function(d, i) {
                  return that.get_element_color(d, i);
              })
              .style("fill", function(d, i) {
                  return fill_color[i];
              })
              .style("opacity", function(d, i) {
                  return opacity[i];
              });
            // update legend style
            if (this.legend_el){
                this.legend_el.select("path")
                  .style("stroke", function(d, i) {
                      return that.get_element_color(d, i);
                  })
                 .style("fill", function(d, i) {
                      return fill_color[i];
                  })
                  .style("opacity", function(d, i) {
                      return opacity[i];
                  });
                this.legend_el.select("text")
                  .style("fill", function(d, i) {
                      return that.get_element_color(d, i) || fill_color[i];
                  })
                  .style("opacity", function(d, i) {
                      return opacity[i];
                  });
            }
        },
        path_closure: function() {
            return this.model.get("close_path") ? "Z" : "";
        },
        update_path_style: function() {
            var interpolation = this.model.get("interpolation");
            this.line.interpolate(interpolation);
            var that = this;
            this.el.selectAll(".curve").selectAll("path")
              .attr("d", function(d) {
                  return that.line(d.values) + that.path_closure();
              });
            if (this.legend_el) {
                this.legend_line.interpolate(interpolation);
                this.legend_el.selectAll("path")
                  .attr("d", this.legend_line(this.legend_path_data) + this.path_closure());
            }
        },
        relayout: function() {
            this.set_ranges();
            var that = this;
            this.el.selectAll(".curve").selectAll("path")
              .transition().duration(this.model.get("animate_dur"))
              .attr("d", function(d) {
                  return that.line(d.values) + that.path_closure();
              });
            this.create_labels();
        },
        invert_range: function(start_pxl, end_pxl) {
            if(start_pxl === undefined || end_pxl === undefined) {
                this.model.set("selected", null);
                this.touch();
                return [];
            }

            var self = this;
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            var start = x_scale.scale.invert(start_pxl);
            var end = x_scale.scale.invert(end_pxl);
            var data = this.model.x_data[0] instanceof Array ?
                this.model.x_data[0] : this.model.x_data;

            var indices = [start, end].map(function(elem) {
				return Math.min(self.bisect(data, elem),
								Math.max((data.length - 1), 0));
			});
            this.model.set("selected", indices);
            this.touch();
        },
        invert_point: function(pixel) {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            var data_point = x_scale.scale.invert(pixel);
            var data = this.model.x_data[0] instanceof Array ?
                this.model.x_data[0] : this.model.x_data;

            var index = Math.min(this.bisect(data, data_point),
								 Math.max((data.length - 1), 0));
            this.model.set("selected", [index]);
            this.touch();
        },
        update_multi_range: function(brush_extent) {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            var x_start = brush_extent[0];
            var x_end = brush_extent[1];

            var data = this.model.x_data[0] instanceof Array ?
                this.model.x_data[0] : this.model.x_data;
            var idx_start = this.bisect(data, x_start);
            var idx_end = Math.min(this.bisect(data, x_end),
								   Math.max((data.length - 1), 0));

            x_start = (x_scale.model.type === "date") ?
                x_scale.format_date(x_start) : x_start;
            x_end = (x_scale.model.type === "date") ?
                x_scale.format_date(x_end) : x_end;

            this.selector_model.set("selected", [idx_start, idx_end]);
            this.selector.touch();
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var curve_labels = this.model.update_labels();
            this.legend_el = elem.selectAll(".legend" + this.uuid)
              .data(this.model.mark_data, function(d, i) {
                  return d.name;
              });

            var that = this,
                rect_dim = inter_y_disp * 0.8,
                fill_color = this.model.get("fill"),
                opacity = this.model.get("opacity");

            this.legend_line = d3.svg.line()
                .interpolate(this.model.get("interpolation"))
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; });

            this.legend_path_data = [[0, rect_dim],
                                     [rect_dim / 2, 0],
                                     [rect_dim, rect_dim / 2]]

            this.legend_el.enter()
              .append("g")
                .attr("class", "legend" + this.uuid)
                .attr("transform", function(d, i) {
                    return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
                }).on("mouseover", _.bind(this.highlight_axes, this))
                .on("mouseout", _.bind(this.unhighlight_axes, this))
              .append("path")
                .attr("fill", "none")
                .attr("d", this.legend_line(this.legend_path_data) + this.path_closure())
                .style("stroke", function(d,i) {
                    return that.get_element_color(d, i);
                })
                .style("fill", function(d, i) { return fill_color[i]; })
                .style("opacity", function(d, i) { return opacity[i]; })
                .style("stroke-width", this.model.get("stroke_width"))
                .style("stroke-dasharray", _.bind(this.get_line_style, this));

            this.legend_el.append("text")
              .attr("class", "legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) { return curve_labels[i]; })
              .style("fill", function(d,i) {
                  return that.get_element_color(d, i);
              });

            var max_length = d3.max(curve_labels, function(d) {
                return d.length;
            });
            this.legend_el.exit().remove();
            return [this.model.mark_data.length, max_length];
        },
        create_labels: function() {
            var x_scale = this.scales["x"], y_scale = this.scales["y"],
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
        legend_click: function(index) {
            var path = "#curve" + (index + 1);
            var opacity = this.model.mark_data[index].opacity = (this.model.mark_data[index].opacity === 1) ?
                0.1 : 1;
            this.el.select("#legend"+(index+1))
              .style("opacity", opacity + 0.4);
            this.el.select(path).style("opacity", opacity);
        },
        update_curves_subset: function() {
            // TODO: Some of this should move to the model
            var that = this;
            // Show subset of curves
            var curves_subset = this.model.get("curves_subset");
            if (curves_subset.length > 1) {
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
        get_element_color: function(data, index) {
            var color_scale = this.scales["color"];
            if(color_scale && data.color !== undefined && data.color !== null) {
                return color_scale.scale(data.color);
            }
            return this.get_colors(index);
        },
        update_line_xy: function() {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            this.line = d3.svg.line()
              .interpolate(this.model.get("interpolation"))
              .x(function(d) {
                  return x_scale.scale(d.x) + x_scale.offset;
              })
              .y(function(d) {
                  return y_scale.scale(d.y) + y_scale.offset;
              })
              .defined(function(d) { return d.y !== null; });

            var that = this;
            this.el.selectAll(".curve").select("path")
              .transition().duration(this.model.get("animate_dur"))
              .attr("d", function(d) {
                  return that.line(d.values) + that.path_closure();
              });
        },
        draw: function() {
            this.set_ranges();
            var curves_sel = this.el.selectAll(".curve")
              .data(this.model.mark_data, function(d, i) { return d.name; });

            var new_curves = curves_sel.enter().append("g")
              .attr("class", "curve");
            new_curves.append("path")
              .attr("class", "line")
              .attr("fill", "none");

            var fill_color = this.model.get("fill");

            var that = this;
            curves_sel.select("path")
              .attr("id", function(d, i) { return "curve" + (i+1); })
              .style("stroke", function(d, i) {
                  return that.get_element_color(d, i);
              })
              .style("fill", function(d, i) { return fill_color[i]; })
              .style("stroke-width", this.model.get("stroke_width"))
              .style("stroke-dasharray", _.bind(this.get_line_style, this))
              .on("click", _.bind(function() { this.event_dispatcher("element_clicked");}, this));

            curves_sel.exit()
              .transition().duration(this.model.get("animate_dur"))
              .remove();

            this.update_line_xy();

            this.el.selectAll(".curve")
              .select(".curve_label")
              .attr("display", function(d) {
                  return that.model.get("labels_visibility") === "label" ?
                      "inline" : "none";
              });

            // alter the display only if a few of the curves are visible
            var curves_subset = this.model.get("curves_subset");
            if(curves_subset.length > 0) {
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
            }
            this.create_labels();
        },
        compute_view_padding: function() {
            //This function sets the padding for the view through the variables
            //x_padding and y_padding which are view specific paddings in pixel
            var x_padding = this.model.get("stroke_width")/2.0;
            var y_padding = x_padding;
            if(x_padding !== this.x_padding || y_padding !== this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = y_padding;
                this.trigger("mark_padding_updated");
            }
		},
        update_selected_in_lasso: function(lasso_name, lasso_vertices,
                                           point_in_lasso_func)
        {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
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
        reset_interactions: function() {
            this.reset_click();
            this.reset_hover();
        },
        reset_click: function() {
            this.event_listeners["element_clicked"] = function() {};
            this.event_listeners["parent_clicked"] = function() {};
        },
        reset_hover: function() {
            this.event_listeners["mouse_over"] = function(){};
            this.event_listeners["mouse_move"] = function() {};
            this.event_listeners["mouse_out"] = function() {};
        },
        refresh_tooltip: function(event, data, tooltip_interactions) {
            var el = d3.select(d3.event.target);
            if(this.is_hover_element(el)) {
                var data = el.data()[0];
                var clicked_data = this.model.get_data_dict(data, data.index);
                this.trigger("update_tooltip", data);
                this.show_tooltip(d3.event, true);
            }
        },
        process_interactions: function() {
            var interactions = this.model.get("interactions");
            if(_.isEmpty(interactions)) {
                //set all the event listeners to blank functions
                this.reset_interactions();
            }
            else {
                if(interactions["click"] !== undefined &&
                  interactions["click"] !== null) {
                    if(interactions["click"] === "tooltip") {
                        this.event_listeners["element_clicked"] = this.refresh_tooltip;
                        this.event_listeners["parent_clicked"] = function() { return this.hide_tooltip(true) };
                    }
                } else {
                    this.reset_click();
                }
                if(interactions["hover"] !== undefined &&
                  interactions["hover"] !== null) {
                    if(interactions["hover"] === "tooltip") {
                        this.event_listeners["mouse_over"] = this.refresh_tooltip;
                        this.event_listeners["mouse_move"] = this.show_tooltip;
                        this.event_listeners["mouse_out"] = this.hide_tooltip;
                    }
                } else {
                    this.reset_hover();
                }
            }
        },
    });

    return {
        Lines: Lines,
    };
});
