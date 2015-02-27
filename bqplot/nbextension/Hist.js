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

    var Hist = MarkViewModule.Mark.extend({
        render: function() {
            var base_creation_promise = Hist.__super__.render.apply(this);
            this.bars_selected = [];

            var self = this;
            this.after_displayed(function() {
                this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
                this.create_tooltip();
            });

            return base_creation_promise.then(function() {
                self.create_listeners();
                self.draw();
            });
        },
        set_ranges: function() {
            var x_scale = this.scales["sample"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            }
            var y_scale = this.scales["counts"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            }
        },
        set_positional_scales: function() {
            // In the case of Hist, a change in the "sample" scale triggers
            // a full "update_data" instead of a simple redraw.
            var x_scale = this.scales["sample"],
                y_scale = this.scales["counts"];
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.model.update_data(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },
        create_listeners: function() {
            Hist.__super__.create_listeners.apply(this);
            this.el.on("mouseover", _.bind(this.mouse_over, this))
                .on("mousemove", _.bind(this.mouse_move, this))
                .on("mouseout", _.bind(this.mouse_out, this));
            this.model.on("change:tooltip", this.create_tooltip, this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors",this.update_colors,this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
            this.model.on("change:selected", this.update_selected, this);
            this.listenTo(this.parent, "bg_clicked", this.reset_selection);
        },
        update_colors: function(model, colors) {
            this.el.selectAll(".bar").selectAll("rect")
              .style("fill", this.get_colors(0));
            if (model.get("labels") && colors.length > 1) {
                this.el.selectAll(".bar").selectAll("text")
                  .style("fill", this.get_colors(1));
            }
            if (this.legend_el) {
                this.legend_el.selectAll("rect")
                  .style("fill", this.get_colors(0));
                this.legend_el.selectAll("text")
                  .style("fill", this.get_colors(0));
            }
        },
        update_stroke_and_opacity: function() {
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            this.el.selectAll(".rect")
              .style("stroke", (stroke === null || stroke === undefined) ? "none" : stroke)
              .style("opacity", opacity);
        },
        calculate_bar_width: function() {
            var x_scale = this.scales["sample"];
            var bar_width = (x_scale.scale(this.model.max_x) - x_scale.scale(this.model.min_x)) / this.model.num_bins;
            if (bar_width >= 10) {
                bar_width -= 2;
            }
            return bar_width;
        },
        relayout: function() {
            this.set_ranges();

            var x_scale = this.scales["sample"],
                y_scale = this.scales["counts"];
			this.el.selectAll(".bar")
			  .attr("transform", function(d) {
                  return "translate(" + x_scale.scale(d.x) +
                                  "," + y_scale.scale(d.y) + ")";
              });
            var bar_width = this.calculate_bar_width();
            this.el.selectAll(".bar").select("rect")
              .transition().duration(this.model.get("animate_dur"))
		      .attr("x", 2)
              .attr("width", bar_width)
		      .attr("height", function(d) {
                  return y_scale.scale(0) - y_scale.scale(d.y);
              });
        },
        draw: function() {
            this.set_ranges();
            var colors = this.model.get("colors");
            var fill_color = colors[0];
            var select_color = (colors.length > 1) ? colors[1] : "red";

            var indices = [];
            this.model.mark_data.forEach(function(d, i) {
                indices.push(i);
            });

            var x_scale = this.scales["sample"],
                y_scale = this.scales["counts"];
            var that = this;
            this.el.selectAll(".bar").remove();
            var bar_width = this.calculate_bar_width();
	        var bar = this.el.selectAll(".bar")
			  .data(this.model.mark_data)
		      .enter().append("g")
			  .attr("class","bar")
			  .attr("transform", function(d) {
                  return "translate(" + x_scale.scale(d.x) + "," +
                                        y_scale.scale(d.y) + ")";
              });

		    bar.append("rect")
              .attr("class", "rect")
              .attr("id", function(d, i) { return "rect"+i; })
		      .attr("x", 2)
              .attr("width", bar_width)
		      .attr("height", function(d) {
                  return y_scale.scale(0) - y_scale.scale(d.y);
              })
              .style("fill", fill_color)
              .on("click", function(d, i) {
                  that.bar_click_handler(d, i);
              });
            this.update_stroke_and_opacity();
        },
        bar_click_handler: function (data, index) {
            //code repeated from bars. We should unify the two.
            var that = this;
            if(this.model.get("select_bars")) {
                var idx = this.bars_selected;
                var selected = idx ? utils.deepCopy(idx) : [];
                var elem_index = selected.indexOf(index);
                // index of bar i. Checking if it is already present in the
                // list
                if(elem_index > -1 && d3.event.ctrlKey) {
                    // if the index is already selected and if ctrl key is
                    // pressed, remove the element from the list
                    selected.splice(elem_index, 1);
                }
                else {
                    if(d3.event.shiftKey) {
                        //If shift is pressed and the element is already
                        //selected, do not do anything
                        if(elem_index > -1) {
                            return;
                        }
                        //Add elements before or after the index of the current
                        //bar which has been clicked
                        var min_index = (selected.length !== 0) ?
                            d3.min(selected) : -1;
                        var max_index = (selected.length !== 0) ?
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
                    }
                    else if(d3.event.ctrlKey) {
                        //If ctrl is pressed and the bar is not already selcted
                        //add the bar to the list of selected bars.
                        selected.push(index);
                    }
                    // updating the array containing the bar indexes selected
                    // and updating the style
                    else {
                        //if ctrl is not pressed, then clear the selected ones
                        //and set the current element to the selected
                        selected = [];
                        selected.push(index);
                    }
                }
                this.bars_selected = selected;
                this.model.set("selected", ((selected.length === 0) ? null :
                                             this.calc_data_indices(selected)), {updated_view: this});
                this.touch();
                if(!d3.event) {
                    d3.event = window.event;
                }
                var e = d3.event;
                if(e.cancelBubble !== undefined) { // IE
                    e.cancelBubble = true;
                }
                if(e.stopPropagation) {
                    e.stopPropagation();
                }
                e.preventDefault();
            }
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            this.legend_el = elem.selectAll(".legend" + this.uuid)
                .data([this.model.mark_data[0]]);

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            this.legend_el.enter()
              .append("g")
              .attr("class", "legend" + this.uuid)
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
              })
              .on("mouseover", _.bind(this.highlight_axes, this))
              .on("mouseout", _.bind(this.unhighlight_axes, this))
              .append("rect")
              .style("fill", function(d,i) { return that.get_colors(i); })
              .attr({x: 0, y: 0, width: rect_dim, height: rect_dim});

            this.legend_el.append("text")
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

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [1, max_length];
        },
        reset_colors: function(index, color) {
            var rects = this.el.selectAll("#rect"+index);
            rects.style("fill", color);
        },
        update_selected: function(model, value) {
            if(value === undefined || value === null || value.length === 0) {
                //reset the color of everything if selected is blank
                this.update_selected_colors([]);
                return;
            }
            else {
                var indices = this.calc_bar_indices_from_data_idx(value);
                this.update_selected_colors(indices);
            }
        },
        update_selected_colors: function(indices) {
            // listen to changes of selected and draw itself
            var colors = this.model.get("colors");
            var select_color = colors.length > 1 ? colors[1] : "red";
            var fill_color = colors[0];
            var bars_sel = this.el.selectAll(".bar");
            var self = this;
            _.difference(_.range(0, this.model.num_bins), indices)
                    .forEach(function(d) {
                        self.el.selectAll("#rect" + d).style("fill", fill_color);
                    });
            indices.forEach(function(d) {
                    self.el.selectAll("#rect" + d).style("fill", select_color);
            });
        },
        invert_range: function(start_pxl, end_pxl) {
            if(start_pxl === undefined || end_pxl === undefined ) {
                this.model.set("selected", null);
                this.touch();
                return [];
            }
            var x_scale = this.scales["sample"];
            var data = [start_pxl, end_pxl].map(function(elem) {
                return x_scale.scale.invert(elem);
            });

            var selected = this.calc_data_indices_from_data_range(d3.min(data), d3.max(data));
            this.model.set("selected", selected);
            this.touch();
            return selected;
        },
        calc_data_indices: function(indices) {
            //input is a list of indices corresponding to the bars. Output is
            //the list of indices in the data
            var intervals = this.reduce_intervals(indices);
            if(intervals.length === 0)
                return [];

            var x_data = this.model.get_typed_field("sample");
            var num_intervals = intervals.length;
            var selected = _.filter(_.range(x_data.length), function(index) {
                var elem = x_data[index];
                var iter = 0;
                for(iter=0; iter < num_intervals; iter++) {
                    if(elem <= intervals[iter][1] && elem >= intervals[iter][0]) {
                        return true;
                    }
                }
                return false;
            });
            return selected;
        },
        reduce_intervals: function(indices) {
            //for a series of indices, reduces them to the minimum possible
            //intervals on which the search can be performed.
            //return value is an array of arrays containing the start and end
            //points of the intervals represented by the indices.
            var intervals = [];
            if(indices.length != 0) {
                indices.sort();
                var start_index = indices[0],
                    end_index = indices[0];
                var iter = 1;
                for(; iter < indices.length; iter++) {
                    if(indices[iter] === (end_index + 1)) {
                        end_index++;
                    } else {
                        intervals.push([this.model.x_bins[start_index],
                            this.model.x_bins[end_index+1]]);
                        start_index = end_index = indices[iter];
                    }
                }
                intervals.push([this.model.x_bins[start_index],
                            this.model.x_bins[end_index+1]]);
            }
            return intervals;
        },
        calc_data_indices_from_data_range: function(data_min, data_max) {
            var idx_start = d3.max([0, d3.bisectLeft(this.model.x_bins, data_min) - 1]);
            var idx_end = d3.min([this.model.num_bins, d3.bisectRight(this.model.x_bins, data_max)]);
            var x_data = this.model.get_typed_field("sample");
            var that = this;
            return _.filter(_.range(x_data.length), function(iter) {
                                                    return (x_data[iter] >= that.model.x_bins[idx_start] &&
                                                            x_data[iter] <= that.model.x_bins[idx_end]);
            });
        },
        calc_bar_indices_from_data_idx: function(selected) {
            //function to calculate bar indices for a given list of data
            //indices
            var x_data = this.model.get_typed_field("sample");
            var data = selected.map(function(idx) { return x_data[idx];});
            var bar_indices = [];
            for(var iter = 0; iter < data.length; iter++) {
                //x_bins is of length num_bars+1. So if the max element is
                //selected, we get a bar index which is equal to num_bars.
                var index = Math.min(_.indexOf(this.model.x_bins, data[iter], true),
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
        },
        reset_selection: function() {
            if(this.model.get("select_bars")) {
                this.bars_selected = [];
                this.model.set("selected", null);
                this.touch();
            }
        },
        mouse_over: function() {
            if(this.model.get("enable_hover")) {
                var data = d3.select(d3.event.target).data()[0];
                var tooltip_data = this.model.get_data_dict(data, data.index)
                //make tooltip visible
                this.trigger("update_tooltip", tooltip_data);
                this.show_tooltip(d3.event);
                this.send({event: "hover",
                           point: tooltip_data});
            }
        },
        mouse_out: function() {
            if(this.model.get("enable_hover")) {
                var data = d3.select(d3.event.target).data()[0];
                var tooltip_data = this.model.get_data_dict(data, data.index)
                // make tooltip invisible
                this.hide_tooltip();
                this.send({event: "hover",
                           point: tooltip_data});
            }
        },
        mouse_move: function() {
            if(this.model.get("enable_hover")) {
                this.show_tooltip(d3.event);
            }
        },
    });

    return {
        Hist: Hist,
    };
});
