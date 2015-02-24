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

define(["./d3", "./Lines"], function(d3, LinesViewModule) {
    "use strict";

    var FlexLine = LinesViewModule.Lines.extend({
        render: function() {
            var base_render_promise = LinesViewModule.Lines.__super__.render.apply(this);
            var self = this;

            return base_render_promise.then(function() {
                var x_scale = self.scales["x"], y_scale = self.scales["y"];

                self.line = d3.svg.line()
                  .interpolate(self.model.get("interpolation"))
                  .x(function(d) {
                      return x_scale.scale(d.x) + x_scale.offset;
                  })
                  .y(function(d) {
                      return y_scale.scale(d.y) + y_scale.offset;
                  })
                  .defined(function(d) { return d.y !== null; });
                self.create_listeners();
                self.draw();
            });
        },
        set_ranges: function() {
            FlexLine.__super__.set_ranges.apply(this);
            var width_scale = this.scales["width"];
            if(width_scale) {
                width_scale.set_range([0.5, this.model.get("stroke_width")]);
            }
        },
        create_listeners: function() {
            FlexLine.__super__.create_listeners.apply(this);
            this.model.on("change:interpolation", this.update_interpolation, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("change:stroke_width", this.update_stroke_width, this);
            this.model.on("change:labels_visibility", this.update_legend_labels, this);
            this.model.on("change:color change:width", this.update_and_draw, this);
        },
        update_stroke_width: function(model, stroke_width){
            this.el.selectAll(".curve").selectAll("path")
              .style("stroke-width", stroke_width);
        },
        update_interpolate: function(model, interpolate) {
            var that = this;
            this.line.interpolate(interpolate);
            this.el.selectAll(".curve").selectAll("path")
              .attr("d", function(d) { return that.line(d.values); });
        },
        update_colors: function(model, colors) {
            var that = this;
            this.el.selectAll(".curve").select("path")
              .style("stroke", function(d, i) { return that.get_colors(i); });
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var g_elements = elem.selectAll(".legend" + this.uuid)
              .data(this.model.mark_data, function(d, i) { return d.name; });

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            g_elements.enter().append("g")
              .attr("class", "legend" + this.uuid)
              .attr("transform", function(d, i) {
                  return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
              }).on("mouseover", _.bind(this.make_axis_bold, this))
              .on("mouseout", _.bind(this.make_axis_non_bold, this))
            .append("line")
              .style("stroke", function(d,i) { return that.get_colors(i); })
              .attr({x1: 0, x2: rect_dim, y1: rect_dim / 2 , y2: rect_dim / 2});

            g_elements.append("text")
              .attr("class","legendtext")
              .attr("x", rect_dim * 1.2)
              .attr("y", rect_dim / 2)
              .attr("dy", "0.35em")
              .text(function(d, i) {return that.model.get("labels")[i]; })
              .style("fill", function(d,i) { return that.get_colors(i); });
            var max_length = d3.max(this.model.get("labels"), function(d) {
                return d.length;
            });

            g_elements.exit().remove();
            return [this.model.mark_data.length, max_length];
        },
        draw: function() {
            this.set_ranges();
            var curves_sel = this.el.selectAll(".curve")
              .data(this.model.mark_data, function(d, i) { return d.name; });

            curves_sel.enter().append("g")
              .attr("class", "curve");

            curves_sel.exit()
              .transition().duration(this.model.get("animate_dur"))
              .remove();

            var x_scale = this.scales["x"], y_scale = this.scales["y"];

            var that = this;
            curves_sel[0].forEach(function(elem, index) {
                var lines = d3.select(elem).selectAll("line")
                  .data(that.model.mark_data[index]["values"]);
                lines.enter().append("line");
                lines.attr("class", "line-elem")
                  .attr({"x1": function(dataelem) { return x_scale.scale(dataelem.x1); },
                         "x2": function(dataelem) { return x_scale.scale(dataelem.x2); },
                         "y1": function(dataelem) { return y_scale.scale(dataelem.y1); },
                         "y2": function(dataelem) { return y_scale.scale(dataelem.y2); }})
                  .attr("stroke", function(dataelem) {
                      return that.get_element_color(dataelem);
                  }).attr("stroke-width", function(dataelem) {
                      return that.get_element_width(dataelem);
                  });
            });

            this.el.selectAll(".curve")
              .select(".curve_label")
              .attr("display", function(d) {
                  return that.model.get("labels_visibility") === "label" ?
                      "inline" : "none";
              });

            // alter the display only if a few of the curves are visible
            var curves_subset = this.model.get("curves_subset");
            if(curves_subset.length > 0) {
                this.el.selectAll(".curve")
                  .select("path")
                  .attr("display", function(d, i) {
                      return curves_subset.indexOf(i) !== -1 ?
                          "inline" : "none";
                  });
                this.el.selectAll(".curve")
                  .select(".curve_label")
                  .attr("display", function(d, i) {
                      return (curves_subset.indexOf(i) !== -1 && that.model.get("labels_visibility") === "label") ?
                          "inline" : "none";
                  });
            }
        },
        get_element_color: function(dataelem) {
            var color_scale = this.scales["color"];
            if(color_scale !== undefined && dataelem.color !== undefined) {
                return color_scale.scale(dataelem.color);
            }
            return this.model.get("colors")[0];
        },
        get_element_width: function(dataelem) {
            var width_scale = this.scales["width"];
            if(width_scale !== undefined && dataelem.size !== undefined) {
                return width_scale.scale(dataelem.size);
            }
            return this.model.get("stroke_width");
        },
        relayout: function() {
            LinesViewModule.Lines.__super__.relayout.apply(this);
            this.set_ranges();

            var x_scale = this.scales["x"], y_scale = this.scales["y"];

            var that = this;
            this.el.selectAll(".curve").selectAll(".line-elem")
              .transition().duration(this.model.get("animate_dur"))
              .attr({"x1": function(dataelem) { return x_scale.scale(dataelem.x1); },
                     "x2": function(dataelem) { return x_scale.scale(dataelem.x2); },
                     "y1": function(dataelem) { return y_scale.scale(dataelem.y1); },
                     "y2": function(dataelem) { return y_scale.scale(dataelem.y2); },
              });
        },
        create_labels: function() {
            //do nothing
        },
    });

    return {
        FlexLine: FlexLine,
    }
});
