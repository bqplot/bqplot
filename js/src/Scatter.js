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
var scatterbase = require("./ScatterBase");
var markers = require("./Markers");
var d3 = require("d3");

var bqSymbol = markers.symbol;


var Scatter = scatterbase.ScatterBase.extend({

    render: function() {

        this.dot = bqSymbol()
          .type(this.model.get("marker"))
          .size(this.model.get("default_size"))
          .skew(this.model.get("default_skew"));

        return Scatter.__super__.render.apply(this);
    },

    create_listeners: function() {
        Scatter.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:colors", this.update_colors, this);
        this.listenTo(this.model, "change:stroke", this.update_stroke, this);
        this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
        this.listenTo(this.model, "change:default_opacities", this.update_default_opacities, this);
        this.listenTo(this.model, "change:default_skew", this.update_default_skew, this);
        this.listenTo(this.model, "change:default_rotation", this.update_xy_position, this);
        this.listenTo(this.model, "change:marker", this.update_marker, this);
        this.listenTo(this.model, "change:default_size", this.update_default_size, this);
        this.listenTo(this.model, "change:fill", this.update_fill, this);
        this.listenTo(this.model, "change:display_names", this.update_names, this);
    },

    update_colors: function(model, new_colors) {
        if(!this.model.dirty) {
            var that = this,
                stroke = this.model.get("stroke"),
                len = new_colors.length;
            this.d3el.selectAll(".dot")
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
            colors = this.model.get("colors"),
            len = colors.length;
        this.d3el.selectAll(".dot").style("fill", fill  ? function(d, i) {
            return that.get_element_color(d, i);
        } : "none");
        if (this.legend_el) {
            this.legend_el.selectAll("path")
                .style("fill", fill  ? function(d, i) {
                    return colors[i % len];
                } : "none");
        }
    },

    update_stroke_width: function() {
        var stroke_width = this.model.get("stroke_width");

        this.d3el.selectAll(".dot")
          .style("stroke-width", stroke_width);

        if (this.legend_el) {
            this.legend_el.selectAll("path")
              .style("stroke-width", stroke_width);
        }
    },

    update_stroke: function(model, fill) {
        var that = this,
            stroke = this.model.get("stroke");
        this.d3el.selectAll(".dot")
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
            var colors = this.model.get("colors");
            var len = colors.length;
            var len_opac = default_opacities.length;
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            // update opacity scale range?
            var that = this;
            this.d3el.selectAll(".dot")
                .transition("update_default_opacities")
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
                    return colors[i % len];
                });
            }
        }
    },

    update_marker: function(model, marker) {
        if (!this.model.dirty) {
            this.d3el.selectAll(".dot")
                .transition("update_marker")
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
            this.d3el.selectAll(".dot")
                .transition("update_default_skew")
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
            this.d3el.selectAll(".dot")
                .transition("update_default_size")
                .duration(animation_duration)
                .attr("d", this.dot.size(function(d) {
                    return that.get_element_size(d);
                }));
            // Label positions also need to change
            this.update_names(animate);
        }
    },

    update_names: function(animate) {
        var that = this,
            names = this.model.get_typed_field("names"),
            show_names = this.model.get("display_names") && names.length !== 0,
            animation_duration = animate ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp").select("text")
            .text(function(d) { return d.name; })
            .transition("update_names")
            .duration(animation_duration)
            .attr("transform", function(d) {
                var text_loc = Math.sqrt(that.get_element_size(d)) / 2.0;
                return "translate(" + (text_loc) + "," + (-text_loc) + ")";})
            .attr("display", function(d) {
                return (show_names) ? "inline": "none";
            });
    },

    color_scale_updated: function(animate) {
        var that = this,
            fill = this.model.get("fill"),
            stroke = this.model.get("stroke");
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp")
          .select("path")
          .transition("color_scale_updated")
          .duration(animation_duration)
          .style("fill", fill ?
              function(d, i) {
                  return that.get_element_color(d, i);
              } : "none")
          .style("stroke", stroke ? stroke : function(d, i) {
                  return that.get_element_color(d, i);
              });
    },

    draw_elements: function(animate, elements_added) {
        var that = this;

        var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        var elements = this.d3el.selectAll(".object_grp")

        elements_added.append("path").attr("class", "dot element");
        elements_added.append("text").attr("class", "dot_text");
        elements.select("path").transition("draw_elements")
            .duration(animation_duration)
            .attr("d", this.dot
                .size(function(d) { return that.get_element_size(d); })
                .skew(function(d) { return that.get_element_skew(d); }));

        this.update_names(animate);
        this.apply_styles();
    },

    draw_legend_elements: function(elements_added, rect_dim) {
        var colors = this.model.get("colors"),
            len = colors.length,
            stroke = this.model.get("stroke");

        elements_added.append("path")
          .attr("transform", function(d, i) {
              return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
          })
          .attr("d", this.dot.size(64))
          .style("fill", this.model.get("fill")  ?
                function(d, i) {
                    return colors[i % len];
                } : "none")
          .style("stroke", stroke ? stroke :
                function(d, i) {
                    return colors[i % len];
                }
          );
    },

    set_default_style: function(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        if(!indices || indices.length === 0) {
            return;
        }
        var elements = this.d3el.selectAll(".element").filter(function(data, index) {
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

    set_drag_style: function(d, i, dragged_node) {
        d3.select(dragged_node)
          .select("path")
          .classed("drag_scatter", true)
          .transition("set_drag_style")
          .attr("d", this.dot.size(5 * this.model.get("default_size")));

        var drag_color = this.model.get("drag_color");
        if (drag_color) {
            d3.select(dragged_node)
              .select("path")
              .style("fill", drag_color)
              .style("stroke", drag_color);
        }
    },

    reset_drag_style: function(d, i, dragged_node) {
        var stroke = this.model.get("stroke"),
            original_color = this.get_element_color(d, i);

        d3.select(dragged_node)
          .select("path")
          .classed("drag_scatter", false)
          .transition("reset_drag_style")
          .attr("d", this.dot.size(this.get_element_size(d)));

        if (this.model.get("drag_color")) {
            d3.select(dragged_node)
              .select("path")
              .style("fill", original_color)
              .style("stroke", stroke ? stroke : original_color);
        }
    },
});

module.exports = {
    Scatter: Scatter
};
