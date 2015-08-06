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

    var GridHeatMap = MarkViewModule.Mark.extend({
        render: function() {
            var base_render_promise = GridHeatMap.__super__.render.apply(this);
            var that = this;

            // TODO: create_listeners is put inside the promise success handler
            // because some of the functions depend on child scales being
            // created. Make sure none of the event handler functions make that
            // assumption.
            this.after_displayed(function() {
                this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
                this.create_tooltip();
            });

            // this.display_el_classes = ["line", "legendtext"];
            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
				that.compute_view_padding();
                that.draw();
            });
        },
        set_ranges: function() {
            var row_scale = this.scales["row"];
            if(row_scale) {
                // The y_range is reversed because we want the first row
                // to start at the top of the plotarea and not the bottom.
                var row_range = this.parent.padded_range("y", row_scale.model);
                row_scale.set_range([row_range[1], row_range[0]]);
            }
            var col_scale = this.scales["column"];
            if(col_scale) {
                col_scale.set_range(this.parent.padded_range("x", col_scale.model));
            }
        },
        set_positional_scales: function() {
            var x_scale = this.scales["column"], y_scale = this.scales["row"];
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
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
            GridHeatMap.__super__.create_listeners.apply(this);
            /*
            this.el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
                .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move");}, this))
                .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out");}, this));

            this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);

            // FIXME: multiple calls to update_path_style. Use on_some_change.
            this.listenTo(this.model, "change:interpolation", this.update_path_style, this);
            this.listenTo(this.model, "change:close_path", this.update_path_style, this);

            // FIXME: multiple calls to update_style. Use on_some_change.
            this.listenTo(this.model, "change:colors", this.update_style, this);
            this.listenTo(this.model, "change:fill", this.update_style, this);
            this.listenTo(this.model, "change:opacity", this.update_style, this);
            this.listenTo(this.model, "data_updated", this.draw, this);
            this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
            this.listenTo(this.model, "change:labels_visibility", this.update_legend_labels, this);
            this.listenTo(this.model, "change:line_style", this.update_line_style, this);
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.parent, "bg_clicked", function() {
                this.event_dispatcher("parent_clicked");
            });
           */
        },
        relayout: function() {
            this.set_ranges();
            this.compute_view_padding();
            //TODO: The call to draw has to be changed to something less
            //expensive.
            this.draw();
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
            if(pixel === undefined) {
                this.model.set("selected", null);
                this.touch();
                return;
            }

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

            this.selector_model.set("selected", [idx_start, idx_end]);
            this.selector.touch();
        },
        draw: function() {
            this.set_ranges();
            this.display_rows = this.el.selectAll(".heatmaprow")
                .data(this.model.rows);
            var that = this;
            var num_rows = this.model.rows.length;
            var row_scale = this.scales["row"];
            var column_scale = this.scales["column"];

            var cell_width = column_scale.scale(this.model.columns[1]) - column_scale.scale(this.model.columns[0]);
            var cell_height = row_scale.scale(this.model.rows[1]) - row_scale.scale(this.model.rows[0]);;

            this.display_rows.enter().append("g")
                .attr("class", "heatmaprow");
            this.display_rows
                .attr("transform", function(d, i)
                                    {
                                        return "translate(0, " + (row_scale.scale(d) - (cell_height / 2.0)) + ")";
                                    });

            this.display_cells = this.display_rows.selectAll(".heatmapcell")
                .data(function(d, i) { return that.model.columns.map(function(col, ind)
                                        {
                                            return that.model.mark_data[i*num_rows+ind];
                                        });
                                     });
            this.display_cells.enter()
                .append("rect")
                .attr("class", "heatmapcell");

            this.display_cells
                .attr({"x": function(d, i)
                             {
                                return column_scale.scale(d['column']) - (cell_width / 2.0);
                             },
                       "y": 0})
                .attr("width", cell_width)
                .attr("height", cell_height)
                .style("fill", function(d) { return that.get_fill(d); })
                .style("stroke", "black");
        },
        get_fill: function(dat) {
            return this.scales['color'].scale(dat['data']);
        },
        compute_view_padding: function() {
            //This function returns a dictionary with keys as the scales and
            //value as the pixel padding required for the rendering of the
            //mark.
            var y_scale = this.scales["row"];
            var x_scale = this.scales["column"];
            var y_padding = this.get_padding_for_scale(y_scale, this.model.rows, this.parent.plotarea_height);
            var x_padding = this.get_padding_for_scale(x_scale, this.model.columns, this.parent.plotarea_width);
            if(x_padding !== this.x_padding || y_padding != this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = y_padding;

                this.trigger("mark_padding_updated");
            }
		},
        get_padding_for_scale(scale, data_arr, extent) {
            // scale is a view of the scale object and not just the function.
            var start_padding = 0;
            var end_padding = 0;
            var count = data_arr.length;

            if(scale.model.type === "ordinal") {
                return scale.scale.rangeBand() / 2;
            } else {
                return extent / (data_arr.length * 2.0);
            }
        },
        process_interactions: function() {
            /*
            var interactions = this.model.get("interactions");
            if(_.isEmpty(interactions)) {
                //set all the event listeners to blank functions
                this.reset_interactions();
            } else {
                if(interactions["click"] !== undefined &&
                  interactions["click"] !== null) {
                    if(interactions["click"] === "tooltip") {
                        this.event_listeners["element_clicked"] = function() {
                            return this.refresh_tooltip(true);
                        };
                        this.event_listeners["parent_clicked"] = this.hide_tooltip;
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
                if(interactions["legend_hover"] !== undefined &&
                  interactions["legend_hover"] !== null) {
                    if(interactions["legend_hover"] === "highlight_axes") {
                        this.event_listeners["legend_mouse_over"] = _.bind(this.highlight_axes, this);
                        this.event_listeners["legend_mouse_out"] = _.bind(this.unhighlight_axes, this);
                    }
                } else {
                    this.reset_legend_hover();
                }
            }
           */
        },
    });

    return {
        GridHeatMap: GridHeatMap,
    };
});

