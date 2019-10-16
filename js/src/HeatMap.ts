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
import * as _ from 'underscore';
import { Mark } from './Mark';

export class HeatMap extends Mark {

    render() {
        const base_render_promise = super.render();
        const that = this;

        // TODO: create_listeners is put inside the promise success handler
        // because some of the functions depend on child scales being
        // created. Make sure none of the event handler functions make that
        // assumption.
        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        this.image = d3.select(this.el)
            .append("image")
            .classed("heatmap", true)
            .attr("width", this.parent.width)
            .attr("height", this.parent.height);

        this.canvas = document.createElement("canvas");

        return base_render_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.compute_view_padding();
            that.draw();
        });
    }

    set_ranges() {
        const x_scale = this.scales.x;
        if(x_scale) {
            const x_range = this.parent.padded_range("x", x_scale.model);
            x_scale.set_range(x_range);
        }
        const y_scale = this.scales.y;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
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

    create_listeners() {
        super.create_listeners();

        this.d3el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
            .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move"); }, this))
            .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out"); }, this));
        this.listenTo(this.model, "data_updated", this.draw);
        this.listenTo(this.model, "change:tooltip", this.create_tooltip);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
        this.listenTo(this.model, "change:interactions", this.process_interactions);
    }

    click_handler (args) {}

    relayout() {
        this.set_ranges();
        this.compute_view_padding();
        this.draw();
    }

    draw_canvas() {
        this.image.attr("href", this.canvas.toDataURL("image/png"));
    }

    draw() {
        this.set_ranges();

        const x_plot_data = this.get_x_plotting_data(this.model.mark_data.x);
        const y_plot_data = this.get_y_plotting_data(this.model.mark_data.y);

        this.canvas.setAttribute("width", x_plot_data.total_width);
        this.canvas.setAttribute("height", y_plot_data.total_height);

        const ctx = this.canvas.getContext("2d");
        const colors = this.model.mark_data.color;
        colors.forEach((row, i) => {
            const height = y_plot_data.heights[i];
            const y = y_plot_data.origin + y_plot_data.start[i];
            row.forEach((d, j) => {
                const width = x_plot_data.widths[j];
                const x = x_plot_data.origin + x_plot_data.start[j];
                ctx.fillStyle = this.get_element_fill(d);
                ctx.fillRect(x, y, this.expandRect(width), this.expandRect(height));
            })
        });
        this.image.attr("width", x_plot_data.total_width)
            .attr("height", y_plot_data.total_height)
            .attr("x", x_plot_data.x0)
            .attr("y", y_plot_data.y0);
        this.draw_canvas();
    }

    expandRect(value) {
        // Add 0.5px to width and height to fill gaps between rectangles
        return value > 0 ? value + 0.5 : value - 0.5;
    }

    get_x_plotting_data(data) {
        // This function returns the starting points and widths of the
        // cells based on the parameters passed.
        //
        // data is the data for which the plot data is to be generated.
        // since data may be a TypedArray, explicitly use Array.map
        data = Array.from(data)
        const scaled_data = Array.prototype.map.call(data, this.scales.x.scale);
        const x_padding = this.get_x_padding(scaled_data);
        const reverse = this.scales.x.model.get('reverse');
        const num_cols = data.length;

        const widths = scaled_data.map(function(d, i) {
            if (i == 0) {
                return (scaled_data[1] - d) * 0.5 + x_padding.left;
            }
            else if (i == num_cols - 1) {
                return (d - scaled_data[i - 1]) * 0.5 + x_padding.right;
            }
            else {
                return (scaled_data[i + 1] - scaled_data[i - 1]) * 0.5;
            }
        });

        const x0 = scaled_data[0] - x_padding.left;
        const start_points = scaled_data.map(function(d, i) {
            if (i == 0) { return 0; }
            else { return (d + scaled_data[i - 1]) * 0.5 - x0; }
        });

        const total_width = Math.abs(scaled_data[num_cols-1] - scaled_data[0] + x_padding.left + x_padding.right);

        return {
            "widths": widths,
            "total_width": total_width,
            "origin": reverse ? total_width : 0,
            "start": start_points,
            "x0": reverse ? x0 - total_width : x0,
        };
    }

    get_x_padding(scaled_data) {
        const num_cols = scaled_data.length;
        return {
            left: (scaled_data[1] - scaled_data[0]) * 0.5,
            right: (scaled_data[num_cols-1] - scaled_data[num_cols-2]) * 0.5
        };
    }

    get_y_plotting_data(data) {
        // This function returns the starting points and heights of the
        // cells based on the parameters passed.
        //
        //  data is the data for which the plot data is to be generated.
        data = Array.from(data)
        const scaled_data = data.map(this.scales.y.scale);
        const y_padding = this.get_y_padding(scaled_data);
        const reverse = this.scales.y.model.get('reverse');
        const num_rows = data.length;

        const heights = scaled_data.map(function(d, i) {
            if (i == 0) {
                return -(scaled_data[1] - d) * 0.5 + y_padding.bottom;
            }
            else if (i == num_rows - 1) {
                return -(d - scaled_data[i - 1]) * 0.5 + y_padding.top;
            }
            else {
                return -(scaled_data[i + 1] - scaled_data[i - 1]) * 0.5;
            }
        });

        const y0 = scaled_data[num_rows - 1] - y_padding.top
        const start_points = scaled_data.map(function(d, i) {
            if (i == num_rows - 1) { return 0; }
            else { return (d + scaled_data[i + 1]) * 0.5 - y0; }
        });

        const total_height = Math.abs(scaled_data[0] - scaled_data[num_rows-1] + y_padding.top + y_padding.bottom);

        return {
            "heights": heights,
            "total_height": total_height,
            "origin": reverse ? total_height : 0,
            "start": start_points,
            "y0": reverse ? y0 - total_height : y0,
        };
    }

    get_y_padding(scaled_data) {
        const num_rows = scaled_data.length;
        return {
            bottom: -(scaled_data[1] - scaled_data[0]) * 0.5,
            top: -(scaled_data[num_rows-1] - scaled_data[num_rows-2]) * 0.5
        };
    }

    get_element_fill(color) {
        if (color === null) {
            return this.model.get("null_color")
        }
        return this.scales.color.scale(color);
    }

    clear_style(style_dict, indices?, elements?) {
    }

    compute_view_padding() {
    }

    set_default_style(indices, elements?) {
    }

    set_style_on_elements(style, indices, elements?) {
    }

    image: any;
    canvas: any;
}
