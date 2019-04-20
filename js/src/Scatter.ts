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
import {ScatterBase} from './ScatterBase';
import * as markers from './Markers';
import * as d3 from 'd3';
// const d3 =Object.assign({}, require("d3-selection"));

const bqSymbol: any = markers.symbol;


export class Scatter extends ScatterBase {

    render() {

        this.dot = bqSymbol()
          .type(this.model.get("marker"))
          .size(this.model.get("default_size"))
          .skew(this.model.get("default_skew"));

        return super.render();
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:colors", this.update_colors);
        this.listenTo(this.model, "change:stroke", this.update_stroke);
        this.listenTo(this.model, "change:stroke_width", this.update_stroke_width);
        this.listenTo(this.model, "change:default_opacities", this.update_default_opacities);
        this.listenTo(this.model, "change:default_skew", this.update_default_skew);
        this.listenTo(this.model, "change:marker", this.update_marker);
        this.listenTo(this.model, "change:default_size", this.update_default_size);
        this.listenTo(this.model, "change:fill", this.update_fill);
        this.listenTo(this.model, "change:display_names", this.update_names);
    }

    update_colors(model, new_colors) {
        if(!this.model.dirty) {
            const that = this;
            const stroke = this.model.get("stroke");
            const len = new_colors.length;
            this.d3el.selectAll(".dot")
            .style("fill", this.model.get("fill") ?
                function(d, i) {
                    return that.get_element_color(d, i);
                } : "none")
            .style("stroke", stroke ? stroke: function(d, i) {
                return that.get_element_color(d, i);
            });

            if (this.legend_el) {
                this.legend_el.select("path")
                .style("fill", function(d, i) {
                    return new_colors[i % len];
                })
                .style("stroke", stroke ? stroke : function (d, i) {
                        return new_colors[i % len];
                    }
                );
                this.legend_el.select("text")
                .style("fill", this.model.get("fill") ? function(d, i) {
                    return new_colors[i % len];
                } : "none");
            }
        }
        this.apply_styles()
    }

    update_fill(model, fill) {
        const that = this;
        const colors = this.model.get("colors");
        const len = colors.length;
        this.d3el.selectAll(".dot").style("fill", fill  ? function(d, i) {
            return that.get_element_color(d, i);
        } : "none");
        if (this.legend_el) {
            this.legend_el.selectAll("path")
                .style("fill", fill  ? function(d, i) {
                    return colors[i % len];
                } : "none");
        }
    }

    update_stroke_width() {
        const stroke_width = this.model.get("stroke_width");

        this.d3el.selectAll(".dot")
          .style("stroke-width", stroke_width);

        if (this.legend_el) {
            this.legend_el.selectAll("path")
              .style("stroke-width", stroke_width);
        }
    }

    update_stroke(model, fill) {
        const that = this;
        const stroke = this.model.get("stroke");
        this.d3el.selectAll(".dot")
            .style("stroke", stroke ? stroke: function(d, i) {
                return that.get_element_color(d, i);
            });

        if (this.legend_el) {
            this.legend_el.selectAll("path")
                .style("stroke", stroke);
        }
    }

    update_default_opacities(animate) {
        if (!this.model.dirty) {
            const default_opacities = this.model.get("default_opacities");
            const colors = this.model.get("colors");
            const len = colors.length;
            const len_opac = default_opacities.length;
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            // update opacity scale range?
            const that = this;
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
    }

    update_marker(model, marker) {
        if (!this.model.dirty) {
            this.d3el.selectAll(".dot")
                .transition("update_marker")
                .duration(this.parent.model.get("animation_duration"))
                .attr("d", this.dot.type(marker));
            if (this.legend_el) {
                this.legend_el.select("path")
                    .attr("d", this.dot.type(marker));
            }
        }
    }

    update_default_skew(animate) {
        if (!this.model.dirty) {
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
            const that = this;
            this.d3el.selectAll(".dot")
                .transition("update_default_skew")
                .duration(animation_duration)
                .attr("d", this.dot.skew(function(d) {
                    return that.get_element_skew(d);
                }));
        }
    }

    update_default_size(animate) {
        this.compute_view_padding();
        // update size scale range?
        if (!this.model.dirty) {
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
            const that = this;
            this.d3el.selectAll(".dot")
                .transition("update_default_size")
                .duration(animation_duration)
                .attr("d", this.dot.size(function(d) {
                    return that.get_element_size(d);
                }));
            // Label positions also need to change
            this.update_names(animate);
        }
    }

    update_names(animate) {
        const that = this;
        const names = this.model.get("names") || [];
        const show_names = this.model.get("display_names") && names.length !== 0;
        const animation_duration = animate ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp").select("text")
            .text(function(d) { return d.name; })
            .transition("update_names")
            .duration(animation_duration)
            .attr("transform", function(d) {
                const text_loc = Math.sqrt(that.get_element_size(d)) / 2.0;
                return "translate(" + (text_loc) + "," + (-text_loc) + ")";})
            .attr("display", function(d) {
                return (show_names) ? "inline": "none";
            });
    }

    color_scale_updated(animate) {
        const that = this,
            fill = this.model.get("fill"),
            stroke = this.model.get("stroke");
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp")
          .select("path")
          .transition("color_scale_updated")
          .duration(animation_duration)
          .style("fill", fill ?
              function(d, i) {
                  return that.get_element_color(d, i);
              } : "none")
          .style("stroke", stroke ? stroke: function(d, i) {
                  return that.get_element_color(d, i);
              });
    }

    draw_elements(animate, elements_added) {
        const that = this;

        const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        const elements = this.d3el.selectAll(".object_grp")

        elements_added.append("path").attr("class", "dot element");
        elements_added.append("text").attr("class", "dot_text");
        elements.select("path")
            .transition("draw_elements")
            .duration(animation_duration)
            .attr("d", this.dot
                .size(function(d) { return that.get_element_size(d); })
                .skew(function(d) { return that.get_element_skew(d); }));

        this.update_names(animate);
        this.apply_styles();
    }

    draw_legend_elements(elements_added, rect_dim) {
        const colors = this.model.get("colors"),
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
    }

    set_default_style(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        if(!indices || indices.length === 0) {
            return;
        }
        const elements = this.d3el.selectAll(".element").filter(function(data, index) {
            return indices.indexOf(index) !== -1;
        });
        const fill = this.model.get("fill"),
            stroke = this.model.get("stroke"),
            stroke_width = this.model.get("stroke_width"),
            that = this;
        elements
          .style("fill", fill ? function(d, i) {
             return that.get_element_color(d, i);
          } : "none")
          .style("stroke", stroke ? stroke: function(d, i) {
              return that.get_element_color(d, i);
          }).style("opacity", function(d, i) {
              return that.get_element_opacity(d, i);
          }).style("stroke-width", stroke_width);
    }

    set_drag_style(d, i, dragged_node) {
        d3.select(dragged_node)
          .select("path")
          .classed("drag_scatter", true)
          .transition("set_drag_style")
          .attr("d", this.dot.size(5 * this.model.get("default_size")));

        const drag_color = this.model.get("drag_color");
        if (drag_color) {
            d3.select(dragged_node)
              .select("path")
              .style("fill", drag_color)
              .style("stroke", drag_color);
        }
    }

    reset_drag_style(d, i, dragged_node) {
        const stroke = this.model.get("stroke"),
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
    }

    dot: any;
}
