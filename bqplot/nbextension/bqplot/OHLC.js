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

define(["widgets/js/manager", "d3", "./Mark"], function(WidgetManager, d3, mark) {
    var Mark = mark[0];
    var OHLC = Mark.extend({
        render: function() {
            var base_creation_promise = OHLC.__super__.render.apply(this);
            var that = this;
            return base_creation_promise.then(function() {
                that.create_listeners();
                that.draw(); },
            null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.get_padded_xrange(x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.get_padded_yrange(y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            this.x_scale = this.scales["x"];
            this.y_scale = this.scales["y"];
            var that = this;
            this.listenTo(that.x_scale, "domain_changed", function() {
                if(!that.model.dirty) { that.draw(); }
            });
            this.listenTo(that.y_scale, "domain_changed", function() {
                if(!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            OHLC.__super__.create_listeners.apply(this);
            this.model.on("change:stroke", this.update_stroke, this);
            this.model.on("change:color", this.update_color, this);
            this.model.on("change:opacity", this.update_opacity, this);
            this.model.on("change:marker", this.update_marker, this);

            this.listenTo(this.model, "change:idx_selected",
                          this.update_idx_selected);
            this.model.on("change:selected_style",
                          this.selected_style_updated, this);
            this.model.on("change:unselected_style",
                          this.unselected_style_updated, this);
        },
        update_stroke: function() {
            var stroke = this.model.get("stroke");
            this.el.selectAll(".stick").style("stroke", stroke);

            if(this.legend_el) {
                this.legend_el.selectAll("path").attr("stroke", stroke);
                this.legend_el.selectAll("text").style("fill", stroke);
            }
        },
        update_color: function() {
            var color = this.model.get("color");
            var that = this;

            // Only fill candles when close is lower than open
            this.el.selectAll(".stick").style("fill", function(d) {
                return (d[that.model.px.open] > d[that.model.px.close] ?
                    color : "none");
            });

            if(this.legend_el) {
                this.legend_el.selectAll("path").attr("fill", color);
            }
        },
        update_opacity: function() {
            var opacity = this.model.get("opacity");
            this.el.selectAll(".stick").style("opacity", opacity);

            if(this.legend_el) {
                this.legend_el.selectAll("path").attr("opacity", opacity);
            }
        },
        update_marker: function() {
            var marker = this.model.get("marker");
            var that = this;

            if(this.legend_el && this.rect_dim) {
                this.draw_legend_icon(this.rect_dim, this.legend_el);
            }

            // Redraw existing marks
            this.draw_mark_paths(marker, this.calculate_mark_width(),
                this.el, this.model.mark_data.map(function(d) {
                    return d[1].map(function(elem) {
                        return that.y_scale.scale(elem);
                    });
                }));
        },
        update_idx_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles(value);
        },
        apply_styles: function(indices) {
            var all_indices = _.range(this.model.mark_data.length);
            this.set_default_style(all_indices);

            this.set_style_on_elements(this.selected_style,
                                       this.selected_indices);
            var unselected_indices = (indices == undefined) ?
                [] : _.difference(all_indices, indices);
            this.set_style_on_elements(this.unselected_style,
                                       unselected_indices);
        },
        set_style_on_elements: function(style, indices) {
            if(indices === undefined || indices.length == 0) {
                return;
            }
            var elements = this.el.selectAll(".stick");
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
            var elements = this.el.selectAll(".stick")
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
            var elements = this.el.selectAll(".stick");
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
            var stick_sel = this.el.selectAll(".stick");
            var current_range = _.range(idx_start, idx_end);
            if(current_range.length == this.model.mark_data.length) {
                current_range = [];
            }
            var that = this;
            var stroke = this.model.get("stroke");
            var selected_stroke = this.model.get("color");

            _.range(0, this.model.mark_data.length)
             .forEach(function(d) {
                 that.el.selectAll("#stick" + d)
                   .style("stroke", stroke);
             });

            current_range.forEach(function(d) {
                that.el.selectAll("#stick" + d)
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
            var point = this.x_scale.scale.invert(pixel);
            var index = this.bisect(this.model.mark_data.map(function(d) {
                return d[0];
            }), point);
            this.model.set("idx_selected", [index]);
            this.touch();
            return index;
        },
        draw: function() {
            this.set_ranges();
            var that = this;
            var color = this.model.get("color");
            var mark_width = this.calculate_mark_width();
            var stick = this.el.selectAll(".stick")
                .data(this.model.mark_data.map(function(d) {
                    return d[1].map(function(elem) {
                        return that.y_scale.scale(elem);
                    });
                }));

            // Create new
            var new_sticks = stick.enter()
                .append("g")
                .attr("class", "stick")
                .attr("id", function(d, i) { return "stick"+i; })
                .style("stroke", this.model.get("stroke"))
                .style("opacity", this.model.get("opacity"));

            new_sticks.append("path").attr("class", "stick_head");
            new_sticks.append("path").attr("class", "stick_tail");
            new_sticks.append("path").attr("class", "stick_body");

            stick.exit().remove();

            // Update all of the marks
            this.el.selectAll(".stick")
                .style("fill", function(d, i) {
                    return (d[that.model.px.open] > d[that.model.px.close]) ?
                        color : "none";
                })
                .attr( "transform", function(d, i) {
                    return "translate(" + (that.x_scale.scale(that.model.mark_data[i][0])
                                        + that.x_offset) + ","
                                        + (d[that.model.px.high]
                                        + that.y_offset) + ")";
                });

            // Draw the mark paths
            this.draw_mark_paths(this.model.get("marker"), mark_width, this.el,
                this.model.mark_data.map(function(d) {
                    return d[1].map(function(elem) {
                        return that.y_scale.scale(elem);
                    } );
                }));

            this.apply_styles(this.selected_indices);
        },
        draw_mark_paths: function(type, min_x_difference, selector, dat) {
            /* Calculate some values so that we can draw the marks
             *      | <----- high (0,0)
             *      |
             *  --------- <- headline_top (open or close)
             *  |       |
             *  |       |
             *  |       |
             *  --------- <- headline_bottom (open or close)
             *      |
             *      | <----- low
             *
             *
             *      | <----- high (0,0)
             *  ____| <----- open
             *      |
             *      |
             *      |
             *      |____ <- close
             *      | <----- low
             */
            var that                = this;
            var open                = [];
            var high                = [];
            var low                 = [];
            var close               = [];
            var headline_top        = [];
            var headline_bottom     = [];
            var to_left_side        = [];
            var scaled_mark_widths  = [];

            for(var i = 0; i < dat.length; i++) {
                open[i]             = dat[i][this.model.px.open];
                high[i]             = dat[i][this.model.px.high];
                low[i]              = dat[i][this.model.px.low];
                close[i]            = dat[i][this.model.px.close];
                headline_top[i]     = (that.y_scale.scale.invert(open[i]) >
                                        that.y_scale.scale.invert(close[i])) ?
                                        open[i] : close[i];
                headline_bottom[i]  = (that.y_scale.scale.invert(open[i]) <
                                        that.y_scale.scale.invert(close[i])) ?
                                        open[i] : close[i];

                if(that.x_scale.model.type == "date") {
                    if( min_x_difference instanceof Date) {
                        min_x_difference = min_x_difference.getTime();
                    } // TODO what if the mark data is not a date?
                    var offset_in_x_units = that.model.mark_data[i][0].getTime()
                                            + min_x_difference;
                } else {
                    var offset_in_x_units = that.model.mark_data[i][0]
                                            + min_x_difference;
                }
                scaled_mark_widths[i] = (that.x_scale.scale(offset_in_x_units)
                                       - that.x_scale.scale(that.model.mark_data[i][0]))
                                        * 0.75;
                to_left_side[i] = -1*scaled_mark_widths[i]/2;
            }

            // Determine OHLC marker type
            if(type == "candle") {
                /*
                 *      | <-------- head
                 *  ---------
                 *  |       |
                 *  |       | <---- body
                 *  |       |
                 *  ---------
                 *      | <-------- tail
                 */
                selector.selectAll(".stick_head").data(dat)
                    .attr("d", function(d, i) {
                        return that.head_path_candle(headline_top[i] - high[i]);
                    });
                selector.selectAll(".stick_tail").data(dat)
                    .attr("d", function(d, i) {
                        return that.tail_path_candle(headline_bottom[i] - high[i],
                                                     low[i] - headline_bottom[i]);
                    });
                selector.selectAll(".stick_body").data(dat)
                    .attr("d", function(d, i) {
                        return that.body_path_candle(to_left_side[i],
                                                     open[i] - high[i],
                                                     scaled_mark_widths[i],
                                                     close[i] - open[i]);
                  });
            } else {
                // bar
                /*
                 *      |
                 *  ____| <-------- head (horizontal piece)
                 *      |
                 *      | <-------- body (vertical piece)
                 *      |
                 *      |____ <---- tail (horizontal piece)
                 *      |
                 */
                selector.selectAll(".stick_head").data(dat)
                    .attr("d", function(d, i) {
                        return that.head_path_bar(to_left_side[i],
                                                  open[i] - high[i],
                                                  to_left_side[i]*-1);
                    });
                selector.selectAll(".stick_tail").data(dat)
                    .attr("d", function(d, i) {
                        return that.tail_path_bar(close[i] - high[i],
                                                  to_left_side[i]*-1);
                    });
                selector.selectAll(".stick_body").data(dat)
                    .attr("d", function(d, i) {
                        return that.body_path_bar(low[i]-high[i]);
                    });
            }
        },
        /* SVG path for head of candle */
        head_path_candle: function(height) {
            return "m0,0 l0," + height;
        },
        /* SVG path for tail of candle */
        tail_path_candle: function(y_offset, height) {
            return "m0," + y_offset + " l0," + height;
        },
        /* SVG path for body of candle */
        body_path_candle: function(x_offset, y_offset, width, height) {
            return "m" + x_offset + "," + y_offset + " l" + width + ",0" +
                " l0," + height + " l" + (-1*width) + ",0" + " z";
        },
        /* SVG path for head of bar */
        head_path_bar: function(x_offset, y_offset, width) {
            return "m" + x_offset + "," + y_offset +
                  " l" + width + ",0";
        },
        /* SVG path for tail of bar */
        tail_path_bar: function(y_offset, width) {
            return "m0," + y_offset +
                    " l" + width + ",0";
        },
        /* SVG path for body of bar */
        body_path_bar: function(height) {
            return "m0,0 l0," + height;
        },
        calculate_mark_width: function() {
            /*
             * Calculate the mark width for this data set based on the minimum
             * distance between consecutive points.
             */
            var that            = this;
            var min_distance    = Number.POSITIVE_INFINITY;
            var sum             = 0;
            var average_height  = 0;
            for(var i = 1; i < that.model.mark_data.length; i++) {
                var dist = that.model.mark_data[i][0]
                         - that.model.mark_data[i-1][0];
                if(dist < min_distance) min_distance = dist;
            }
            // Check if there are less than two data points
            if(min_distance === Number.POSITIVE_INFINITY) {
                min_distance = (this.x_scale.model.domain[1]
                              - this.x_scale.model.domain[0]) / 2;
            }
            if(min_distance < 0) {
                mind_distance = -1*min_distance;
            }
            return min_distance
        },
        relayout: function() {
            OHLC.__super__.relayout.apply(this);
            this.set_ranges();
            this.el.select(".intselmouse")
                .attr("width", this.width)
                .attr("height", this.height);

            // We have to redraw every time that we relayout
            this.draw();
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var stroke = this.model.get("stroke");
            var color = this.model.get("color");
            this.rect_dim = inter_y_disp * 0.8;
            var that = this;

            this.legend_el = elem.selectAll(".legend" + this.uuid)
                                 .data([this.model.mark_data]);

            var leg = this.legend_el.enter().append("g")
                .attr("transform", function(d, i) {
                    return "translate(0, " + (i * inter_y_disp + y_disp) + ")";
                })
                .attr("class", "legend" + this.uuid)
                .attr("fill", color)
                .on("mouseover", _.bind(this.highlight_axes, this))
                .on("mouseout", _.bind(this.unhighlight_axes, this));

            leg.append("path").attr("class", "stick_head");
            leg.append("path").attr("class", "stick_tail");
            leg.append("path").attr("class", "stick_body").attr("fill", color);

            // Add stroke color and set position
            leg.selectAll("path")
                .attr("stroke", stroke)
                .attr("transform", "translate(" + (that.rect_dim/2) + ",0)");

            // Draw icon and text
            this.draw_legend_icon(that.rect_dim, leg);
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
        draw_legend_icon: function(size, selector) {
            /*
             * Draw OHLC icon next to legend text
             * Drawing the icon like this means we can avoid scaling when we
             * already know what the size of the mark is in pixels
             */
            var height = size;
            var width = size/2;
            var bottom_y_offset = size*3/4;
            var top_y_offset = size/4;
            if(this.model.get("marker") === "candle") {
                selector.selectAll(".stick_head").attr("d",
                    this.head_path_candle(width/2));
                selector.selectAll(".stick_tail").attr("d",
                    this.tail_path_candle(bottom_y_offset, width/2));
                selector.selectAll(".stick_body").attr("d",
                    this.body_path_candle(width*-1/2, top_y_offset, width,
                                          height/2));
            } else { // bar
                selector.selectAll(".stick_head").attr("d",
                    this.head_path_bar(width*-1/2, bottom_y_offset, width/2));
                selector.selectAll(".stick_tail").attr("d",
                    this.tail_path_bar(top_y_offset, width/2));
                selector.selectAll(".stick_body").attr("d",
                    this.body_path_bar(height));
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.OHLC", OHLC);
});

