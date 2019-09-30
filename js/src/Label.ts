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

import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-selection"));
import {ScatterBase} from './ScatterBase';


export class Label extends ScatterBase {

    create_listeners() {
        super.create_listeners();
        this.model.on_some_change(["font_weight", "default_size", "colors",
                                   "align", "font_unit"], this.update_style, this);
        this.model.on_some_change(["x", "y", "x_offset", "y_offset",
                                   "rotate_angle"], this.update_position, this);
    }

    update_default_opacities(animate) {
        if (!this.model.dirty) {
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

            // update opacity scale range?
            const that = this;
            this.d3el.selectAll(".label")
                .transition("update_default_opacities")
                .duration(animation_duration)
                .style("opacity", function(d, i) {
                    return that.get_element_opacity(d, i);
                });
        }
    }

    update_default_size(animate) {
        this.compute_view_padding();
        // update size scale range?
        if (!this.model.dirty) {
            const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
            const that = this;
            this.d3el.selectAll(".label")
                .transition("update_default_size")
                .duration(animation_duration)
                .style("font-size", function(d, i) {
                    return that.get_element_size(d);
                });
        }
    }

    relayout() {
        this.set_ranges();
        this.update_position();
    }

    draw_elements(animate, elements_added) {
        elements_added.append("text")
            .classed("label element", true);

        this.update_text();
        this.update_style();
        this.update_default_opacities(true);
    }

    update_text() {
        this.d3el.selectAll(".object_grp")
            .select(".label")
            .text(function(d) { return d.text; });
    }

    get_element_size(data) {
        const size_scale = this.scales.size;
        const unit = this.model.get("font_unit");
        if(size_scale && data.size !== undefined) {
            return size_scale.scale(data.size) + unit;
        }
        return this.model.get("default_size") + unit;
    }

    get_element_rotation(data) {
        const rotation_scale = this.scales.rotation;
        return (!rotation_scale || !data.rotation) ? "rotate(" + this.model.get("rotate_angle") + ")" :
            "rotate(" + rotation_scale.scale(data.rotation) + ")";
    }

    update_position() {
        const that = this;
        const x_scale = this.x_scale;
        const y_scale = this.y_scale;
        const x_offset = this.model.get("x_offset"),
            y_offset = this.model.get("y_offset");
        this.d3el.selectAll(".object_grp")
            .attr("transform", function(d) {
                return "translate(" + (x_scale.scale(d.x) + x_scale.offset + x_offset) +
                                "," + (y_scale.scale(d.y) + y_scale.offset + y_offset) + ")" +
                       that.get_element_rotation(d);
            });
    }

    update_style() {
        const that = this;
        this.d3el.selectAll(".object_grp")
            .select("text")
            .attr("dominant-baseline", "central")
            .style("font-size", function(d, i) {
                return that.get_element_size(d);
            })
            .style("font-weight", this.model.get("font_weight"))
            .style("text-anchor", this.model.get("align"));

        this.d3el.selectAll(".label")
            .style("fill", function(d, i) {
                    return that.get_element_color(d,i);
            });
    }

    color_scale_updated(animate) {
        const that = this;
        const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

        this.d3el.selectAll(".object_grp")
            .select("text")
            .transition("color_scale_updated")
            .duration(animation_duration)
            .style("fill", function(d, i) {
                  return that.get_element_color(d, i);
            });
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
        const that = this;
        elements
            .style("font-size", function(d, i) {
                return that.get_element_size(d);
            })
            .style("font-weight", this.model.get("font_weight"))
            .style("text-anchor", this.model.get("align"))
            .style("fill", function(d, i) {
                    return that.get_element_color(d, i);
            });
    }

    set_drag_style(d, i, dragged_node) {
        const dragged_size = (this.model.get("drag_size") *
            this.model.get("default_size")) + this.model.get("font_unit");
        d3.select(dragged_node)
          .select("text")
          .classed("drag_label", true)
          .transition("set_drag_style")
          .style("font-size", (dragged_size));
    }

    reset_drag_style(d, i, dragged_node) {
        d3.select(dragged_node)
          .select("text")
          .classed("drag_label", false)
          .transition("reset_drag_style")
          .style("font-size", this.get_element_size(d));
    }

    // TODO: put this here just because it is an abstract method on the base
    // class.
    update_default_skew() {}
}
