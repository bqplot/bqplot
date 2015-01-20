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

define(["widgets/js/manager", "d3", "./Mark", "base/js/utils"], function(WidgetManager, d3, mark, utils) {
    var Mark = mark[0];
    var Hist = Mark.extend({
        render: function() {
            var base_creation_promise = Hist.__super__.render.apply(this);
            this.sel_indices = [-1];
            this.bar_index_sel = [];

            var self = this;
            return base_creation_promise.then(function() {
                self.create_listeners();
                self.draw();
            });
        },
        set_ranges: function() {
            var x_scale = this.scales["sample"];
            if(x_scale) {
                x_scale.set_range(this.parent.get_padded_xrange(x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["counts"];
            if(y_scale) {
                y_scale.set_range(this.parent.get_padded_yrange(y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            // In the case of Hist, a change in the "sample" scale triggers
            // a full "update_data" instead of a simple redraw.
            this.x_scale = this.scales["sample"];
            this.y_scale = this.scales["counts"];
            var that = this;
            this.listenTo(this.x_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.model.update_data(); }
            });
            this.listenTo(this.y_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            Hist.__super__.create_listeners.apply(this);
            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors",this.update_colors,this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
        },
        reset_selections: function() {
            if(!(this.selector_model)) {
                return;
            }
            var that = this;
            var colors = this.model.get("colors");
            this.bar_index_sel.forEach(function(d) {
                that.el.selectAll("#rect" + d).attr("fill", colors[0]);
            });
            this.bar_index_sel = [];
            this.sel_indices = [];
            this.selector_model.set("selected", jQuery.extend(true, [], []));
            this.selector.touch();
        },
        update_colors: function(model, colors) {
            this.el.selectAll(".bar").selectAll("rect").attr("fill", this.get_colors(0));
            if (model.get("labels") && colors.length > 1) {
                this.el.selectAll(".bar").selectAll("text").attr("fill", this.get_colors(1));
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
            var bar_width = (this.x_scale.scale(this.model.max_x) - this.x_scale.scale(this.model.min_x)) / this.model.num_bins;
            if (bar_width >= 10) {
                bar_width -= 2;
            }
            return bar_width;
        },
        relayout: function() {
            this.set_ranges();

            var that = this;
			this.el.selectAll(".bar")
			  .attr("transform", function(d) {
                  return "translate(" + that.x_scale.scale(d.x)
                                + "," + that.y_scale.scale(d.y) + ")";
              });
            var bar_width = this.calculate_bar_width();
            this.el.selectAll(".bar").select("rect")
              .transition().duration(300)
		      .attr("x", 2)
              .attr("width", bar_width)
		      .attr("height", function(d) {
                  return that.y_scale.scale(0) - that.y_scale.scale(d.y);
              });
        },
        draw: function() {
            var that = this;
            this.set_ranges();
            var colors = this.model.get("colors");
            var fill_color = colors[0];
            var select_color = (colors.length > 1) ? colors[1] : "red";

            var indices = [];
            this.model.mark_data.forEach(function(d, i) {
                indices.push(i);
            });

            var that = this;
            this.el.selectAll(".bar").remove();
            var bar_width = this.calculate_bar_width();
	        var bar = this.el.selectAll(".bar")
			  .data(this.model.mark_data)
		      .enter().append("g")
			  .attr("class","bar")
			  .attr("transform", function(d) {
                  return "translate(" + that.x_scale.scale(d.x) + ","
                                      + that.y_scale.scale(d.y) + ")";
              });

		    bar.append("rect")
              .attr("class", "rect")
              .attr("id", function(d, i) { return "rect"+i; })
		      .attr("x", 2)
              .attr("width", bar_width)
		      .attr("height", function(d) {
                  return that.y_scale.scale(0) - that.y_scale.scale(d.y);
              })
              .attr("fill", fill_color)
              .on("click", function(d, i) {
                  if(!(that.selector_model)) {
                     return;
                  }
                  buffer_index = [];
                  var elem_index = that.bar_index_sel.indexOf(i);
                  if( elem_index > -1 && d3.event.ctrlKey) {
                      that.bar_index_sel.splice(elem_index, 1);
                      d.forEach(function(elem) {
                          remove_index = that.sel_indices.indexOf(elem.index);
                          if(remove_index !== -1) {
                              that.sel_indices.splice(remove_index, 1);
                          }
                      });
                      that.el.selectAll("#rect" + i).attr("fill", fill_color);
                  }
                  else {
                      if(that.sel_indices[0] === -1) {
                          that.sel_indices.splice(0,1);
                      }
                      if(d3.event.ctrlKey) {
                          that.sel_indices.forEach(function(elem) {
                              buffer_index.push(elem);
                          });
                      } else if(d3.event.shiftKey) {
                          if(elem_index > -1) {
                              return;
                          }
                          that.sel_indices.forEach(function(elem) {
                              buffer_index.push(elem);
                          });
                          min_index = (that.bar_index_sel.length !== 0) ?
                              d3.min(that.bar_index_sel) : -1;
                          max_index = (that.bar_index_sel.length !== 0) ?
                              d3.max(that.bar_index_sel) : (that.mark_data).length;
                          if(i > max_index){
                              that.model.mark_data.slice(max_index + 1, i).forEach(function(data_elem ) {
                                  data_elem.map(function(elem) {
                                      buffer_index.push(elem.index);
                                  });
                              });
                              indices.slice(max_index + 1, i).forEach(function(data_elem ) {
                                  that.bar_index_sel.push(data_elem);
                              });
                          } else if(i < min_index){
                              that.model.mark_data.slice(i + 1, min_index).forEach(function(data_elem) {
                                  data_elem.map(function(elem) {
                                      buffer_index.push(elem.index);
                                  });
                              });
                              indices.slice(i+1, min_index).forEach(function(data_elem) {
                                  that.bar_index_sel.push(data_elem);
                              });
                          }
                      } else {
                          that.bar_index_sel.forEach(function(index) {
                              that.el.selectAll("#rect" + index).attr("fill", fill_color);
                          });
                          that.bar_index_sel = [];
                      }
                      that.sel_indices = (d.map(function(elem) {
                          return elem.index;
                      }));
                      that.bar_index_sel.push(i);
                      that.bar_index_sel.forEach(function(data_elem) {
                          _.bind(that.reset_colors(data_elem, select_color), that);
                      });
                  }
                  buffer_index.forEach(function(data_elem) {
                      that.sel_indices.push(data_elem);
                  });
                  that.selector_model.set("selected", jQuery.extend(true, [], that.sel_indices));
                  that.selector.touch();
                  if (!d3.event) {
                      d3.event = window.event;
                  }
                  var e = d3.event;
                  if (e.cancelBubble !== undefined) { // IE
                      e.cancelBubble = true;
                  }
                  if (e.stopPropagation) {
                      e.stopPropagation();
                  }
                  e.preventDefault();
              });
            this.update_stroke_and_opacity();
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
            rects.attr("fill", color);
        },
        update_selected_colors: function(idx_start, idx_end) {
            // listen to changes of idx_selected and draw itself
            var colors = this.model.get("colors");
            var select_color = colors.length > 1 ? colors[1] : "red";
            var fill_color = colors[0];
            bars_sel = this.el.selectAll(".bar");
            var current_range = _.range(idx_start, idx_end);
            if(current_range.length == this.model.num_bins) {
                current_range = [];
            }
            var self = this;
            _.range(0, this.model.num_bins).forEach(function(d) {
                self.el.selectAll("#rect" + d).attr("fill", fill_color);
            });
            current_range.forEach(function(d) {
                self.el.selectAll("#rect" + d).attr("fill", select_color);
            });
        },
        invert_range: function(start_pxl, end_pxl) {
            var self = this;
            var data = [start_pxl, end_pxl].map(function(elem) {
                return self.x_scale.scale.invert(elem);
            });
            var idx_start = d3.max([0, d3.bisectLeft(this.model.x_bins, data[0]) - 1]);
            var idx_end = d3.min([this.model.num_bins, d3.bisectRight(this.model.x_bins, data[1])]);
            this.update_selected_colors(idx_start, idx_end);

            var x_data = this.model.get_typed_field("sample");
            var indices = _.range(x_data.length);
            var selected_data = [this.model.x_bins[idx_start], this.model.x_bins[idx_end]];
            var idx_selected = _.filter(indices, function(index) {
                var elem = x_data[index];
                return (elem <= selected_data[1] && elem >= selected_data[0]);
            });
            return idx_selected;
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Hist", Hist);
});
