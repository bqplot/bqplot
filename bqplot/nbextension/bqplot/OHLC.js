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
            this.model.on('change:stroke', this.update_stroke, this);
            this.model.on('change:color', this.update_color, this);
            this.model.on('change:opacity', this.update_opacity, this);
            this.model.on('change:marker', this.update_marker, this);

            this.listenTo(this.model, "change:idx_selected", this.update_idx_selected);
            this.model.on("change:selected_style", this.selected_style_updated, this);
            this.model.on("change:unselected_style", this.unselected_style_updated, this);
        },
        update_stroke: function() {
            var that = this;
            var stroke = this.model.get("stroke");
            this.el.selectAll(".stick").style("stroke", stroke);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("stroke", stroke);
                this.legend_el.selectAll("text").style("fill", stroke);
            }
        },
        update_color: function() {
            var that = this;
            var color = this.model.get("color");
            var px = {
                op: 0,
                hi: 1,
                lo: 2,
                cl: 3
            };

            // Only fill candles when close is lower than open
            this.el.selectAll(".stick").style("fill", function(d) {
                return (d[px.op] > d[px.cl] ? color : "none");
            });

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("fill", color);
            }
        },
        update_opacity: function() {
            var that = this;
            var opacity = this.model.get("opacity");
            this.el.selectAll(".stick").style("opacity", opacity);

            if (this.legend_el) {
                this.legend_el.selectAll("path").attr("opacity", opacity);
            }
        },
        update_marker: function() {
            var that = this;

            if (this.legend_el && that.rect_dim) {
                var leg = this.legend_el;
                leg.selectAll("path").remove()

                // Draw icon for legend
                if( this.model.get("marker") === "candle" ) {
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("d", function() {
                           return "m0," + (-1*that.rect_dim/2) +
                                 " l0," + (that.rect_dim/4);
                       });
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("d", function() {
                           return "m0," + (that.rect_dim/2) +
                                 " l0," + (-1*that.rect_dim/4);
                       });
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("fill", this.model.get("color"))
                       .attr("d", function() {
                           return "m" + (-1*that.rect_dim/4) + "," + (-1*that.rect_dim/4) +
                                  " l" + (that.rect_dim/2) + ",0" +
                                  " l0," + (that.rect_dim/2) +
                                  " l" + (-1*that.rect_dim/2) + ",0 z";
                       });
                } else {
                    // bar
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("d", function() {
                           return "m0," + (-1*that.rect_dim/2) +
                                 " l0," + (that.rect_dim);
                       });
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("d", function() {
                           return "m0," + (that.rect_dim/4) +
                                   " l" + (-1*that.rect_dim/4) + ",0";
                       });
                    leg.append("path")
                       .attr("transform", function(d, i) {
                           return "translate(" + (that.rect_dim/2) + "," +
                                                 (that.rect_dim/2) + ")";
                       })
                       .attr("stroke", this.model.get("stroke"))
                       .attr("d", function() {
                           return "m0," + (-1*that.rect_dim/4) +
                                   " l" + (that.rect_dim/4) + ",0";
                       });
                }
            }
            // Redraw existing marks
            this.draw();
        },
        update_idx_selected: function(model, value) {
            this.selected_indices = value;
            this.apply_styles(value);
        },
        apply_styles: function(indices) {
            var all_indices = _.range(this.model.x_data.length);
            this.set_default_style(all_indices);

            this.set_style_on_elements(this.selected_style, this.selected_indices);
            var unselected_indices = (indices == undefined) ?
                [] : _.difference(all_indices, indices);
            this.set_style_on_elements(this.unselected_style, unselected_indices);
        },
        set_style_on_elements: function(style, indices) {
            if( indices === undefined || indices.length == 0 ) {
                return;
            }
            var elements = this.el.selectAll(".stick");
            var that = this;
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) != -1;
            });
            elements.style(style);
        },
        set_default_style: function(indices) {
            if( indices === undefined || indices.length == 0 ) {
                return;
            }
            var color = this.model.get("color");
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            var elements = this.el.selectAll(".stick").filter(function(data, index) {
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
                _.range(this.model.x_data.length)
                  .filter(function(index){ return sel_indices.indexOf(index) == -1; })
                : []);
            this.style_updated(style, unselected_indices);
        },
        update_selected_colors: function(idx_start, idx_end) {
            var stick_sel = this.el.selectAll(".stick");
            var current_range = _.range(idx_start, idx_end);
            if(current_range.length == this.model.x_data.length) {
                current_range = [];
            }
            var that = this;
            var stroke = this.model.get("stroke");
            var selected_stroke = this.model.get("color");

            _.range(0, this.model.x_data.length)
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
            if( start_pxl === undefined && end_pxl === undefined ) {
                this.update_selected_colors(-1,-1);
                idx_selected = [];
                return idx_selected;
            }
            var that = this;
            var data = [start_pxl, end_pxl].map( function(elem) {
                return that.x_scale.scale.invert(elem);
            });
            var idx_start = d3.max([0, d3.bisectLeft(this.model.x_data, data[0])]);
            var idx_end = d3.min([this.model.x_data.length, d3.bisectRight(this.model.x_data, data[1])]);
            this.update_selected_colors(idx_start, idx_end);

            var indices = _.range(this.model.x_data.length);
            var selected_data = [this.model.x_data[idx_start], this.model.x_data[idx_end]];
            var idx_selected = _.filter(indices, function(index) {
                var elem = that.model.x_data[index];
                return (elem <= selected_data[1] && elem >= selected_data[0]);
            });
            return idx_selected;
        },
        invert_point: function(pixel) {
            var point = this.x_scale.scale.invert(pixel);
            var index = this.bisect(this.model.x_data, point);
            this.model.set("idx_selected", [index]);
            this.touch();
            return index;
        },
        draw: function() {
            this.set_ranges();
            var that = this;
            var color = this.model.get("color");
            var px = { // OHLC indices for y data
                op : 0,
                hi : 1,
                lo : 2,
                cl : 3
            };
            var mark_width = this.calculate_mark_width();
            var stick = this.el.selectAll(".stick")
                            .data(this.model.y_data);

            // Update existing
            stick.attr( "transform", function(d, i) {
                return "translate(" + (that.x_scale.scale(that.model.x_data[i]) + that.x_offset) +
                                "," + (that.y_scale.scale(d[px.hi]) + that.y_offset) + ")";
            });
            // Create new
            var new_sticks = stick.enter()
              .append("g")
              .attr("class", "stick")
              .attr("id", function(d, i) { return "stick"+i; })
              .attr("transform", function(d, i) {
                  return "translate(" + (that.x_scale.scale(that.model.x_data[i]) + that.x_offset) +
                                  "," + (that.y_scale.scale(d[px.hi]) + that.y_offset) + ")";
              })
              .style("stroke", this.model.get("stroke"))
              .style("opacity", this.model.get("opacity"))
              .style("fill", function(d, i) {
                  return (d[px.op] > d[px.cl]) ? color : "none";
              });
            new_sticks.append("path")
                      .attr("class", "stick_piece_1");
            new_sticks.append("path")
                      .attr("class", "stick_piece_2");
            new_sticks.append("path")
                      .attr("class", "stick_piece_3");

            // Determine OHLC marker type
            if( this.model.get("marker") == 'candle' ) {
                this.el.selectAll(".stick_piece_1")
                  .attr("d", function(d, i) {
                      var bigger = (d[px.op] > d[px.cl]) ? d[px.op] : d[px.cl];
                      return "m0,0 l0," + (that.y_scale.scale(bigger)-that.y_scale.scale(d[px.hi]));
                  });
                this.el.selectAll(".stick_piece_2")
                  .attr("d", function(d, i) {
                      var smaller = (d[px.op] > d[px.cl]) ? d[px.cl] : d[px.op];
                      return "m0," + (that.y_scale.scale(smaller)-that.y_scale.scale(d[px.hi])) +
                             "l0," + (that.y_scale.scale(d[px.lo])-that.y_scale.scale(smaller));
                  });
                this.el.selectAll(".stick_piece_3")
                  .attr("d", function(d, i) {
                       return "m" + (-1*mark_width/2) +"," + (that.y_scale.scale(d[px.op])-that.y_scale.scale(d[px.hi])) +
                             " l" + (mark_width) + ",0" +
                           " l0," + (that.y_scale.scale(d[px.cl])-that.y_scale.scale(d[px.op])) +
                             " l" + (-1*mark_width) + ",0 z";
                  });
            } else {
                // bar
                this.el.selectAll(".stick_piece_1")
                  .attr("d", function(d, i) {
                      return "m" + (-1*mark_width/2) + "," + (that.y_scale.scale(d[px.op])-that.y_scale.scale(d[px.hi])) +
                            " l" + (mark_width/2) + ",0";
                  });
                this.el.selectAll(".stick_piece_2")
                  .attr("d", function(d, i) {
                      return "m0," + (that.y_scale.scale(d[px.cl])-that.y_scale.scale(d[px.hi])) +
                              " l" + (mark_width/2) + ",0";
                  });
                this.el.selectAll(".stick_piece_3")
                  .attr("d", function(d, i) {
                      return "m0,0 l0," + (that.y_scale.scale(d[px.lo])-that.y_scale.scale(d[px.hi]));
                  });
            }

            // Remove extras
            stick.exit().remove();
            this.apply_styles(this.selected_indices);

        },
        calculate_mark_width: function() {
            var that = this;
            var num_days = ((this.model.max_x - this.model.min_x) / (1000*60*60*24));
            var mark_width = (that.x_scale.scale(this.model.max_x) - that.x_scale.scale(this.model.min_x)) / num_days;
            return mark_width;
        },
        relayout: function() {
            OHLC.__super__.relayout.apply(this);
            this.set_ranges();
            this.el.select(".intselmouse")
                .attr("width", this.width)
                .attr("height", this.height);

            // We have to redraw every time that we relayout
            var that = this;
            this.draw();
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            this.legend_el = elem.selectAll(".legend" + this.uuid)
                                 .data([this.model.x_data]);
            var stroke = this.model.get("stroke");
            var color = this.model.get("color");
            this.rect_dim = inter_y_disp * 0.8;
            var that = this;
            var leg = this.legend_el.enter()
              .append("g")
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp) + ")";
              })
              .attr("class", "legend" + this.uuid)
              .attr("fill", color)
              .on("mouseover", _.bind(this.highlight_axes, this))
              .on("mouseout", _.bind(this.unhighlight_axes, this));

            // Draw OHLC icon next to legend text
            if( this.model.get("marker") === "candle" ) {
                leg.append("path")
                   .attr("transform", function(d, i) {
                       return "translate(" + (that.rect_dim/2) + "," +
                                             (that.rect_dim/2) + ")";
                   })
                   .attr("d", function() { return "m0," + (-1*that.rect_dim/2) +
                                                  " l0," + (that.rect_dim/4); });
                leg.append("path")
                   .attr("transform", function(d, i) { return "translate(" + (that.rect_dim/2) + "," +
                                                                             (that.rect_dim/2) + ")"; })
                   .attr("d", function() { return "m0," + (that.rect_dim/2) +
                                                  " l0," + (-1*that.rect_dim/4); });
                leg.append("path")
                   .attr("transform", function(d, i) { return "translate(" + (that.rect_dim/2) + "," +
                                                                             (that.rect_dim/2) + ")"; })
                   .attr("fill", color)
                   .attr("d", function() { return "m" + (-1*that.rect_dim/4) + "," + (-1*that.rect_dim/4) +
                                                  " l" + (that.rect_dim/2) + ",0" +
                                                  " l0," + (that.rect_dim/2) +
                                                  " l" + (-1*that.rect_dim/2) + ",0 z"; });
            } else {
                // bar
                leg.append("path")
                   .attr("transform", function(d, i) { return "translate(" + (that.rect_dim/2) + "," +
                                                                             (that.rect_dim/2) + ")"; })
                   .attr("d", function() { return "m0," + (-1*that.rect_dim/2) +
                                                  " l0," + (that.rect_dim); });
                leg.append("path")
                   .attr("transform", function(d, i) { return "translate(" + (that.rect_dim/2) + "," +
                                                                             (that.rect_dim/2) + ")"; })
                   .attr("d", function() { return "m0," + (that.rect_dim/4) +
                                                  " l" + (-1*that.rect_dim/4) + ",0"; });
                leg.append("path")
                   .attr("transform", function(d, i) { return "translate(" + (that.rect_dim/2) + "," +
                                                                             (that.rect_dim/2) + ")"; })
                   .attr("d", function() { return "m0," + (-1*that.rect_dim/4) +
                                                  " l" + (that.rect_dim/4) + ",0"; });
            }

            // Add stroke color
            leg.selectAll("path").attr("stroke", stroke);

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

