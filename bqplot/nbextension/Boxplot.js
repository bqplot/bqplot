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

define(["d3", "./Mark", "./PerfCounter"], function(d3, MarkViewModule, p) {
    "use strict";

    var perf = p;

    var  boxplotView = MarkViewModule.Mark.extend({
       render: function() {
            var base_creation_promise = boxplotView.__super__.render.apply(this);
            var that = this;

            return base_creation_promise.then(function() {
                that.create_listeners();
                that.draw(); },
            null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            this.x_scale = this.scales["x"];
            this.y_scale = this.scales["y"];
            var that = this;
            this.listenTo(that.x_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
            this.listenTo(that.y_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            boxplotView.__super__.create_listeners.apply(this);
            this.model.on("change:stroke", this.update_stroke, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("change:opacity", this.update_opacity, this);
            this.model.on("change:marker", this.update_marker, this);
        },
        update_stroke: function() {
            var stroke = this.model.get("stroke");
            this.el.selectAll(".boxplot").style("stroke", stroke);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("stroke", stroke);
                this.legend_el.selectAll("text").style("fill", stroke);
            }
        },
        update_colors: function() {
            var that        = this;
            var colors      = this.model.get("colors");
            var up_color    = (colors[0] ? colors[0] : "none");
            var down_color  = (colors[1] ? colors[1] : "none");

            // Fill candles based on the opening and closing values
            this.el.selectAll(".boxplot").style("fill", function(d) {
                return (d[that.model.px.open] > d[that.model.px.close] ?
                    down_color : up_color);
            });

            if(this.legend_el) {
                this.legend_el.selectAll("path").attr("fill", up_color);
            }
        },
        update_opacity: function() {
            var opacity = this.model.get("opacity");
            this.el.selectAll(".boxplot").style("opacity", opacity);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("opacity", opacity);
            }
        },
        update_marker: function() {
            var marker = this.model.get("marker");
            var that = this;

            if (this.legend_el && this.rect_dim) {
                var legend_data = [
                    (1/4)*that.rect_dim,
                    0,
                    that.rect_dim,
                    (3/4)*that.rect_dim
                ];
                // Draw icon for legend
                this.draw_mark_paths(marker, this.rect_dim/2,
                    this.legend_el, [legend_data]);
            }

            // Redraw existing marks
            this.draw_mark_paths(marker, this.calculate_mark_width(),
                this.el, this.model.mark_data);
        },
        update_idx_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles(value);
        },
        apply_styles: function(indices) {
            var all_indices = _.range(this.model.mark_data.length);
            this.set_default_style(all_indices);

            this.set_style_on_elements(this.selected_style, this.selected_indices);
            var unselected_indices = (indices == undefined) ?
                [] : _.difference(all_indices, indices);
            this.set_style_on_elements(this.unselected_style, unselected_indices);
        },
        set_style_on_elements: function(style, indices) {
            if(indices === undefined || indices.length == 0) {
                return;
            }
            var elements = this.el.selectAll(".boxplot");
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) != -1;
            });
            elements.style(style);
        },
        set_default_style: function(indices) {
            if(indices === undefined || indices.length == 0) {
                return;
            }
            var color = this.model.get("color");
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            var elements = this.el.selectAll(".boxplot")
                .filter(function(data, index) {
                    return indices.indexOf(index) != -1;
                });

            elements.style("fill", function(d) {
                  return (d[0] > d[3] ? color : "none");
              })
              .style("stroke", stroke)
              .style("opacity", opacity);
        },
        clear_style: function(style_dict, indices) {
            var elements = this.el.selectAll(".boxplot");
            if(indices != undefined) {
                elements = elements.filter(function(d, index) {
                    return indices.indexOf(index) != -1;
                });
            }
            var clearing_style = {};
            for(var key in style_dict) {
                clearing_style[key] = null;
            }
            elements.style(clearing_style);
        },
        style_updated: function(new_style, indices) {
            this.set_default_style(indices);
            this.set_style_on_elements(new_style, indices);
        },
        selected_style_updated: function(model, style) {
            this.selected_style = style;
            this.style_updated(style, this.selected_indices);
        },
        unselected_style_updated: function(model, style) {
            this.unselected_style = style;
            var sel_indices = this.selected_indices;
            var unselected_indices = (sel_indices ?
                _.range(this.model.mark_data.length)
                    .filter(function(index) {
                        return sel_indices.indexOf(index) == -1; })
                : []);
            this.style_updated(style, unselected_indices);
        },
        update_selected_colors: function(idx_start, idx_end) {
            var boxplot_sel = this.el.selectAll(".boxplot");
            var current_range = _.range(idx_start, idx_end);
            if(current_range.length == this.model.mark_data.length) {
                current_range = [];
            }
            var that = this;
            var stroke = this.model.get("stroke");
            var selected_stroke = this.model.get("color");

            _.range(0, this.model.mark_data.length)
             .forEach(function(d) {
                 that.el.selectAll("#boxplot" + d)
                   .style("stroke", stroke);
             });

            current_range.forEach(function(d) {
                that.el.selectAll("#boxplot" + d)
                  .style("stroke", selected_stroke);
            });
        },
        invert_range: function(start_pxl, end_pxl) {
            if((start_pxl === undefined && end_pxl === undefined) ||
               (this.model.mark_data.length === 0))
            {
                this.update_selected_colors(-1,-1);
                idx_selected = [];
                return idx_selected;
            }
            var that = this;
            var data = [start_pxl, end_pxl].map(function(elem) {
                return that.x_scale.scale.invert(elem);
            });
            var idx_start = d3.max([0,
                d3.bisectLeft(this.model.mark_data.map(function(d){
                    return d[0];
                }), data[0])]);
            var idx_end = d3.min([this.model.mark_data.length,
                d3.bisectRight(this.model.mark_data.map(function(d){
                    return d[0];
                }), data[1])]);
            this.update_selected_colors(idx_start, idx_end);

            if((idx_end === this.model.mark_data.length) &&
                (this.model.mark_data.length > 0))
            {
                // Decrement so that we stay in bounds for [] operator
                idx_end -= 1;
            }
            var indices = _.range(this.model.mark_data.length);
            var selected_data = [this.model.mark_data[idx_start][0],
                this.model.mark_data[idx_end][1]];
            var idx_selected = _.filter(indices, function(index) {
                var elem = that.model.mark_data[index][0];
                return (elem <= selected_data[1] && elem >= selected_data[0]);
            });
            return idx_selected;
        },
        invert_point: function(pixel) {
            perf("invert_point").start();
            var point = this.x_scale.scale.invert(pixel);
            var index = this.bisect(this.model.mark_data.map(function(d) {
                return d[0];
            }), point);
            this.model.set("idx_selected", [index]);
            this.touch();
            return index;
        },
        prepareBoxPlots: function () {
            var that = this;

           // convert the domain data to the boxes to be drawn on the screen
           // find the quantiles, min/max and outliers for the box plot
            that.plotData = [];
            for(var i = 0; i<this.model.mark_data.length; ++i) {
                var values = this.model.mark_data[i];

                var displayValue = {};

                displayValue.x         = that.x_scale.scale(values[0]);
                displayValue.boxUpper  = that.y_scale.scale(d3.quantile(values[1], 0.75));
                displayValue.boxLower  = that.y_scale.scale(d3.quantile(values[1], 0.25));
                displayValue.boxMedian = that.y_scale.scale(d3.quantile(values[1], 0.5));

                // The domain Y to screen Y is an inverse scale, so be aware of that
                // The max from the domain Y becomes min on the screen (display) scale
                var iqr = displayValue.boxLower - displayValue.boxUpper;
                var lowerBound = displayValue.boxLower + 1.5 * iqr;
                var upperBound = displayValue.boxUpper - 1.5 * iqr;

                displayValue.outliers = [];
                displayValue.whiskerMax = Number.MAX_VALUE;
                displayValue.whiskerMin = Number.MIN_VALUE;

                for (var j=0; j<values[1].length; ++j)  {

                   var plotY = that.y_scale.scale(values[1][j]);

                   // Find the outlier
                   if ( plotY > lowerBound || plotY  < upperBound) {
                        displayValue.outliers.push(plotY);
                   }
                   else {
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

                that.plotData.push(displayValue);
            }

        },
        draw: function() {

            perf("draw").start();

            this.set_ranges();

            // get the visual representation of boxplots
            this.prepareBoxPlots();
            var plotData = this.plotData;

            // Draw the visual elements with data which was bound
            this.draw_mark_paths(".boxplot", this.el, plotData);

            perf("draw").stop();

        },
        draw_mark_paths: function(parentClass, selector, plotData) {
            perf("invert_point").stop();
            var that = this;

            var mark_max_width = this.calculate_mark_max_width();
            var color      = this.model.get("color");
            var boxplot    = this.el.selectAll(parentClass).data(plotData);

            var fillcolor = this.model.get("box_fill_color");
            var start_time = this.model.get("start_time");
            // Create new
            var new_boxplots = boxplot.enter()
                .append("g")
                .attr ("class", "boxplot")
                .attr ("id", function(d, i) { return "boxplot"+i; })

            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //
            //            The following diagram explains the parts of the svg visual elements
            //            We translate the whole element of 'boxplot' to the x location and
            //            then scale each of these elements with Y scale
            //
            //                                 ( )    <--- outliers (as circles)
            //                                 ( )
            //
            //                               -------  <--- whisker_max_end (path as the max)
            //                                  |
            //                                  |     <--- whisker_max (path from top of the box to max)
            //                                  |
            //                              ---------
            //                              |       |
            //                              |       |
            //                              |       | <--- box (as a rect)
            //                              |       |
            //                              |       |
            //                              ---------
            //                                  |
            //                                  |     <--- whisker_min (path from bottom of the box to min)
            //                                  |
            //                               -------  <--- whisker_min_end (path at min value)
            //
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            new_boxplots.append("path").attr("class", "whisker_max");
            new_boxplots.append("path").attr("class", "whisker_max_end");
            new_boxplots.append("path").attr("class", "whisker_min");
            new_boxplots.append("path").attr("class", "whisker_min_end");
            new_boxplots.append("rect").attr("class", "box");
            new_boxplots.append("path").attr("class", "median_line");
            new_boxplots.append("g").attr("class", "outliers");

            this.el.selectAll(".boxplot").data(plotData)
                .style("stroke", this.model.get("stroke"))
                .style("opacity", color)
                .attr ("transform", function (d, i) {
                                   return "translate(" + d.x + ", 0)";
                });;

           //Box
            var width = 30;
            selector.selectAll(".box").data(plotData)
                .style("fill", fillcolor)
                .attr("x", -width /2)
                .attr("width", width)
                .attr("y", function(d, i) {
                    return d.boxUpper;
                })
                .attr("height", function (d, i) {
                    return (d.boxLower - d.boxUpper);
                });

            //Median line
            selector.selectAll(".median_line").data(plotData)
                .style("stroke-width", 2)
                .attr("d", function(d, i) {

                var x = 0;
                var medianY = d.boxMedian;

                return  "M"  + (x - width /2) + "," +
                        medianY +  " L" + (x + width /2)  + "," +  medianY;
              });

              //Max and Min Whiskers
              //Max to top of the Box
              selector.selectAll(".whisker_max").data(plotData)
                  .attr("d", function(d, i) {

                  var x = 0;
                  // The price points are sorted so the last element is the max
                  var maxY = d.whiskerMax;
                  var boxY = d.boxUpper;

                  return "M"  + x + "," +  maxY +  " L" + x + "," +  boxY;
               }).attr("stroke-dasharray", function(d, i) {
                  return  "5,5";
               });

              selector.selectAll(".whisker_max_end").data(plotData)
                  .attr("d", function(d, i) {

                  var x = 0;
                  // The price points are sorted, so 1st element is min
                  var maxY = (d.whiskerMax);

                  return "M"  + (x - width/2) + "," +  maxY +  " L" + (x + width/2) + "," +  maxY;
               });

              //Min to the bottom of the box
              //Max to top of the Box
              selector.selectAll(".whisker_min").data(plotData)
                  .attr("d", function(d, i) {

                  var x = 0;
                  // The price points are sorted, so 1st element is min
                  var minY = (d.whiskerMin);
                  var boxY = (d.boxLower);

                  return "M"  + x + "," +  minY +  " L" + x + "," +  boxY;
              }).attr("stroke-dasharray", function(d, i) {
                  return  "5,5";
              });

              selector.selectAll(".whisker_min_end").data(plotData)
                  .attr("d", function(d, i) {

                  var x = 0;
                  // The price points are sorted, so 1st element is min
                  var minY = (d.whiskerMin);

                  return "M"  + (x - width/2) + "," +  minY +  " L" + (x + width/2) + "," +  minY;
              });

              // Add the outliers group
              var outliers = selector.selectAll(".outliers").data(plotData).selectAll("circle")
                                      .data(function(d) { return d.outliers;});

              //Individual outlier drawing spec
              outliers.enter().append("circle").attr("class", "outlier");

              selector.selectAll(".outlier")
                      .style("fill", this.model.get("outlier_fill_color"))
                      .attr("class", "outlier")
                      .attr("cx", 0)
                      .attr("r", 3)
                      .attr("cy", function(d) {
                        return (d);
                      });


              outliers.exit().remove();

              boxplot.exit().remove();

              this.apply_styles(this.selected_indices);

        },
        calculate_mark_max_width: function() {

            var that = this;
            var min_distance = Infinity;

            for(var i = 1; i < that.model.mark_data.length; i++) {
                var dist = that.x_scale.scale(that.model.mark_data[i][0]) -
                            that.x_scale.scale(that.model.mark_data[i-1][0]);
                dist = (dist < 0) ? (-1*dist) : dist;
                if(dist < min_distance) min_distance = dist;
            }

            var mark_width = 0;
            if(min_distance == Infinity) {
                mark_width = (that.x_scale.scale(this.model.max_x) -
                              that.x_scale.scale(this.model.min_x)) / 2;
            } else {
                mark_width = min_distance;
            }

            return mark_width;
        },
        relayout: function() {
            boxplotView.__super__.relayout.apply(this);
            this.set_ranges();
            this.el.select(".intselmouse")
                .attr("width", this.width)
                .attr("height", this.height);

            // We have to redraw every time that we relayout
            this.draw();
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var stroke      = this.model.get("stroke");
            var colors      = this.model.get("colors");
            this.rect_dim   = inter_y_disp * 0.8;
            var that        = this;

            this.legend_el  = elem.selectAll(".legend" + this.uuid)
                                  .data([this.model.mark_data]);

            var leg = this.legend_el.enter().append("g")
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

            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            this.legend_el.exit().remove();
            return [1, max_length];
        },
    });
    return {
        Boxplot: boxplotView,
    };
});



