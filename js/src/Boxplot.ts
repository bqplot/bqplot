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
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"));
// Hack to fix problem with webpack providing multiple d3 objects
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import { Mark } from './Mark';
import { BoxplotModel } from './BoxplotModel';

export class Boxplot extends Mark {

    render() {
        const base_creation_promise = super.render.apply(this);
        const that = this;

        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");

        return base_creation_promise.then(function() {
            that.event_listeners = {};
            that.create_listeners();
            that.process_interactions();
            that.draw();
        }, null);
    }

    set_ranges() {
        const x_scale = this.scales.x;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        const y_scale = this.scales.y;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
    }

    set_positional_scales() {

        const x_scale = this.scales.x;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });

        const y_scale = this.scales.y;
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    }

    create_listeners() {
        super.create_listeners.apply(this);
        this.listenTo(this.model, "change:stroke", this.update_stroke);
        this.listenTo(this.model, "change:opacities", this.update_opacities);
        this.listenTo(this.model, "change:marker", this.update_marker);
        this.listenTo(this.model, "change:outlier_fill_color", this.update_outlier_fill_color);
        this.listenTo(this.model, "change:box_fill_color", this.update_box_fill_color);
        this.listenTo(this.model, "data_updated", this.draw);
        this.listenTo(this.model, "change:box_width", this.update_box_width);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    }

    update_stroke() {
        const stroke = this.model.get("stroke");
        this.d3el.selectAll(".boxplot").selectAll("path, rect")
            .style("stroke", stroke);

        this.d3el.selectAll(".outlier").style("stroke", stroke);

        if (this.legend_el) {
            this.legend_el.selectAll("path").attr("stroke", stroke);
            this.legend_el.selectAll("text").style("fill", stroke);
        }
    }

    update_outlier_fill_color() {
        this.d3el.selectAll(".outlier")
               .style("fill", this.model.get("outlier_fill_color"));
    }

    update_box_fill_color() {
        this.d3el.selectAll(".box")
                .style("fill", this.model.get("box_fill_color"));
    }

    update_opacities() {
        const opacities = this.model.get("opacities");
        this.d3el.selectAll(".boxplot").style("opacity", function(d, i) {
                                                return opacities[i];
                                           });

        if (this.legend_el) {
            this.legend_el.selectAll("path").attr("opacity", function(d, i) {
                                                    return opacities[i];
                                                 });
        }
    }

    update_marker() {
        const marker = this.model.get("marker");

        if (this.legend_el && this.rect_dim) {
            // Draw icon for legend
            this.draw_mark_paths(marker, this.rect_dim/2);
        }

        // Redraw existing marks
        this.draw_mark_paths(marker, this.calculate_mark_max_width());
    }

    get_box_width() {
        let width = this.model.get("box_width");

        // null box_width means auto calculated box width
        if (!width) {
            const plotWidth = this.parent.plotarea_width;
            const maxWidth = plotWidth / 10.0;
            width = plotWidth / (this.model.mark_data.length + 1) / 1.5;
            width = Math.min(width, maxWidth);
        }

        return width;
    }

    compute_view_padding() {
        //This function sets the padding for the view through the constiables
        //x_padding and y_padding which are view specific paddings in pixel
        const x_padding = this.get_box_width() / 2.0 + 1;
        if (x_padding !== this.x_padding) {
            this.x_padding = x_padding;
            this.trigger("mark_padding_updated");
        }
    }

    update_box_width() {
        this.compute_view_padding();
        this.draw();
    }

    update_idx_selected(model, value) {
        this.selected_indices = value;
        this.apply_styles(value);
    }

    set_style_on_elements(style, indices) {
        if(indices === undefined || indices.length === 0) {
            return;
        }
        let elements = this.d3el.selectAll(".box");
        elements = elements.filter(function(data, index) {
            return indices.indexOf(index) != -1;
        });
        elements.styles(style);
    }

    set_default_style(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        this.update_outlier_fill_color();
        this.update_box_fill_color();
        this.update_stroke();
        this.update_opacities();
    }

    clear_style(style_dict, indices) {
        let elements = this.d3el.selectAll(".boxplot");
        if(indices !== undefined) {
            elements = elements.filter(function(d, index) {
                return indices.indexOf(index) != -1;
            });
        }
        const clearing_style = {};
        for(let key in style_dict) {
            clearing_style[key] = null;
        }
        elements.styles(clearing_style);
    }

    style_updated(new_style, indices) {
        this.set_default_style(indices);
        this.set_style_on_elements(new_style, indices);
    }

    selected_style_updated(model, style) {
        this.selected_style = style;
        this.style_updated(style, this.selected_indices);
    }

    unselected_style_updated(model, style) {
        this.unselected_style = style;
        const sel_indices = this.selected_indices;
        const unselected_indices = (sel_indices ?
            _.range(this.model.mark_data.length)
                .filter(function(index) {
                    return sel_indices.indexOf(index) == -1;
                }): []);
        this.style_updated(style, unselected_indices);
    }

    //FIXME: should use the selected_style logic
    update_selected_colors(selected_indices) {
        const stroke = this.model.get("stroke");
        const selected_stroke = stroke;
        this.d3el.selectAll(".boxplot")
            .style("stroke", function(d, i) {
                return (selected_indices.indexOf(i) > -1) ? selected_stroke : stroke;
            })
    }

    selector_changed(point_selector, rect_selector) {
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            this.update_selected_colors([])
            return [];
        }
        const pixels = this.pixel_coords;
        const indices = _.range(pixels.length);
        const selected = _.filter(indices, function(index) {
            return rect_selector(pixels[index]);
        });
        this.update_selected_colors(selected)
        this.model.set("selected", selected);
        this.touch();
    }

    invert_point(pixel) {
        if(pixel === undefined) {
            this.update_selected_colors([]);
            this.model.set("selected", null);
            this.touch();
            return;
        }

        const abs_diff = this.x_pixels.map(function(elem) { return Math.abs(elem - pixel); });
        const sel_index = abs_diff.indexOf(d3.min(abs_diff));

        this.model.set("selected", [sel_index]);
        this.update_selected_colors([sel_index]);
        this.touch();
        return sel_index;
    }

    prepareBoxPlots () {
        // Sets plot data on this.plotData and this.outlierData

        const auto_detect_outliers = this.model.get("auto_detect_outliers") !== false;
        const x_scale = this.scales.x;
        const y_scale = this.scales.y;

       // convert the domain data to the boxes to be drawn on the screen
       // find the quantiles, min/max and outliers for the box plot
        this.plotData = [];
        this.outlierData = [];
        for(let i = 0; i<this.model.mark_data.length; ++i) {
            const values = this.model.mark_data[i];

            const displayValue: any = {};

            displayValue.x         = x_scale.scale(values[0]);
            displayValue.boxUpper  = y_scale.scale(d3.quantile(values[1], 0.75));
            displayValue.boxLower  = y_scale.scale(d3.quantile(values[1], 0.25));
            displayValue.boxMedian = y_scale.scale(d3.quantile(values[1], 0.5));

            // The domain Y to screen Y is an inverse scale, so be aware of that
            // The max from the domain Y becomes min on the screen (display) scale
            const iqr = displayValue.boxLower - displayValue.boxUpper;
            const lowerBound = displayValue.boxLower + 1.5 * iqr;
            const upperBound = displayValue.boxUpper - 1.5 * iqr;

            displayValue.whiskerMax = Number.MAX_VALUE;
            displayValue.whiskerMin = Number.MIN_VALUE;

            for (let j=0; j<values[1].length; ++j)  {

               const plotY = y_scale.scale(values[1][j]);

               // Find the outlier
               if (auto_detect_outliers && (plotY > lowerBound || plotY  < upperBound)) {
                   this.outlierData.push({x: x_scale.scale(values[0]),
                                          y: plotY});
               } else {
                    // Find the whisker points max and min from normal data.
                    // ( exclude the outliers )
                    if ( plotY > displayValue.whiskerMin ) {
                        displayValue.whiskerMin = plotY;
                    }

                    if ( plotY < displayValue.whiskerMax ) {
                        displayValue.whiskerMax = plotY;
                    }
               }
            }
            this.plotData.push(displayValue);
        }
    }

    process_click(interaction) {
        super.process_click.apply(this, [interaction]);

        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.box_click_handler;
        }
    }

    box_click_handler(args) {
        const index = args.index;
        const that = this;
        const idx = this.model.get("selected") || [];
        let selected: number[] = Array.from(idx);
        // index of box i. Checking if it is already present in the list.
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
                //box which has been clicked
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
                //If accel is pressed and the box is not already selected
                //add the box to the list of selected boxes.
                selected.push(index);
            }
            // updating the array containing the box indexes selected
            // and updating the style
            else {
                //if accel is not pressed, then clear the selected ones
                //and set the current element to the selected
                selected = [];
                selected.push(index);
            }
        }
        this.model.set("selected",
                       ((selected.length === 0) ? null : selected),
                       {updated_view: this});
        this.touch();
        const e = d3GetEvent();
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    }

    reset_selection() {
        this.model.set("selected", null);
        this.selected_indices = null;
        this.touch();
    }

    update_selected(model, value) {
        this.selected_indices = value;
        this.apply_styles();
    }

    draw() {
        this.set_ranges();
        const x_scale = this.scales.x;
        // get the visual representation of boxplots, set as state
        this.prepareBoxPlots();

        // Draw the visual elements with data which was bound
        this.draw_mark_paths(".boxplot", this.d3el);
        // Keep the pixel coordinates of the boxes, for interactions.
        this.x_pixels = this.model.mark_data.map(function(el) { return x_scale.scale(el[0]) + x_scale.offset; });
        const width = this.get_box_width() / 2;
        this.pixel_coords = this.plotData.map(function(d) {
            return [[d.x - width, d.x + width],
                    [d.boxLower, d.boxUpper]]
        });
    }

    draw_mark_paths(parentClass, selector) {
        const that = this;
        const plotData = this.plotData;
        const outlierData = this.outlierData;

        const color = this.model.get("color");
        const boxplot = this.d3el.selectAll(parentClass).data(plotData);

        const fillcolor = this.model.get("box_fill_color");
        // Create new
        const new_boxplots = boxplot.enter()
            .append("g")
            .attr ("class", "boxplot")
            .attr ("id", function(d, i) { return "boxplot" + i; });

        ///////////////////////////////////////////////////////////////////
        //
        //  We translate the whole element of 'boxplot' to the x location
        //  and then scale each of these elements with Y scale.
        //
        //       ( )    <--- outliers (as circles)
        //       ( )
        //
        //     -------  <--- whisker_max_end (path as the max)
        //        |
        //        |     <--- whisker_max (path from top of the box to max)
        //        |
        //    ---------
        //    |       |
        //    |       |
        //    |       | <--- box (as a rect)
        //    |       |
        //    |       |
        //    ---------
        //        |
        //        |     <--- whisker_min (path from bottom of the box to min)
        //        |
        //     -------  <--- whisker_min_end (path at min value)
        //
        ///////////////////////////////////////////////////////////////////

        new_boxplots.append("path").attr("class", "whisker_max");
        new_boxplots.append("path").attr("class", "whisker_max_end");
        new_boxplots.append("path").attr("class", "whisker_min");
        new_boxplots.append("path").attr("class", "whisker_min_end");
        new_boxplots.append("rect").attr("class", "box");
        new_boxplots.append("path").attr("class", "median_line");
        new_boxplots.append("g").attr("class", "outliers");

        const scaleX = this.scales.x;
        const xOffset = scaleX.model.type === "ordinal" ? scaleX.scale.bandwidth() / 2 : 0;

        selector.selectAll(".boxplot").data(plotData)
            .style("stroke", this.model.get("stroke"))
            .style("opacity", color)
            .attr ("transform", function (d, i) {
                return "translate(" + (d.x + xOffset) + ", 0)";
            });

       //Box
        const width = this.get_box_width();

        selector.selectAll(".box").data(plotData)
            .style("fill", fillcolor)
            .attr("x", -width /2)
            .attr("width", width)
            .attr("y", function(d, i) {
                return d.boxUpper;
            })
            .attr("height", function (d, i) {
                return (d.boxLower - d.boxUpper);
            }).on("click", function(d, i) {
                return that.event_dispatcher("element_clicked",
                                            {"data": d, "index": i});
            });

        //Median line
        selector.selectAll(".median_line").data(plotData)
            .style("stroke-width", 2)
            .attr("d", function(d, i) {

            const x = 0;
            const medianY = d.boxMedian;

            return  "M"  + (x - width/2) + "," +
                    medianY +  " L" + (x + width /2)  + "," +  medianY;
          });

          //Max and Min Whiskers
          //Max to top of the Box
          selector.selectAll(".whisker_max").data(plotData)
              .attr("d", function(d, i) {

              const x = 0;
              // The price points are sorted so the last element is the max
              const maxY = d.whiskerMax;
              const boxY = d.boxUpper;

              return "M"  + x + "," +  maxY +  " L" + x + "," +  boxY;
           }).attr("stroke-dasharray", function(d, i) {
              return  "5,5";
           });

          selector.selectAll(".whisker_max_end").data(plotData)
              .attr("d", function(d, i) {

              const x = 0;
              // The price points are sorted, so 1st element is min
              const maxY = (d.whiskerMax);

              return "M"  + (x - width/2) + "," +  maxY +  " L" + (x + width/2) + "," +  maxY;
           });

          //Min to the bottom of the box
          //Max to top of the Box
          selector.selectAll(".whisker_min").data(plotData)
              .attr("d", function(d, i) {

              const x = 0;
              // The price points are sorted, so 1st element is min
              const minY = (d.whiskerMin);
              const boxY = (d.boxLower);

              return "M"  + x + "," +  minY +  " L" + x + "," +  boxY;
          }).attr("stroke-dasharray", function(d, i) {
              return  "5,5";
          });

          selector.selectAll(".whisker_min_end").data(plotData)
              .attr("d", function(d, i) {

              const x = 0;
              // The price points are sorted, so 1st element is min
              const minY = (d.whiskerMin);

              return "M"  + (x - width/2) + "," +  minY +  " L" + (x + width/2) + "," +  minY;
          });

          boxplot.exit().remove();

          // Add the outliers group
          const outliers = selector.selectAll(".outlier")
              .data(outlierData);

          // Add/remove elements as needed
          outliers.enter()
            .append("circle")
              .attr("class", "outlier");
          outliers.exit()
            .remove();

          // Set outlier data
          selector.selectAll(".outlier").data(outlierData)
              .style("fill", this.model.get("outlier_fill_color"))
              .attr("cx", function(d) {
                return d.x + xOffset;
              })
              .attr("r", 3)
              .attr("cy", function(d) {
                return d.y;
              });

          this.apply_styles(this.selected_indices);
    }

    calculate_mark_max_width() {

        const that = this;
        const x_scale = this.scales.x;
        let min_distance = Infinity;
        for(let i = 1; i < that.model.mark_data.length; i++) {
            let dist = x_scale.scale(that.model.mark_data[i][0]) -
                       x_scale.scale(that.model.mark_data[i-1][0]);
            dist = (dist < 0) ? (-1*dist) : dist;
            if(dist < min_distance) min_distance = dist;
        }

        let mark_width = 0;
        if(min_distance == Infinity) {
            mark_width = (x_scale.scale(this.model.max_x) -
                          x_scale.scale(this.model.min_x)) / 2;
        } else {
            mark_width = min_distance;
        }

        return mark_width;
    }

    relayout() {
        super.relayout.apply(this);
        this.set_ranges();
        this.compute_view_padding();
        this.d3el.select(".intselmouse")
            .attr("width", this.width)
            .attr("height", this.height);

        // We have to redraw every time that we relayout
        this.draw();
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        const stroke = this.model.get("stroke");
        this.rect_dim = inter_y_disp * 0.8;
        const that = this;

        this.legend_el = elem.selectAll(".legend" + this.uuid)
                              .data([this.model.mark_data]);

        const leg = this.legend_el.enter().append("g")
            .attr("transform", function(d, i) {
                return "translate(0, " + (i * inter_y_disp + y_disp) + ")";
            })
            .attr("class", "legend" + this.uuid)
            .on("mouseover", _.bind(this.highlight_axes, this))
            .on("mouseout", _.bind(this.unhighlight_axes, this));

        // Add stroke color and set position
        leg.selectAll("path")
            .attr("stroke", stroke)
            .attr("transform", "translate(" + (that.rect_dim/2) + ",0)");

        // Draw icon and text
        // this.draw_legend_icon(that.rect_dim, leg);
        this.legend_el.append("text")
            .attr("class", "legendtext")
            .attr("x", that.rect_dim * 1.2)
            .attr("y", that.rect_dim / 2)
            .attr("dy", "0.35em")
            .text(function(d, i) { return that.model.get("labels")[i]; })
            .style("fill", stroke);

        const max_length = d3.max(this.model.get("labels"), function(d: any[]) {
            return d.length;
        });

        this.legend_el.exit().remove();
        return [1, max_length];
    }

    height: any;
    legend_el: any;
    outlierData: any[];
    pixel_coords: any;
    plotData: any[];
    rect_dim: any
    width: any;
    x_pixels: any[];
    model: BoxplotModel;
}
