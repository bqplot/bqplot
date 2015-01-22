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
                if (!that.model.dirty) { that.draw(); }
            });
            this.listenTo(that.y_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            OHLC.__super__.create_listeners.apply(this);
            this.model.on("change:stroke", this.update_stroke, this);
            this.model.on("change:color", this.update_color, this);
            this.model.on("change:opacity", this.update_opacity, this);
            this.model.on("change:marker", this.update_marker, this);

            this.listenTo(this.model, "change:idx_selected", this.update_idx_selected);
            this.model.on("change:selected_style", this.selected_style_updated, this);
            this.model.on("change:unselected_style", this.unselected_style_updated, this);
        },
        update_stroke: function() {
            var stroke = this.model.get("stroke");
            this.el.selectAll(".stick").style("stroke", stroke);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("stroke", stroke);
                this.legend_el.selectAll("text").style("fill", stroke);
            }
        },
        update_color: function() {
            var color = this.model.get("color");
            var that = this;

            // Only fill candles when close is lower than open
            this.el.selectAll(".stick").style("fill", function(d) {
                return (d[that.model.px.op] > d[that.model.px.cl] ? color : "none");
            });

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("fill", color);
            }
        },
        update_opacity: function() {
            var opacity = this.model.get("opacity");
            this.el.selectAll(".stick").style("opacity", opacity);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("opacity", opacity);
            }
        },
        update_marker: function() {
            var marker = this.model.get("marker");

            if (this.legend_el && this.rect_dim) {
                // Draw icon for legend
                this.draw_mark_paths(marker, this.rect_dim/2, this.legend_el);
            }

            // Redraw existing marks
            this.draw_mark_paths(marker, this.calculate_mark_width(),
                this.el.selectAll(".stick").data(this.model.xy_data.map(function(d) {
                    return d[1];
                })));
        },
        update_idx_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles(value);
        },
        apply_styles: function(indices) {
            var all_indices = _.range(this.model.xy_data.length);
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
                _.range(this.model.xy_data.length)
                    .filter(function(index) {
                        return sel_indices.indexOf(index) == -1; })
                : []);
            this.style_updated(style, unselected_indices);
        },
        update_selected_colors: function(idx_start, idx_end) {
            var stick_sel = this.el.selectAll(".stick");
            var current_range = _.range(idx_start, idx_end);
            if(current_range.length == this.model.xy_data.length) {
                current_range = [];
            }
            var that = this;
            var stroke = this.model.get("stroke");
            var selected_stroke = this.model.get("color");

            _.range(0, this.model.xy_data.length)
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
               (this.model.xy_data.length === 0))
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
                d3.bisectLeft(this.model.xy_data.map(function(d){
                    return d[0];
                }), data[0])]);
            var idx_end = d3.min([this.model.xy_data.length,
                d3.bisectRight(this.model.xy_data.map(function(d){
                    return d[0];
                }), data[1])]);
            this.update_selected_colors(idx_start, idx_end);

            if((idx_end === this.model.xy_data.length) &&
                (this.model.xy_data.length > 0))
            {
                // Decrement so that we stay in bounds for [] operator
                idx_end -= 1;
            }
            var indices = _.range(this.model.xy_data.length);
            var selected_data = [this.model.xy_data[idx_start][0],
                this.model.xy_data[idx_end][1]];
            var idx_selected = _.filter(indices, function(index) {
                var elem = that.model.xy_data[index][0];
                return (elem <= selected_data[1] && elem >= selected_data[0]);
            });
            return idx_selected;
        },
        invert_point: function(pixel) {
            var point = this.x_scale.scale.invert(pixel);
            var index = this.bisect(this.model.xy_data.map(function(d) {
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
                .data(this.model.xy_data.map(function(d) {
                    return d[1];
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

            // Update all of the marks
            this.el.selectAll(".stick")
                .style("fill", function(d, i) {
                    return (d[that.model.px.op] > d[that.model.px.cl]) ? color : "none";
                })
                .attr( "transform", function(d, i) {
                    return "translate(" + (that.x_scale.scale(that.model.xy_data[i][0])
                                        + that.x_offset) + ","
                                        + (that.y_scale.scale(d[that.model.px.hi])
                                        + that.y_offset) + ")";
                });

            // Draw the mark paths
            this.draw_mark_paths(this.model.get("marker"), mark_width, this.el);

            stick.exit().remove();
            this.apply_styles(this.selected_indices);

        },
        draw_mark_paths: function(type, mark_width, selector) {
            var that = this;

            // Determine OHLC marker type
            if(type == "candle") {
                selector.selectAll(".stick_head")
                    .attr("d", function(d, i) {
                        var bigger = (d[that.model.px.op] > d[that.model.px.cl]) ?
                            d[that.model.px.op] : d[that.model.px.cl];
                        return "m0,0 l0," + (that.y_scale.scale(bigger)
                                          - that.y_scale.scale(d[that.model.px.hi]));
                    });
                selector.selectAll(".stick_tail")
                    .attr("d", function(d, i) {
                        var smaller = (d[that.model.px.op] > d[that.model.px.cl]) ?
                            d[that.model.px.cl] : d[that.model.px.op];
                        return "m0," + (that.y_scale.scale(smaller)
                                     - that.y_scale.scale(d[that.model.px.hi])) +
                               "l0," + (that.y_scale.scale(d[that.model.px.lo])
                                     - that.y_scale.scale(smaller));
                    });
                selector.selectAll(".stick_body")
                    .attr("d", function(d, i) {
                        return "m" + (-1*mark_width/2) +","
                                   + (that.y_scale.scale(d[that.model.px.op])
                                   - that.y_scale.scale(d[that.model.px.hi])) +
                              " l" + (mark_width) + ",0" +
                            " l0," + (that.y_scale.scale(d[that.model.px.cl])
                                   - that.y_scale.scale(d[that.model.px.op])) +
                              " l" + (-1*mark_width) + ",0 z";
                  });
            } else {
                // bar
                selector.selectAll(".stick_head")
                  .attr("d", function(d, i) {
                      return "m" + (-1*mark_width/2) + ","
                                 + (that.y_scale.scale(d[that.model.px.op])
                                 - that.y_scale.scale(d[that.model.px.hi])) +
                            " l" + (mark_width/2) + ",0";
                  });
                selector.selectAll(".stick_tail")
                    .attr("d", function(d, i) {
                        return "m0," + (that.y_scale.scale(d[that.model.px.cl])
                                     - that.y_scale.scale(d[that.model.px.hi])) +
                                " l" + (mark_width/2) + ",0";
                    });
                selector.selectAll(".stick_body")
                    .attr("d", function(d, i) {
                        return "m0,0 l0," + (that.y_scale.scale(d[that.model.px.lo])
                                          - that.y_scale.scale(d[that.model.px.hi]));
                    });
            }
        },
        calculate_mark_width: function() {
            var that = this;
            var num_days_in_range = ((this.model.max_x - this.model.min_x)
                                    / (1000*60*60*24));
            var mark_width = (that.x_scale.scale(this.model.max_x)
                            - that.x_scale.scale(this.model.min_x))
                            / num_days_in_range;
            return mark_width;
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

            // Generate OHLC data to draw the legend icon
            var leg_ohlc = [
                that.y_scale.scale.invert((1/4)*that.rect_dim),
                that.y_scale.scale.invert(0),
                that.y_scale.scale.invert(that.rect_dim),
                that.y_scale.scale.invert((3/4)*that.rect_dim)
            ];
            this.legend_el = elem.selectAll(".legend" + this.uuid).data([leg_ohlc]);

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

            // Draw OHLC icon next to legend text
            this.draw_mark_paths(this.model.get("marker"), that.rect_dim/2, leg);

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
    WidgetManager.WidgetManager.register_widget_view("bqplot.OHLC", OHLC);
});

