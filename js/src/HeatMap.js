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

var d3 = require("d3");
var _ = require("underscore");
var utils = require("./utils");
var mark = require("./Mark");

var HeatMap = mark.Mark.extend({

    render: function() {
        var base_render_promise = HeatMap.__super__.render.apply(this);
        var that = this;

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
    },

    set_ranges: function() {
        var x_scale = this.scales.x;
        if(x_scale) {
            var x_range = this.parent.padded_range("x", x_scale.model);
            x_scale.set_range(x_range);
        }
        var y_scale = this.scales.y;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
    },

    set_positional_scales: function() {
        var x_scale = this.scales.x, y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    },

    initialize_additional_scales: function() {
        var color_scale = this.scales.color;
        if(color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                this.draw();
            });
            color_scale.on("color_scale_range_changed", this.draw, this);
        }
    },

    create_listeners: function() {
        HeatMap.__super__.create_listeners.apply(this);

        this.d3el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
            .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move"); }, this))
            .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out"); }, this));
        this.listenTo(this.model, "data_updated", this.draw, this);
        this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
        this.listenTo(this.model, "change:interactions", this.process_interactions);
    },

    click_handler: function (args) {},

    process_interactions: function (args) {},

    relayout: function() {
        this.set_ranges();
        this.compute_view_padding();
        this.draw();
    },

    draw_canvas: function() {
        this.image.attr("href", this.canvas.toDataURL("image/png"));
    },

    draw: function() {
        this.set_ranges();
        var that = this;

        var x_plot_data = this.get_x_plotting_data(this.model.mark_data.x);
        var y_plot_data = this.get_y_plotting_data(this.model.mark_data.y);

        this.canvas.setAttribute("width", x_plot_data.total_width);
        this.canvas.setAttribute("height", y_plot_data.total_height);

        var ctx = this.canvas.getContext("2d");
        var colors = this.model.mark_data.color;
        colors.forEach(function(row, i) {
            var height = y_plot_data.heights[i];
            var y = y_plot_data.start[i];
            row.forEach(function(d, j) {
                var width = x_plot_data.widths[j];
                var x = x_plot_data.start[j];
                ctx.fillStyle = that.get_element_fill(d);
                // add .5 to width and height to fill gaps
                ctx.fillRect(x, y, width+.5, height+.5);
            })
        })
        this.image.attr("width", x_plot_data.total_width)
            .attr("height", y_plot_data.total_height)
            .attr("x", x_plot_data.x0)
            .attr("y", y_plot_data.y0);
        this.draw_canvas();
    },

    get_x_plotting_data: function(data) {
        // This function returns the starting points and widths of the
        // cells based on the parameters passed.
        //
        // data is the data for which the plot data is to be generated.
        var scaled_data = data.map(this.scales.x.scale);
        var x_padding = this.get_x_padding(scaled_data);
        var num_cols = data.length;

        var widths = scaled_data.map(function(d, i) {
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

        var x0 = scaled_data[0] - x_padding.left;
        var start_points = scaled_data.map(function(d, i) {
            if (i == 0) { return 0; }
            else { return (d + scaled_data[i - 1]) * 0.5 - x0; }
        });

        var total_width = (scaled_data[num_cols-1] - scaled_data[0]) +
                           x_padding.left + x_padding.right;

        return {
            "widths": widths,
            "total_width": total_width,
            "start": start_points,
            "x0": x0
        };
    },

    get_x_padding: function(scaled_data) {
        var num_cols = scaled_data.length;
        return {
            left: (scaled_data[1] - scaled_data[0]) * 0.5,
            right: (scaled_data[num_cols-1] - scaled_data[num_cols-2]) * 0.5
        };
    },

    get_y_plotting_data: function(data) {
        // This function returns the starting points and heights of the
        // cells based on the parameters passed.
        //
        //  data is the data for which the plot data is to be generated.
        var scaled_data = data.map(this.scales.y.scale);
        var y_padding = this.get_y_padding(scaled_data);
        var num_rows = data.length;

        var heights = scaled_data.map(function(d, i) {
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

        var y0 = scaled_data[num_rows - 1] - y_padding.top
        var start_points = scaled_data.map(function(d, i) {
            if (i == num_rows - 1) { return 0; }
            else { return (d + scaled_data[i + 1]) * 0.5 - y0; }
        });

        var total_height = (scaled_data[0] - scaled_data[num_rows-1]) +
                            y_padding.top + y_padding.bottom;

        return {
            "heights": heights,
            "total_height": total_height,
            "start": start_points,
            "y0": y0
        };
    },

    get_y_padding: function(scaled_data) {
        var num_rows = scaled_data.length;
        return {
            bottom: -(scaled_data[1] - scaled_data[0]) * 0.5,
            top: -(scaled_data[num_rows-1] - scaled_data[num_rows-2]) * 0.5
        };
    },

    get_element_fill: function(color) {
        if (color === null) {
            return this.model.get("null_color")
        }
        return this.scales.color.scale(color);
    },
});

module.exports = {
    HeatMap: HeatMap,
};
