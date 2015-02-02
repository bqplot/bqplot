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

define(["widgets/js/manager", "d3", "./Mark", "./utils"], function(WidgetManager, d3, mark, utils) {
    var Mark = mark[0];
    var Bars = Mark.extend({
        render: function() {
            this.padding = this.model.get("padding");
            var base_creation_promise = Bars.__super__.render.apply(this);
            this.set_internal_scales();
            var self = this;
            this.selected_indices = this.model.get("idx_selected");
            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");

            this.el.append("rect")
                .attr("class", "mouseeventrect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.parent.plotarea_width)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .attr("height", this.parent.plotarea_height)
                .style("pointer-events", "all")
                .on("click", _.bind(this.reset_selection, this));

            return base_creation_promise.then(function() {
                self.create_listeners();
                self.draw();
            }, null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"],
                y_scale = this.scales["y"],
                color_scale = this.scales["color"];
            if(x_scale.model.type !== "ordinal") {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            } else {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model), this.padding);
            }
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            // x_offset is set later by the adjust_offset method
            // This differs because it is not constant for a scale.
            // Changes based on the data.
            this.x_offset = 0;
            this.y_offset = y_scale.offset;
            if(color_scale) {
                color_scale.set_range();
            }
        },
        set_positional_scales: function() {
            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },
        set_internal_scales: function() {
            // Two scales to draw the bars.
            this.x = d3.scale.ordinal();
            this.x1 = d3.scale.ordinal();
        },
        adjust_offset: function() {
            // In the case of a linear scale, and when plotting ordinal data,
            // the value have to be negatively offset by half of the width of
            // the bars, because ordinal scales give the values corresponding
            // to the start of the bin but linear scale gives the actual value.
            var x_scale = this.scales["x"];
            if(x_scale.model.type !== "ordinal") {
                this.x_offset = -(this.x.rangeBand() / 2).toFixed(2);
            } else {
                this.x_offset = 0;
            }
        },
        create_listeners: function() {
            Bars.__super__.create_listeners.apply(this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("colors_updated", this.update_colors, this);
            this.model.on("change:type", this.draw, this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
        },
        relayout: function() {
            var y_scale = this.scales["y"];
            this.set_ranges();

            this.el.select(".mouseeventrect")
              .attr("width", this.parent.plotarea_width)
              .attr("height", this.parent.plotarea_height);

            this.el.select(".zeroLine")
              .attr("x1",  0)
              .attr("x2", this.parent.plotarea_width)
              .attr("y1", y_scale.scale(this.model.base_value))
              .attr("y2", y_scale.scale(this.model.base_value));

            var bar_groups = this.el.selectAll(".bargroup");
            var bars_sel = bar_groups.selectAll(".bar");

            this.x.rangeRoundBands(this.set_x_range(), this.padding);
            this.adjust_offset();
            this.x1.rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);
            this.draw_bars();
        },
        draw: function() {
            this.set_ranges();
            var colors = this.model.get("colors");
            var that = this;
            var animate_dur = this.model.get("animate_dur");
            var bar_groups = this.el.selectAll(".bargroup").data(this.model.mark_data, function(d) {
                return d.key;
            });

            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            // this.x is the ordinal scale used to draw the bars. If a linear
            // scale is given, then the ordinal scale is created from the
            // linear scale.
            if(x_scale.model.type !== "ordinal") {
                var model_domain = this.model.mark_data.map(function(elem) {
                    return elem.key;
                });
                this.x.domain(model_domain);
            } else {
                this.x.domain(x_scale.scale.domain());
            }
            this.x.rangeRoundBands(this.set_x_range(), this.padding);
            this.adjust_offset();
            this.x1.rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);

            if(this.model.mark_data.length > 0) {
                this.x1.domain(_.range(this.model.mark_data[0].values.length))
                    .rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);
            }
            bar_groups.enter()
              .append("g")
              .attr("class", "bargroup")
              .on("click", function(d, i) {
                  return that.bar_click_handler(d, i);
              });
            bar_groups.exit().remove();

            var bars_sel = bar_groups.selectAll(".bar")
              .data(function(d) { return d.values; })
            bars_sel.enter()
              .append("rect")
              .attr("class", "bar");
            this.draw_bars();

            this.apply_styles();

            this.el.selectAll(".zeroLine").remove();
            this.el.append("g")
              .append("line")
              .attr("class", "zeroLine")
              .attr("x1",  0)
              .attr("x2", this.parent.plotarea_width)
              .attr("y1", y_scale.scale(this.model.base_value))
              .attr("y2", y_scale.scale(this.model.base_value));
        },
        draw_bars: function() {
            var bar_groups = this.el.selectAll(".bargroup");
            var bars_sel = bar_groups.selectAll(".bar");
            var that = this;

            var x_scale = this.scales["x"], y_scale = this.scales["y"];
            if(x_scale.model.type === "ordinal") {
                var x_max = d3.max(this.parent.range("x"));
                bar_groups.attr("transform", function(d) {
                    return "translate(" + ((x_scale.scale(d.key) !== undefined ?
                                            x_scale.scale(d.key) : x_max) + that.x_offset) + ", 0)";
                });
            } else {
                bar_groups.attr("transform", function(d) {
                    return "translate(" + (x_scale.scale(d.key) + that.x_offset) + ", 0)";
                });
            }
            if(this.model.get("type") === "stacked") {
                bars_sel.attr("x", 0)
                    .attr("width", this.x.rangeBand().toFixed(2))
                    .attr("y", function(d) {
                        return y_scale.scale(d.y1);
                    }).attr("height", function(d) {
                        return Math.abs(y_scale.scale(d.y1 + d.val) - y_scale.scale(d.y1));
                    });
            } else {
                bars_sel.attr("x", function(datum, index) {
                        return that.x1(index);
                  }).attr("width", this.x1.rangeBand().toFixed(2))
                  .attr("y", function(d) {
                      return d3.min([y_scale.scale(d.val), y_scale.scale(that.model.base_value)]);
                  }).attr("height", function(d) {
                      return Math.abs(y_scale.scale(that.model.base_value) - (y_scale.scale(d.val)));
                  });
            }
        },
        update_stroke_and_opacity: function() {
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            this.el.selectAll(".bar")
                .style("stroke", (stroke === undefined || stroke === null) ? "none" : stroke)
                .style("opacity", opacity);
        },
        update_colors: function() {
            //the following if condition is to handle the case of single
            //dimensional data.
            //if y is 1-d, each bar should be of 1 color.
            //if y is multi-dimensional, the correspoding values should be of
            //the same color.
            var that = this;
            var color_scale = this.scales["color"];
            if(color_scale) {
                color_scale.set_range();
            }
            if(this.model.mark_data.length > 0) {
                if(!(this.model.is_y_2d)) {
                    this.el.selectAll(".bar").style("fill", function(d, i) {
                        return (d.color !== undefined && color_scale !== undefined) ?
                            color_scale.scale(d.color) : that.get_colors(d.color_index);
                    });
                } else {
                    this.el.selectAll(".bargroup")
                       .selectAll(".bar")
                       .style("fill", function(d, i) {
                       return (d.color !== undefined && color_scale !== undefined) ?
                           color_scale.scale(d.color) : that.get_colors(d.color_index);
                    });
                }
            }
            //legend color update
            if(this.legend_el) {
                this.legend_el.selectAll(".legendrect")
                    .style("fill", function(d, i) {
                    return (d.color && color_scale) ?
                        color_scale.scale(d.color) : that.get_colors(d.color_index);
                });
                this.legend_el.selectAll(".legendtext")
                    .style("fill", function(d, i) {
                    return (d.color !== undefined && color_scale !== undefined) ?
                        color_scale.scale(d.color) : that.get_colors(d.color_index);
                });
            }
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            if(!(this.model.is_y_2d) &&
               (this.model.get("colors").length !== 1 &&
                this.model.get("color_mode") !== "element")) {
                return [0, 0];
            }

            this.legend_el = elem.selectAll(".legend" + this.uuid)
                .data(this.model.mark_data[0].values);

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            this.legend_el.enter()
              .append("g")
              .attr("class", "legend" + this.uuid)
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
              }).on("mouseover", _.bind(this.highlight_axes, this))
              .on("mouseout", _.bind(this.unhighlight_axes, this))
              .append("rect")
              .classed("legendrect", true)
              .style("fill", function(d,i) {
                  return (d.color !== undefined && color_scale !== undefined) ?
                      color_scale.scale(d.color) : that.get_colors(d.color_index);
              }).attr({x: 0, y: 0, width: rect_dim, height: rect_dim});

            this.legend_el.append("text")
             .attr("class","legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) { return that.model.get("labels")[i]; })
              .style("fill", function(d,i) {
                  return (d.color !== undefined && color_scale !== undefined) ?
                      color_scale.scale(d.color) : that.get_colors(d.color_index);
              });

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [this.model.mark_data[0].values.length, max_length];
        },
        clear_style: function(style_dict, indices) {
            // Function to clear the style of a dict on some or all the elements of the
            // chart.If indices is null, clears the style on all elements. If
            // not, clears on only the elements whose indices are mathcing.
            //
            // This function is not used right now. But it can be used if we
            // decide to accomodate more properties than those set by default.
            // Because those have to cleared specifically.
            var elements = this.el.selectAll(".bargroup");
            if(indices !== undefined) {
                elements = elements.filter(function(d, index) {
                    return indices.indexOf(index) !== -1;
                });
            }
            var clearing_style = {};
            for(var key in style_dict) {
                clearing_style[key] = null;
            }
            elements.selectAll(".bar").style(clearing_style);
        },
        set_style_on_elements: function(style, indices) {
            // If the index array is undefined or of length=0, exit the
            // function without doing anything
            if(indices === undefined || indices === null || indices.length === 0) {
                return;
            }
            // Also, return if the style object itself is blank
            if(Object.keys(style).length === 0) {
                return;
            }
            var elements = this.el.selectAll(".bargroup");
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            elements.selectAll(".bar").style(style);
        },
        set_default_style: function(indices) {
            // For all the elements with index in the list indices, the default
            // style is applied.
            this.update_colors();
            this.update_stroke_and_opacity();
        },
        set_x_range: function() {
            var x_scale = this.scales["x"];
            if(x_scale.model.type === "ordinal") {
                return x_scale.scale.rangeExtent();
            } else {
                return [x_scale.scale(d3.min(this.x.domain())),
                        x_scale.scale(d3.max(this.x.domain()))];
            }
        },
        bar_click_handler: function (data, index) {
            var that = this;
            if(this.model.get("select_bars")) {
                var idx_selected = utils.deepCopy(this.model.get("idx_selected"));
                var elem_index = idx_selected.indexOf(index);
                // index of bar i. Checking if it is already present in the
                // list
                if(elem_index > -1 && d3.event.ctrlKey) {
                    // if the index is already selected and if ctrl key is
                    // pressed, remove the element from the list
                    idx_selected.splice(elem_index, 1);
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
                        min_index = (idx_selected.length !== 0) ?
                            d3.min(idx_selected) : -1;
                        max_index = (idx_selected.length !== 0) ?
                            d3.max(idx_selected) : that.model.mark_data.length;
                        if(index > max_index){
                            _.range(max_index+1, index).forEach(function(i) {
                                idx_selected.push(i);
                            });
                        } else if(index < min_index){
                            _.range(index+1, min_index).forEach(function(i) {
                                idx_selected.push(i);
                            });
                        }
                    }
                    else if(!(d3.event.ctrlKey)) {
                        idx_selected = [];
                    }
                    // updating the array containing the bar indexes selected
                    // and updating the style
                    idx_selected.push(index);
                }
                this.model.set("idx_selected", ((idx_selected.length === 0) ? null : idx_selected), {updated_view: this});
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
                this.selected_indices = idx_selected;
                this.apply_styles(this.selected_indices);
            }
        },
        reset_selection: function() {
            if(this.model.get("select_bars")) {
                this.model.set("idx_selected", null);
                this.touch();
                this.selected_indices = null;
                this.clear_style(this.selected_style);
                this.clear_style(this.unselected_style);
                this.set_default_style();
            }

        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Bars", Bars);
});


