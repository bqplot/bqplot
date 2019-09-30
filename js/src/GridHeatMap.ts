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
import 'd3-selection-multi';
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"), require("d3-selection-multi"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import { Mark} from './Mark';
import { GridHeatMapModel } from './GridHeatMapModel'

export class GridHeatMap extends Mark {

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

        this.selected_indices = this.model.get("selected");
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");
        this.anchor_style = this.model.get("anchor_style");
        this.display_el_classes = ["heatmapcell"];
        return base_render_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.compute_view_padding();
            that.draw();
        });
    }

    initialize_additional_scales() {
        const color_scale = this.scales.color;
        if(color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                this.apply_styles();
            });
            color_scale.on("color_scale_range_changed", this.apply_styles, this);
        }
    }

    set_ranges() {
        const row_scale = this.scales.row;
        if(row_scale) {
            // The y_range is reversed because we want the first row
            // to start at the top of the plotarea and not the bottom.
            const row_range = this.parent.padded_range("y", row_scale.model);
            row_scale.set_range(row_range);
            // row_scale.set_range([row_range[1], row_range[0]]);
        }
        const col_scale = this.scales.column;
        if(col_scale) {
            col_scale.set_range(this.parent.padded_range("x", col_scale.model));
        }
    }

    set_positional_scales() {
        const x_scale = this.scales.column, y_scale = this.scales.row;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    }

    expand_scale_domain(scale, data, mode, start) {
        // This function expands the domain so that the heatmap has the
        // minimum area needed to draw itself.
        let current_pixels;
        let min_diff;
        if(mode === "expand_one") {
            current_pixels = data.map(function(el) {
                return scale.scale(el);
            });
            const diffs = current_pixels.slice(1).map(function(el, index) {
                return el - current_pixels[index];
            });
            //TODO: Explain what is going on here.
            min_diff = 0;
            if(diffs[0] < 0) {
                start = !(start);
                // diffs are negative. So max instead of min
                min_diff = d3.max(diffs);
            } else {
                min_diff = d3.min(diffs);
            }
            if(start) {
                const new_pixel = current_pixels[current_pixels.length - 1] + min_diff;
                return [data[0], scale.invert(new_pixel)];
            } else {
                const new_pixel = current_pixels[0] - min_diff;
                return [scale.invert(new_pixel), data[current_pixels.length - 1]];
            }
        } else if(mode === "expand_two") {
            current_pixels = data.map(function(el) {
                return scale.scale(el);
            });
            min_diff = d3.min(current_pixels.slice(1).map(function(el, index) {
                return el - current_pixels[index];
            }));
            const new_end = current_pixels[current_pixels.length - 1] + min_diff;
            const new_start = current_pixels[0] - min_diff;
            return [scale.invert(new_start), scale.invert(new_end)];
        }
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:stroke", this.update_stroke);
        this.listenTo(this.model, "change:opacity", this.update_opacity);

        this.d3el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
            .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move"); }, this))
            .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out"); }, this));
        this.listenTo(this.model, "data_updated", this.draw);
        this.listenTo(this.model, "change:tooltip", this.create_tooltip);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
        this.model.on_some_change(["display_format", "font_style"],
                                  this.update_labels, this);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
    }

    click_handler (args) {
        const num_cols = this.model.colors[0].length;
        const index = args.row_num * num_cols + args.column_num;
        const row = args.row_num;
        const column = args.column_num;
        const that = this;
        let idx = this.model.get("selected") || [];
        let selected = this._cell_nums_from_indices(Array.from(idx));
        const elem_index = selected.indexOf(index);
        const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
        //TODO: This is a shim for when accelKey is supported by chrome.
        // index of slice i. Checking if it is already present in the
        // list
        if(elem_index > -1 && accelKey) {
        // if the index is already selected and if ctrl key is
        // pressed, remove the element from the list
            idx.splice(elem_index, 1);
        } else {
            if(!accelKey) {
                selected = [];
                idx = [];
            }
            idx.push([row, column]);
            selected.push(that._cell_nums_from_indices([[row, column]])[0]);
            if(d3GetEvent().shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if(elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //slice which has been clicked
                const row_index = (selected.length !== 0) ?
                    that.anchor_cell_index[0] : row;
                const col_index = (selected.length !== 0) ?
                    that.anchor_cell_index[1] : column;
                _.range(Math.min(row, row_index), Math.max(row, row_index)+1).forEach(function(i) {
                    _.range(Math.min(column, col_index), Math.max(column, col_index)+1).forEach(function(j) {
                        const cell_num = that._cell_nums_from_indices([[i, j]])[0];
                        if (selected.indexOf(cell_num) === -1) {
                            selected.push(cell_num);
                            idx.push([i, j]);
                        }
                    })
                });
            } else {
                // updating the array containing the slice indexes selected
                // and updating the style
                this.anchor_cell_index = [row, column];
            }
        }
        this.model.set("selected",
            ((idx.length === 0) ? null : idx),
            {updated_view: this});
        this.touch();
        let e = d3GetEvent();
        if(!e) {
            e = window.event;
        }
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
        this.selected_indices = idx;
        this.apply_styles();

    }

    update_selected(model, value) {
        this.selected_indices = value;
        this.apply_styles();
    }

    set_style_on_elements(style, indices, elements) {
        // If the index array is undefined or of length=0, exit the
        // function without doing anything
        if(!indices || indices.length === 0 && (!elements || elements.length === 0) ) {
            return;
        }
        // Also, return if the style object itself is blank
        if(Object.keys(style).length === 0) {
            return;
        }
        elements = (!elements || elements.length === 0) ? this._filter_cells_by_cell_num(this._cell_nums_from_indices(indices)) : elements;
        elements.styles(style);
    }

    set_default_style(indices, elements) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        //

        if(!indices || indices.length === 0 && (!elements || elements.length === 0) ) {
            return;
        }
        elements = (!elements || elements.length === 0) ? this._filter_cells_by_cell_num(this._cell_nums_from_indices(indices)) : elements;
        const stroke = this.model.get("stroke");
        const opacity = this.model.get("opacity");
        const that = this;

        elements.style("fill", function(d) {
             return that.get_element_fill(d);
          })
          .style("opacity", opacity)
          .style("stroke", stroke);
    }

    clear_style(style_dict, indices?, elements?) {
        // Function to clear the style of a dict on some or all the elements of the
        // chart.If indices is null, clears the style on all elements. If
        // not, clears on only the elements whose indices are mathcing.
        //
        // If elements are passed, then indices are ignored and the style
        // is cleared only on the elements that are passed.
        //
        // This can be used if we decide to accommodate more properties than
        // those set by default. Because those have to cleared specifically.
        //
        if(Object.keys(style_dict).length === 0) {
            // No style to clear
            return;
        }

        if(!elements || elements.length === 0) {
            if(indices) {
                elements = this._filter_cells_by_cell_num(this._cell_nums_from_indices(indices));
            } else {
                elements = this.display_cells;
            }
        }

        const clearing_style = {};
        for(let key in style_dict) {
            clearing_style[key] = null;
        }
        elements.styles(clearing_style);
    }

    _filter_cells_by_cell_num(cell_numbers) {
        if (cell_numbers === null || cell_numbers === undefined) {
            return [];
        }
        return this.display_cells.filter(function(el) {
           return (cell_numbers.indexOf(el._cell_num) !== -1);});
    }

    selected_style_updated(model, style) {
        this.selected_style = style;
        this.clear_style(model.previous("selected_style"), this.selected_indices, this.selected_elements);
        this.style_updated(style, this.selected_indices, this.selected_elements);
    }

    unselected_style_updated(model, style) {
        this.unselected_style = style;
        this.clear_style(model.previous("unselected_style"), [], this.unselected_elements);
        this.style_updated(style, [], this.unselected_elements);
    }

    apply_styles() {
        const num_rows = this.model.colors.length;
        const num_cols = this.model.colors[0].length;

        this.clear_style(this.selected_style);
        this.clear_style(this.unselected_style);
        this.clear_style(this.anchor_style);

        this.set_default_style([], this.display_cells);

        const selected_cell_nums = this._cell_nums_from_indices(this.selected_indices);
        const unsel_cell_nums = (selected_cell_nums === null || selected_cell_nums.length === 0) ? []
                                : _.difference(_.range(num_rows*num_cols), selected_cell_nums);

        this.selected_elements = this._filter_cells_by_cell_num(selected_cell_nums);
        this.set_style_on_elements(this.selected_style, this.selected_indices, this.selected_elements);

        this.unselected_elements = this._filter_cells_by_cell_num(unsel_cell_nums);
        this.set_style_on_elements(this.unselected_style, [], this.unselected_elements);

        if(this.anchor_cell_index !== null && this.anchor_cell_index !== undefined) {
            const anchor_num = this._cell_nums_from_indices([this.anchor_cell_index]);
            this.anchor_element = this._filter_cells_by_cell_num(anchor_num);
            this.set_style_on_elements(this.anchor_style, [], this.anchor_element);
        }
    }

    style_updated(new_style, indices, elements) {
        // reset the style of the elements and apply the new style
        this.set_default_style(indices, elements);
        this.set_style_on_elements(new_style, indices, elements);
    }

    reset_selection() {
        this.model.set("selected", null);
        this.touch();
        this.selected_indices = null;
        this.clear_style(this.selected_style);
        this.clear_style(this.unselected_style);
        this.clear_style(this.anchor_style);

        this.set_default_style([], this.display_cells);
    }

    relayout() {
        this.set_ranges();
        this.compute_view_padding();
        //TODO: The call to draw has to be changed to something less
        //expensive.
        this.draw();
    }

    _cell_nums_from_indices(indices) {
        if(indices === null || indices === undefined) {
            return null;
        }
        const num_cols = this.model.colors[0].length;
        return indices.map(function(i) { return i[0] * num_cols + i[1];});
    }

    invert_point(pixel) {
        // For now, an index selector is not supported for the heatmap
    }

    selector_changed(point_selector, rect_selector) {
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        const col_indices = _.range(this.model.colors[0].length);
        const row_indices = _.range(this.model.colors.length);
        const that = this;
        const sel_cols = _.filter(col_indices, function(index) {
            return rect_selector([that.column_pixels[index], []]);
        });
        const sel_rows = _.filter(row_indices, function(index) {
            return rect_selector([[], that.row_pixels[index]]);
        });
        let selected = sel_cols.map(function(s) {
            return sel_rows.map(function(r) {
                return [r, s];
            });
        });
        selected = _.flatten(selected, true);
        this.model.set("selected", selected);
        this.touch();
    }

    draw() {
        this.set_ranges();

        const that = this;
        const num_rows = this.model.colors.length;
        const num_cols = this.model.colors[0].length;

        const row_scale = this.scales.row;
        const column_scale = this.scales.column;

        const row_start_aligned = this.model.get("row_align") === "start";
        const col_start_aligned = this.model.get("column_align") === "start";
        let new_domain;

        if(this.model.modes.row !== "middle" && this.model.modes.row !== "boundaries") {
            new_domain = this.expand_scale_domain(row_scale, this.model.rows, this.model.modes.row, (row_start_aligned));
            if(d3.min(new_domain) < d3.min(row_scale.model.domain) || d3.max(new_domain) > d3.max(row_scale.model.domain)) {
                // Update domain if domain has changed
                row_scale.model.compute_and_set_domain(new_domain, row_scale.model.model_id);
            }
        }

        if(this.model.modes.column !== "middle" && this.model.modes.column !== "boundaries") {
            new_domain = this.expand_scale_domain(column_scale, this.model.columns, this.model.modes.column, col_start_aligned);
            if(d3.min(new_domain) < d3.min(column_scale.model.domain) || d3.max(new_domain) > d3.max(column_scale.model.domain)) {
                // Update domain if domain has changed
                column_scale.model.compute_and_set_domain(new_domain, column_scale.model.model_id);
            }
        }

        const row_plot_data = this.get_tile_plotting_data(row_scale, this.model.rows, this.model.modes.row, row_start_aligned);
        const column_plot_data = this.get_tile_plotting_data(column_scale, this.model.columns, this.model.modes.column, col_start_aligned);

        this.row_pixels = row_plot_data.start.map(function(d, i) {
            return [d, d + row_plot_data.widths[i]];
        })
        this.column_pixels = column_plot_data.start.map(function(d, i) {
            return [d, d + column_plot_data.widths[i]];
        })

        this.display_rows = this.d3el.selectAll(".heatmaprow")
            .data(_.range(num_rows))
            .join("g")
            .attr("class", "heatmaprow")
            .attr("transform", function(d) {
                return "translate(0, " + row_plot_data.start[d] + ")";
            });

        const col_nums = _.range(num_cols);
        const row_nums = _.range(num_rows);

        const data_array = row_nums.map(function(row) {
            return col_nums.map(function(col) {
                return that.model.mark_data[row * num_cols + col];
            });
        });

        this.display_cells = this.display_rows.selectAll(".heatmapcell")
            .data(function(d, i) {
                return data_array[i];
            })
            .join("rect")
            .attr("class", "heatmapcell")
            .on("click", _.bind(function() {
                this.event_dispatcher("element_clicked");
            }, this));

        this.display_cells
            .attr("x", function(d, i) { return column_plot_data.start[i]; })
            .attr("y", 0)
            .attr("width", function(d, i) { return column_plot_data.widths[i]; })
            .attr("height", function(d) { return row_plot_data.widths[d.row_num]; });

        // cell labels
        this.display_cell_labels = this.display_rows.selectAll(".heatmapcell_label")
            .data(function(d, i) {
                return data_array[i];
            })
            .join("text")
            .attr("class", "heatmapcell_label")
            .attr("x", function(d, i) { return column_plot_data.start[i] + column_plot_data.widths[i] / 2; })
            .attr("y", function(d) { return row_plot_data.widths[d.row_num] / 2; })
            .style("text-anchor", "middle")
            .style("fill", "black")
            .style("pointer-events", "none")
            .style("dominant-baseline", "central");

        this.apply_styles();
        this.update_labels();

        this.display_cells.on("click", function(d, i) {
            return that.event_dispatcher("element_clicked", {
                data: d.color,
                index: i,
                row_num: d.row_num,
                column_num: d.column_num
            });
        });
    }

    update_stroke(model, value) {
        this.display_cells.style("stroke", value);
    }

    update_opacity(model, value) {
        this.display_cells.style("opacity", value);
    }

    update_labels() {
        const display_format_str = this.model.get("display_format");
        const display_format = display_format_str ? d3.format(display_format_str) : null;

        let fonts = this.d3el.selectAll(".heatmapcell_label")
            .text(function(d, i) { return display_format ? display_format(d.color) : null; });

        const fontStyle = this.model.get("font_style");
        for (const styleKey in fontStyle) {
            fonts = fonts.style(styleKey, fontStyle[styleKey]);
        }
    }

    get_tile_plotting_data(scale, data, mode, start) {
        // This function returns the starting points and widths of the
        // cells based on the parameters passed.
        //
        // scale is the scale and data is the data for which the plot data
        // is to be generated. mode refers to the expansion of the data to
        // generate the plotting data and start is a boolean indicating the
        // alignment of the data w.r.t the cells.
        let start_points = [];
        let widths = [];
        data = Array.from(data); // copy to Array
        if(mode === "middle") {
            start_points = data.map(function(d) { return scale.scale(d); });
            widths = data.map(function(d) { return scale.scale.bandwidth(); });

            return {"start": start_points, "widths": widths};
        }
        if(mode === "boundaries") {
            const pixel_points = data.map(function(d) {
                return scale.scale(d);
            });
            widths = [];
            for (let i=1; i<pixel_points.length; ++i) {
                widths[i - 1] = Math.abs(pixel_points[i] - pixel_points[i - 1]);
            }
            start_points = pixel_points[1] > pixel_points[0] ?
                pixel_points.slice(0, -1) : pixel_points.slice(1);
            return {
                "start": start_points,
                "widths": widths
            };
        }
        if(mode === "expand_one") {
            let bounds;
            if(start) {
                // Start points remain the same as the data.
                start_points = data.map(function(d) {
                    return scale.scale(d);
                });
                widths = start_points.slice(1).map(function(d, ind) {
                    // Absolute value is required as the order of the data
                    // can be increasing or decreasing in terms of pixels
                    return Math.abs(d - start_points[ind]);
                });
                // Now we have n-1 widths. We have to add the last or the
                // first width depending on scale is increasing or
                // decreasing.
                bounds = d3.max(scale.scale.range());
                if(start_points[0] < start_points[1]) {
                    widths = Array.prototype.concat(widths, [Math.abs(bounds - d3.max(start_points))]);
                } else {
                    widths = Array.prototype.concat([Math.abs(bounds - d3.max(start_points))], widths);
                }
            } else {
                start_points = data.map(function(d) {
                    return scale.scale(d);
                });
                widths = start_points.slice(1).map(function(d, ind) {
                    // Absolute value is required as the order of the data
                    // can be increasing or decreasing in terms of pixels
                    return Math.abs(d - start_points[ind]);
                });
                bounds = d3.min(scale.scale.range());
                bounds = d3.min(scale.scale.range());
                if(start_points[1] > start_points[0]) {
                    // The point corresponding to the bounds is added at
                    // the start of the array. Hence it has to be added to
                    // the start_points and the last start_point can be
                    // removed.
                    start_points.unshift(Math.abs(bounds));
                    widths.splice(0, 0, start_points[1] - start_points[0]);
                    start_points.pop();
                } else {
                    // The point for the bounds is added to the end of the
                    // array. The first start point can now be removed as
                    // this will be the last end point.
                    widths = Array.prototype.concat(widths, [Math.abs(bounds - start_points.slice(-1)[0])]);
                    start_points = Array.prototype.concat(start_points, bounds);
                    start_points.splice(0, 1);
                }
            }
            return {
                "widths": widths,
                "start": start_points
            };
        }
        if(mode === "expand_two") {
            start_points = data.map(function(d) {
                return scale.scale(d);
            });

            const is_positive = (start_points[1] - start_points[0]) > 0;
            let bound: number = (is_positive) ? d3.min(scale.scale.range() as number[]) : d3.max(scale.scale.range() as number[]);
            start_points.splice(0, 0, bound);
            widths = start_points.slice(1).map(function(d, ind) {
                return Math.abs(d - start_points[ind]);
            });
            bound = (is_positive) ? d3.max(scale.scale.range() as number[]) : d3.min(scale.scale.range() as number[]);
            widths[widths.length] = Math.abs(bound - start_points.slice(-1)[0]);
            return {"start": start_points, "widths": widths};
        }
    }

    get_element_fill(dat) {
        if (dat.color === null) {
            return this.model.get("null_color")
        }
        return this.scales.color.scale(dat.color);
    }

    process_click(interaction) {
        super.process_click(interaction);
        if (interaction === 'select') {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.click_handler;
        }
    }

    compute_view_padding() {
    }

    anchor_style: any;
    anchor_cell_index: any;
    display_cells: any;
    display_cell_labels: any;
    selected_elements: any;
    unselected_elements: any;
    anchor_element: any;
    row_pixels: any;
    column_pixels: any;
    display_rows: any;
    model: GridHeatMapModel;
}
