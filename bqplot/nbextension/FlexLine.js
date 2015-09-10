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

define(["./components/d3/d3", "./Lines"], function(d3, LinesViewModule) {
    "use strict";

    var FlexLine = LinesViewModule.Lines.extend({
        render: function() {
            var base_render_promise = LinesViewModule.Lines.__super__.render.apply(this);
            var self = this;

            return base_render_promise.then(function() {
                var x_scale = self.scales["x"], y_scale = self.scales["y"];
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
            this.listenTo(this.model, "change:colors", this.update_colors, this);
            this.listenTo(this.model, "change:labels_visibility", this.update_legend_labels, this);
            this.listenTo(this.model, "change:color change:width", this.update_and_draw, this);
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
                  .attr({"x1": function(d) { return x_scale.scale(d.x1); },
                         "x2": function(d) { return x_scale.scale(d.x2); },
                         "y1": function(d) { return y_scale.scale(d.y1); },
                         "y2": function(d) { return y_scale.scale(d.y2); }})
                  .attr("stroke", function(d) {
                      return that.get_element_color(d);
                  }).attr("stroke-width", function(d) {
                      return that.get_element_width(d);
                  });
            });
        },
        get_element_color: function(d) {
            var color_scale = this.scales["color"];
            if(color_scale !== undefined && d.color !== undefined) {
                return color_scale.scale(d.color);
            }
            return this.model.get("colors")[0];
        },
        get_element_width: function(d) {
            var width_scale = this.scales["width"];
            if(width_scale !== undefined && d.size !== undefined) {
                return width_scale.scale(d.size);
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
              .attr({"x1": function(d) { return x_scale.scale(d.x1); },
                     "x2": function(d) { return x_scale.scale(d.x2); },
                     "y1": function(d) { return y_scale.scale(d.y1); },
                     "y2": function(d) { return y_scale.scale(d.y2); },
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
