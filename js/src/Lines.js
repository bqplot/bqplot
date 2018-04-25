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

var _ = require("underscore");
var d3 = require("d3");
var mark = require("./Mark");
var markers = require("./Markers");
var utils = require("./utils");

var bqSymbol = markers.symbol;

var Lines = mark.Mark.extend({

    render: function() {
        var base_render_promise = Lines.__super__.render.apply(this);
        var that = this;
        this.dot = bqSymbol().size(this.model.get("marker_size"));
        if (this.model.get("marker")) {
            this.dot.type(this.model.get("marker"));
        }

        // TODO: create_listeners is put inside the promise success handler
        // because some of the functions depend on child scales being
        // created. Make sure none of the event handler functions make that
        // assumption.
        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        this.display_el_classes = ["line", "legendtext", "dot"];
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
        this.d3el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
            .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move"); }, this))
            .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out"); }, this));

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
        this.listenTo(this.model, "labels_updated", this.update_labels, this);
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
            this.d3el.selectAll(".legend")
              .attr("display", "none");
            this.d3el.selectAll(".curve_label")
              .attr("display", "none");
        } else if(this.model.get("labels_visibility") === "label") {
            this.d3el.selectAll(".legend")
              .attr("display", "none");
            this.d3el.selectAll(".curve_label")
              .attr("display", "inline");
        } else {
            this.d3el.selectAll(".legend")
              .attr("display", "inline");
            this.d3el.selectAll(".curve_label")
              .attr("display", "none");
        }
    },

    update_labels: function() {
        var curves_sel = this.d3el.selectAll(".curve")
          .data(this.model.mark_data)
          .select(".curve_label")
          .text(function(d) { return d.name; });
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
        this.d3el.selectAll(".curve").select(".line")
          .style("stroke-dasharray", _.bind(this.get_line_style, this));
        if (this.legend_el) {
            this.legend_el.select("path")
              .style("stroke-dasharray", _.bind(this.get_line_style, this));
        }
    },

    update_stroke_width: function(model, stroke_width) {
        this.compute_view_padding();
        this.d3el.selectAll(".curve").select(".line")
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
        var curves = this.d3el.selectAll(".curve")
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
        this.d3el.selectAll(".curve").select(".line")
          .attr("d", function(d) {
              return that.line(d.values) + that.path_closure();
          });
        this.d3el.selectAll(".curve").select(".area")
          .transition("update_path_style")
          .duration(0) //FIXME
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
    },

    selector_changed: function(point_selector, rect_selector) {
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        var pixels = this.pixel_coords;
        var indices = _.range(pixels.length);
        var selected = _.filter(indices, function(index) {
            return point_selector(pixels[index]);
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
        var curve_labels = this.model.get_labels();
        var legend_data = this.model.mark_data.map(function(d) {
            return {index: d.index, name: d.name, color: d.color};
        });
        this.legend_el = elem.selectAll(".legend" + this.uuid)
          .data(legend_data);

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

    update_curves_subset: function() {
        var display_labels = this.model.get("labels_visibility") === "label";
        // Show a subset of the curves
        var curves_subset = this.model.get("curves_subset");
        if (curves_subset.length > 0) {
            this.d3el.selectAll(".curve")
              .attr("display", function(d, i) {
                  return curves_subset.indexOf(i) !== -1 ?
                      "inline" : "none";
              })
              .select(".curve_label")
              .attr("display", function(d, i) {
                  return (curves_subset.indexOf(i) !== -1 && display_labels) ?
                      "inline" : "none";
              });
            if (this.legend_el) {
                this.legend_el
                  .attr("display", function(d, i) {
                      return curves_subset.indexOf(i) !== -1 ?
                          "inline" : "none";
                  });
            }
            this.d3el.selectAll(".curve")

        } else { //make all curves visible
            this.d3el.selectAll(".curve")
              .attr("display", "inline")
              .select(".curve_label")
              .attr("display", function(d) {
                  return display_labels ? "inline" : "none";
              });
            if (this.legend_el) {
                this.legend_el.attr("display", "inline");
            }
        }
    },

    update_fill: function() {
        var fill = this.model.get("fill"),
            area = (fill === "top" || fill === "bottom" || fill === "between");

        var y_scale = this.scales.y;

        this.area.defined(function(d) { return area && d.y !== null && isFinite(y_scale.scale(d.y)); });
        if (fill == "bottom") {
            this.area.y0(this.parent.plotarea_height);
        } else if (fill == "top") {
            this.area.y0(0)
        } else if (fill == "between") {
            this.area.y0(function(d) { return y_scale.scale(d.y0) + y_scale.offset; })
        }
        var that = this;
        this.d3el.selectAll(".curve").select(".area")
          .attr("d", function(d) {
              return that.area(d.values);
          })
        this.d3el.selectAll(".curve").select(".line")
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
          .y1(function(d) { return y_scale.scale(d.y) + y_scale.offset; })
        
        if (fill == "bottom") {
            this.area.y0(this.parent.plotarea_height);
        } else if (fill == "top") {
            this.area.y0(0)
        } else if (fill == "between") {
            this.area.y0(function(d) { return y_scale.scale(d.y0) + y_scale.offset; })
        }

        var that = this;
        var curves_sel = this.d3el.selectAll(".curve");

        curves_sel.select(".line")
          .transition("update_line_xy")
          .duration(animation_duration)
          .attr("d", function(d) {
              return that.line(d.values) + that.path_closure();
          });

        curves_sel.select(".area")
          .transition("update_line_xy")
          .duration(animation_duration)
          .attr("d", function(d, i) {
            return that.area(d.values);
        });


        curves_sel.select(".curve_label")
          .transition("update_line_xy")
          .duration(animation_duration)
          .attr("transform", function(d) {
              var last_xy = d.values[d.values.length - 1];
              return "translate(" + x_scale.scale(last_xy.x) +
                              "," + y_scale.scale(last_xy.y) + ")";
          });

        this.update_dots_xy(animate);
        this.x_pixels = (this.model.mark_data.length > 0) ? this.model.mark_data[0].values.map(function(el)
                                                                    { return x_scale.scale(el.x) + x_scale.offset; })
                                                          : [];
        this.y_pixels = (this.model.mark_data.length > 0) ? this.model.mark_data[0].values.map(function(el)
                                                                    { return y_scale.scale(el.y) + y_scale.offset; })
                                                          : [];
        this.pixel_coords = (this.model.mark_data.length > 0) ?
            this.model.mark_data[0].values.map(function(el) {
                return [x_scale.scale(el.x) + x_scale.offset, y_scale.scale(el.y) + y_scale.offset];
            }) : [];
    },

    draw: function(animate) {
        this.set_ranges();
        var curves_sel = this.d3el.selectAll(".curve")
          .data(this.model.mark_data);

        var y_scale = this.scales.y;

        var new_curves = curves_sel.enter().append("g")
          .attr("class", "curve");
        new_curves.append("path")
          .attr("class", "line")
          .attr("fill", "none");
        new_curves.append("path")
          .attr("class", "area");
        new_curves.append("text")
          .attr("class", "curve_label")
          .attr("x", 3)
          .attr("dy", ".35em")
          .attr("display", this.model.get("labels_visibility") !== "label" ?
                "none" : "inline")
          .text(function(d) { return d.name; });

        var fill = this.model.get("fill"),
            area = (fill === "top" || fill === "bottom" || fill === "between");
        var that = this;
        curves_sel.select(".line")
          .attr("id", function(d, i) { return "curve" + (i+1); })
          .on("click", _.bind(function() {
              this.event_dispatcher("element_clicked");
          }, this));

        this.draw_dots();

        this.line = d3.svg.line()
          .interpolate(this.model.get("interpolation"))
          .defined(function(d) { return d.y !== null && isFinite(y_scale.scale(d.y)); });

        this.area = d3.svg.area()
          .interpolate(this.model.get("interpolation"))
          .defined(function(d) { return area && d.y !== null && isFinite(y_scale.scale(d.y)); });

        // Having a transition on exit is complicated. Please refer to
        // Scatter.js for detailed explanation.
        curves_sel.exit().remove();
        this.update_line_xy(animate);
        this.update_style();

        // alter the display only if a few of the curves are visible
        this.update_curves_subset();
    },

    draw_dots: function() {
        if (this.model.get("marker")) {
            var that = this;
            var dots = this.d3el.selectAll(".curve").selectAll(".dot")
                .data(function(d, i) {
                    return d.values.map(function(e) {
                        return {x: e.x, y: e.y, sub_index: e.sub_index}; });
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
            var dots = this.d3el.selectAll(".curve").selectAll(".dot");

            dots.transition("update_dots_xy").duration(animation_duration)
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
        var that = this;
        var fill_color = this.model.get("fill_colors");
        var opacities = this.model.get("opacities");
        this.d3el.selectAll(".curve").each(function(d, i) {
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
            this.d3el.selectAll(".dot").remove();
            if (this.legend_el) {
                this.legend_el.select(".dot").attr("d", this.dot.size(0));
            }
        }
    },

    update_marker_size: function(model, marker_size) {
        this.compute_view_padding();
        this.d3el.selectAll(".dot").attr("d", this.dot.size(marker_size));
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
                    this.event_listeners.mouse_move = this.move_tooltip;
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
    }
});

module.exports = {
    Lines: Lines
};
