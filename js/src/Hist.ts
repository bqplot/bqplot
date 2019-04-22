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

import * as _ from 'underscore';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"));
// Hack to fix problem with webpack providing multiple d3 objects
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);

import * as utils from './utils';
import { Mark } from './Mark';
import { HistModel } from './HistModel'

export class Hist extends Mark {

    render() {
        const base_creation_promise = super.render();
        this.bars_selected = [];

        this.display_el_classes = ["rect", "legendtext"];

        const that = this;
        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        return base_creation_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.draw();
            that.update_selected(that.model, that.model.get("selected"));
        });
    }

    set_ranges() {
        const x_scale = this.scales.sample;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        const y_scale = this.scales.count;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
    }

    set_positional_scales() {
        // In the case of Hist, a change in the "sample" scale triggers
        // a full "update_data" instead of a simple redraw.
        const x_scale = this.scales.sample,
            y_scale = this.scales.count;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.model.update_data(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    }

    create_listeners() {
        super.create_listeners();
        this.d3el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
            .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move"); }, this))
            .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out"); }, this));

        this.listenTo(this.model, "change:tooltip", this.create_tooltip);
        this.listenTo(this.model, "data_updated", this.draw);
        this.listenTo(this.model, "change:colors",this.update_colors);
        this.model.on_some_change(["stroke", "opacities"], this.update_stroke_and_opacities, this);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    }

    process_click(interaction) {
        super.process_click(interaction);
        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.bar_click_handler;
        }
    }

    update_colors(model, colors) {
        this.d3el.selectAll(".bargroup").selectAll("rect")
          .style("fill", this.get_colors(0));
        if (model.get("labels") && colors.length > 1) {
            this.d3el.selectAll(".bargroup").selectAll("text")
              .style("fill", this.get_colors(1));
        }
        if (this.legend_el) {
            this.legend_el.selectAll("rect")
              .style("fill", this.get_colors(0));
            this.legend_el.selectAll("text")
              .style("fill", this.get_colors(0));
        }
    }

    update_stroke_and_opacities() {
        const stroke = this.model.get("stroke");
        const opacities = this.model.get("opacities");
        this.d3el.selectAll(".rect")
          .style("stroke", stroke)
          .style("opacity", function(d, i) {
                return opacities[i];
          });
    }

    calculate_bar_width() {
        const x_scale = this.scales.sample;
        let bar_width = (x_scale.scale(this.model.max_x) -
                         x_scale.scale(this.model.min_x)) / this.model.num_bins;
        if (bar_width >= 10) {
            bar_width -= 2;
        }
        return bar_width;
    }

    relayout() {
        this.set_ranges();

        const x_scale = this.scales.sample,
            y_scale = this.scales.count;
        this.d3el.selectAll(".bargroup")
            .attr("transform", function(d) {
              return "translate(" + x_scale.scale(d.x0) +
                              "," + y_scale.scale(d.y) + ")";
            });
        const bar_width = this.calculate_bar_width();
        this.d3el.selectAll(".bargroup").select("rect")
          .transition("relayout")
          .duration(this.parent.model.get("animation_duration"))
          .attr("x", 2)
          .attr("width", bar_width)
          .attr("height", function(d) {
              return y_scale.scale(0) - y_scale.scale(d.y);
          });
    }

    draw() {
        this.set_ranges();
        const colors = this.model.get("colors");
        const fill_color = colors[0];

        const indices = [];
        this.model.mark_data.forEach(function(d, i) {
            indices.push(i);
        });

        const x_scale = this.scales.sample,
            y_scale = this.scales.count;
        const that = this;
        const bar_width = this.calculate_bar_width();
        let bar_groups = this.d3el.selectAll(".bargroup")
            .data(this.model.mark_data);

        bar_groups.exit().remove();

        const bars_added = bar_groups.enter()
          .append("g")
          .attr("class","bargroup");

        // initial values for width and height are set for animation
        bars_added.append("rect")
          .attr("class", "rect")
          .attr("x", 2)
          .attr("width", 0)
          .attr("height", 0);

        bar_groups = bars_added.merge(bar_groups);

        bar_groups.attr("transform", function(d) {
              return "translate(" + x_scale.scale(d.x0) + "," +
                                    y_scale.scale(d.y) + ")";
          });

        bar_groups.select(".rect")
          .style("fill", fill_color)
          .on("click", function(d, i) {
              return that.event_dispatcher("element_clicked", {
                  "data": d, "index": i
              });
          })
          .attr("id", function(d, i) { return "rect" + i; })
          .transition("draw")
          .duration(this.parent.model.get("animation_duration"))
          .attr("width", bar_width)
          .attr("height", function(d) {
              return y_scale.scale(0) - y_scale.scale(d.y);
          });


        //bin_pixels contains the pixel values of the start points of each
        //of the bins and the end point of the last bin.
        this.bin_pixels = this.model.x_bins.map(function(el) {
            return x_scale.scale(el) + x_scale.offset;
        });
        // pixel coords contains the [x0, x1] and [y0, y1] of each bin
        this.pixel_coords = this.model.mark_data.map(function(d) {
            const x = x_scale.scale(d.x0);
            return [[x, x+bar_width], [0, d.y].map(y_scale.scale)];
        });
        this.update_stroke_and_opacities();
    }

    bar_click_handler (args) {
        const index = args.index;
        //code repeated from bars. We should unify the two.
        const that = this;
        const idx = this.bars_selected;
        let selected: number[] = idx ? utils.deepCopy(idx) : [];
        // index of bar i. Checking if it is already present in the list.
        const elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
        if(elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the element from the list
            selected.splice(elem_index, 1);
        } else {
            if(d3GetEvent().shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if(elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //bar which has been clicked
                const min_index = (selected.length !== 0) ?
                    d3.min(selected) : -1;
                const max_index = (selected.length !== 0) ?
                    d3.max(selected) : that.model.mark_data.length;
                if(index > max_index){
                    _.range(max_index+1, index+1).forEach(function(i) {
                        selected.push(i);
                    });
                } else if(index < min_index){
                    _.range(index, min_index).forEach(function(i) {
                        selected.push(i);
                    });
                }
            } else if(accelKey) {
                //If accel is pressed and the bar is not already selcted
                //add the bar to the list of selected bars.
                selected.push(index);
            }
            // updating the array containing the bar indexes selected
            // and updating the style
            else {
                //if accel is not pressed, then clear the selected ones
                //and set the current element to the selected
                selected = [];
                selected.push(index);
            }
        }
        this.bars_selected = selected;
        this.model.set("selected", ((selected.length === 0) ? null :
                                     this.calc_data_indices(selected)),
                                    {updated_view: this});
        this.touch();
        let e = d3GetEvent();
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        this.legend_el = elem.selectAll(".legend" + this.uuid)
            .data([this.model.mark_data[0]]);

        const that = this;
        const rect_dim = inter_y_disp * 0.8;
        const new_legend = this.legend_el.enter()
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

        new_legend.append("rect")
            .style("fill", function(d, i) {
                return that.get_colors(i);
            })
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", rect_dim)
            .attr("height", rect_dim);

        new_legend.append("text")
          .attr("class","legendtext")
          .attr("x", rect_dim * 1.2)
          .attr("y", rect_dim / 2)
          .attr("dy", "0.35em")
          .text(function(d, i) {
              return that.model.get("labels")[i];
          })
          .style("fill", function(d,i) {
              return that.get_colors(i);
          });

        new_legend.merge(this.legend_el);

        const max_length = d3.max(this.model.get("labels"), function(d: any[]) {
            return d.length;
        });

        this.legend_el.exit().remove();
        return [1, max_length];
    }

    reset_colors(index, color) {
        const rects = this.d3el.selectAll("#rect"+index);
        rects.style("fill", color);
    }

    update_selected(model, value) {
        if(value === undefined || value === null || value.length === 0) {
            //reset the color of everything if selected is blank
            this.update_selected_colors([]);
            return;
        } else {
            const indices = this.calc_bar_indices_from_data_idx(value);
            this.update_selected_colors(indices);
        }
    }

    update_selected_colors(indices) {
        // listen to changes of selected and draw itself
        const colors = this.model.get("colors");
        const select_color = colors.length > 1 ? colors[1] : "red";
        const fill_color = colors[0];
        this.d3el.selectAll(".bargroup");
        const that = this;
        _.difference(_.range(0, this.model.num_bins), indices)
            .forEach(function(d) {
                that.d3el.selectAll("#rect" + d).style("fill", fill_color);
            });
        indices.forEach(function(d) {
            that.d3el.selectAll("#rect" + d).style("fill", select_color);
        });
    }

    invert_point(pixel) {
        // Sets the selected to the data contained in the bin closest
        // to the value of the pixel.
        // Used by Index Selector.
        if(pixel === undefined) {
            this.model.set("selected", null);
            this.touch();
            return;
        }

        const bar_width = this.calculate_bar_width();

        //adding "bar_width / 2.0" to bin_pixels as we need to select the
        //bar whose center is closest to the current location of the mouse.
        const abs_diff = this.bin_pixels.map(function(elem) {
            return Math.abs(elem + bar_width / 2.0 - pixel);
        });
        const sel_index = abs_diff.indexOf(d3.min(abs_diff));
        this.model.set("selected", this.calc_data_indices([sel_index]));
        this.touch();
    }

    selector_changed(point_selector, rect_selector) {
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        const pixels = this.pixel_coords;
        const indices = _.range(pixels.length);
        const selected_bins = _.filter(indices, function(index) {
            return rect_selector(pixels[index]);
        });
        this.model.set("selected", this.calc_data_indices(selected_bins));
        this.touch();
    }

    calc_data_indices(indices) {
        //input is a list of indices corresponding to the bars. Output is
        //the list of indices in the data
        const intervals = this.reduce_intervals(indices);
        if(intervals.length === 0) {
            return [];
        }

        const x_data = this.model.get("sample");
        const num_intervals = intervals.length;
        const selected = _.filter(_.range(x_data.length), function(index) {
            const elem = x_data[index];
            for(let iter=0; iter < num_intervals; iter++) {
                if(elem <= intervals[iter][1] && elem >= intervals[iter][0]) {
                    return true;
                }
            }
            return false;
        });
        return selected;
    }

    reduce_intervals(indices) {
        //for a series of indices, reduces them to the minimum possible
        //intervals on which the search can be performed.
        //return value is an array of arrays containing the start and end
        //points of the intervals represented by the indices.
        const intervals = [];
        if(indices.length !== 0) {
            indices.sort();
            let start_index = indices[0];
            let end_index = indices[0];
            for(let iter = 1; iter < indices.length; iter++) {
                if(indices[iter] === (end_index + 1)) {
                    end_index++;
                } else {
                    intervals.push([this.model.x_bins[start_index],
                                    this.model.x_bins[end_index + 1]]);
                    start_index = end_index = indices[iter];
                }
            }
            intervals.push([this.model.x_bins[start_index],
                            this.model.x_bins[end_index + 1]]);
        }
        return intervals;
    }

    calc_data_indices_from_data_range(start_pixel, end_pixel) {
        //Input is pixel values and output is the list of indices for which
        //the `sample` value lies in the interval
        const idx_start = d3.max([0, d3.bisectLeft(this.bin_pixels, start_pixel) - 1]);
        const idx_end = d3.min([this.model.num_bins, d3.bisectRight(this.bin_pixels, end_pixel)]);

        const x_data = this.model.get("sample");
        const that = this;
        return _.filter(_.range(x_data.length), function(iter) {
            return (x_data[iter] >= that.model.x_bins[idx_start] &&
                    x_data[iter] <= that.model.x_bins[idx_end]);
        });
    }

    calc_bar_indices_from_data_idx(selected) {
        //function to calculate bar indices for a given list of data
        //indices
        const x_data = this.model.get("sample");
        const data = selected.map(function(idx) {
            return x_data[idx];
        });
        let bar_indices = [];
        for(let iter = 0; iter < data.length; iter++) {
            //x_bins is of length num_bars+1. So if the max element is
            //selected, we get a bar index which is equal to num_bars.
            let index = Math.min(_.indexOf(this.model.x_bins, data[iter], true),
                                 this.model.x_bins.length - 2);
            //if the data point is not one of the bins, then find the index
            //where it is to be inserted.
            if(index === -1) {
                index = _.sortedIndex(this.model.x_bins, data[iter]) - 1;
            }
            bar_indices.push(index);
        }
        bar_indices.sort();
        bar_indices = _.uniq(bar_indices, true);
        return bar_indices;
    }

    reset_selection() {
        this.bars_selected = [];
        this.model.set("selected", null);
        this.touch();
    }

    clear_style(style_dict, indices?, elements?) {
    }

    compute_view_padding() {
    }

    set_default_style(indices, elements?) {
    }

    set_style_on_elements(style, indices, elements?) {
    }

    bars_selected: Array<number>;
    legend_el: any;
    bin_pixels: Array<number>;
    pixel_coords: Array<Array<number>>;

    model: HistModel;
}
