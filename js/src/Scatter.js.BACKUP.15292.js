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

    create_additional_listeners: function() {
        this.listenTo(this.model, "change:default_colors", this.update_default_colors, this);
        this.listenTo(this.model, "change:stroke", this.update_stroke, this);
        this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
        this.listenTo(this.model, "change:default_opacities", this.update_default_opacities, this);
        this.listenTo(this.model, "change:default_skew", this.update_default_skew, this);
        this.listenTo(this.model, "change:default_rotation", this.update_xy_position, this);
        this.listenTo(this.model, "change:marker", this.update_marker, this);
        this.listenTo(this.model, "change:default_size", this.update_default_size, this);
        this.listenTo(this.model, "change:fill", this.update_fill, this);
        this.listenTo(this.model, "change:display_names", this.update_display_names, this);
    },

    update_default_colors: function(model, new_colors) {
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
            default_colors = this.model.get("default_colors"),
            len = default_colors.length;
        this.d3el.selectAll(".dot").style("fill", fill  ? function(d, i) {
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
            var default_colors = this.model.get("default_colors");
            var len = default_colors.length;
            var len_opac = default_opacities.length;
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            // update opacity scale range?
            var that = this;
            this.d3el.selectAll(".dot")
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
            this.d3el.selectAll(".dot")
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
            this.d3el.selectAll(".dot")
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
            this.d3el.selectAll(".dot")
                .transition()
                .duration(animation_duration)
                .attr("d", this.dot.size(function(d) {
                    return that.get_element_size(d);
                }));
        }
    },
    color_scale_updated: function(animate) {
        var that = this,
            fill = this.model.get("fill"),
            stroke = this.model.get("stroke");
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp")
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

    draw_elements: function(animate, elements_added) {
        var that = this;

        var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        var elements = this.d3el.selectAll(".object_grp")

        elements_added.append("path").attr("class", "dot");
        elements_added.append("text").attr("class", "dot_text");
        elements.select("path").transition()
            .duration(animation_duration)
            .attr("d", this.dot
                .size(function(d) { return that.get_element_size(d); })
                .skew(function(d) { return that.get_element_skew(d); }));

        var names = this.model.get_typed_field("names"),
            text_loc = Math.sqrt(this.model.get("default_size")) / 2.0,
            show_names = (this.model.get("display_names") && names.length !== 0);

        elements.select("text")
            .text(function(d) { return d.name; })
            .attr("transform", function(d) {
                return "translate(" + (text_loc) + "," + (-text_loc) + ")";})
            .attr("display", function(d) { return (show_names) ? "inline": "none"; });

        this.apply_styles();
    },
    draw_legend_elements: function(elements_added, rect_dim) {
        var default_colors = this.model.get("default_colors"),
            len = default_colors.length,
            stroke = this.model.get("stroke");

        var rect_dim = inter_y_disp * 0.8;

        elements_added.append("path")
          .attr("transform", function(d, i) {
              return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
          })
          .attr("d", this.dot.size(64))
          .style("fill", this.model.get("fill")  ?
                function(d, i) {
                    return default_colors[i % len];
                } : "none")
          .style("stroke", stroke ? stroke :
                function(d, i) {
                    return default_colors[i % len];
                }
          );
    },

    set_drag_style: function(d, i, dragged_node) {
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
    },

<<<<<<< HEAD
    on_drag: function(d, i, dragged_node) {
        var x_scale = this.scales.x, y_scale = this.scales.y;
        // If restrict_x is true, then the move is restricted only to the X
        // direction.
        var restrict_x = this.model.get("restrict_x"),
            restrict_y = this.model.get("restrict_y");
        if (restrict_x && restrict_y) { return; }
        if (!restrict_y) { d[0] = d3.event.x; }
        if (!restrict_x) { d[1] = d3.event.y; }

        d3.select(dragged_node)
          .attr("transform", function() {
              return "translate(" + d[0] + "," + d[1] + ")";
          });
        this.send({
            event: "drag",
            origin: {x: d.x, y: d.y},
	        point: {
                x: x_scale.invert(d[0]),
                y: y_scale.invert(d[1])
            },
            index: i
        });
        if(this.model.get("update_on_move")) {
            // saving on move if flag is set
            this.update_array(d, i);
        }
    },

    drag_ended: function(d, i, dragged_node) {
=======
    reset_drag_style: function(d, i, dragged_node) {
>>>>>>> split Scatter
        var stroke = this.model.get("stroke"),
            original_color = this.get_element_color(d, i);

        d3.select(dragged_node)
          .select("path")
          .classed("drag_scatter", false)
          .transition()
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
