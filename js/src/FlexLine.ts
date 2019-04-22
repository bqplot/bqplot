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
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"));
import { Lines } from './Lines';

export class FlexLine extends Lines {

    render() {
        const base_render_promise = super.render.apply(this);
        const that = this;

        return base_render_promise.then(function() {
            that.create_listeners();
            that.draw();
        });
    }

    set_ranges() {
        super.set_ranges();
        const width_scale = this.scales.width;
        if(width_scale) {
            width_scale.set_range([0.5, this.model.get("stroke_width")]);
        }
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:labels_visibility", this.update_legend_labels);
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        const g_elements = elem.selectAll(".legend" + this.uuid)
            .data(this.model.mark_data, function(d, i) { return d.name; });

        const that = this;
        const rect_dim = inter_y_disp * 0.8;
        g_elements.enter().append("g")
            .attr("class", "legend" + this.uuid)
            .attr("transform", function(d, i) {
                return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
            })
        .append("line")
            .style("stroke", function(d,i) { return that.get_colors(i); })
            .attr("x1", 0)
            .attr("x2", rect_dim)
            .attr("y1", rect_dim / 2)
            .attr("y2", rect_dim / 2);

        g_elements.append("text")
            .attr("class","legendtext")
            .attr("x", rect_dim * 1.2)
            .attr("y", rect_dim / 2)
            .attr("dy", "0.35em")
            .text(function(d, i) {return that.model.get("labels")[i]; })
            .style("fill", function(d,i) { return that.get_colors(i); });
        const max_length = d3.max(this.model.get("labels"), function(d: any[]) {
            return d.length;
        });

        g_elements.exit().remove();
        return [this.model.mark_data.length, max_length];
    }

    set_positional_scales() {
        const x_scale = this.scales.x, y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    }

    initialize_additional_scales() {
        const color_scale = this.scales.color;
        if(color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                this.draw();
            });
            color_scale.on("color_scale_range_changed", this.draw, this);
        }
    }

    draw() {
        this.set_ranges();
        let curves_sel = this.d3el.selectAll(".curve")
            .data(this.model.mark_data, function(d, i) { return d.name; });

        curves_sel.exit()
            .transition("draw")
            .duration(this.parent.model.get("animation_duration"))
            .remove();

        curves_sel = curves_sel.enter().append("g")
            .attr("class", "curve")
            .merge(curves_sel);

        const x_scale = this.scales.x, y_scale = this.scales.y;

        const that = this;
        curves_sel.nodes().forEach(function(elem, index) {
            let lines = d3.select(elem).selectAll<SVGLineElement, undefined>("line")
                .data(that.model.mark_data[index].values);
            lines = lines.enter().append("line").merge(lines);
            lines.attr("class", "line-elem")
                .attr("x1", function(d: any) { return x_scale.scale(d.x1); })
                .attr("x2", function(d: any) { return x_scale.scale(d.x2); })
                .attr("y1", function(d: any) { return y_scale.scale(d.y1); })
                .attr("y2", function(d: any) { return y_scale.scale(d.y2); })
                .attr("stroke", function(d) { return that.get_element_color(d); })
                .attr("stroke-width", function(d) { return that.get_element_width(d); });
        });
    }

    get_element_color(d) {
        const color_scale = this.scales.color;
        if(color_scale !== undefined && d.color !== undefined) {
            return color_scale.scale(d.color);
        }
        return this.model.get("colors")[0];
    }

    get_element_width(d) {
        const width_scale = this.scales.width;
        if(width_scale !== undefined && d.size !== undefined) {
            return width_scale.scale(d.size);
        }
        return this.model.get("stroke_width");
    }

    relayout() {
        super.relayout();
        this.set_ranges();

        const x_scale = this.scales.x, y_scale = this.scales.y;

        this.d3el.selectAll(".curve").selectAll(".line-elem")
            .transition("relayout")
            .duration(this.parent.model.get("animation_duration"))
            .attr("x1", function(d) { return x_scale.scale(d.x1); })
            .attr("x2", function(d) { return x_scale.scale(d.x2); })
            .attr("y1", function(d) { return y_scale.scale(d.y1); })
            .attr("y2", function(d) { return y_scale.scale(d.y2); });
    }
}
