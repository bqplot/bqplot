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

define(["./components/d3/d3", "./Lines", "./Markers"], function(d3, LinesViewModule, markers) {
    "use strict";

    var bqSymbol = markers.symbol;
    var MarkerLines = LinesViewModule.Lines.extend({
        render: function() {
            var base_render_promise = LinesViewModule.Lines.__super__.render.apply(this);
            this.dot = bqSymbol().type(this.model.get("marker"))
                .size(this.model.get("marker_size"));

            var that = this;
            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
                that.compute_view_padding();
                that.draw();
            });
        },
        create_listeners: function() {
            MarkerLines.__super__.create_listeners.apply(this);
            this.listenTo(this.model, "change:marker", this.update_marker, this);
            this.listenTo(this.model, "change:marker_size", this.update_marker_size, this);
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            var curve_labels = this.model.update_labels();
            var legend_data = this.model.mark_data.map(function(d) {
                return {index: d.index, name: d.name, color: d.color,
                        opacity: d.opacity};
            });
            this.legend_el = elem.selectAll(".legend" + this.uuid)
              .data(legend_data, function(d, i) {
                  return d.name;
              });

            var that = this,
                rect_dim = inter_y_disp * 0.8;

            this.legend_el.enter()
                .append("g")
                .attr("class", "legend" + this.uuid)
                .attr("transform", function(d, i) {
                    return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
                })
                .on("mouseover", _.bind(function() {
                    this.event_dispatcher("legend_mouse_over");
                }, this))
                .on("mouseout", _.bind(function() {
                    this.event_dispatcher("legend_mouse_out");
                }, this))
                .on("click", _.bind(function() {
                    this.event_dispatcher("legend_clicked");
                }, this))
                .each(function(d, i) {
                    var g = d3.select(this);
                    g.append("line")
                        .style("stroke", that.get_element_color(d, i))
                        .attr({x1: 0, x2: rect_dim * 2, y1: rect_dim / 2 , y2: rect_dim / 2});
                    g.append("path")
                        .attr("transform", "translate(" + rect_dim +
                           "," + rect_dim / 2 + ")")
                        .attr("d", that.dot.size(20))
                        .style("fill", that.get_element_color(d, i));
                });

           this.legend_el.append("text")
               .attr("class", "legendtext")
               .attr("x", rect_dim * 2.4)
               .attr("y", rect_dim / 2)
               .attr("dy", "0.35em")
               .text(function(d, i) { return curve_labels[i]; })
               .style("fill", function(d, i) { return that.get_element_color(d, i); });

            var max_length = d3.max(curve_labels, function(d) {
                return d.length;
            });
            this.legend_el.exit().remove();
            return [this.model.mark_data.length, max_length];
        },
        draw: function(animate) {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            this.set_ranges();
            var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
            this.line = d3.svg.line()
                .x(function(d) { return x_scale.scale(d.x) + x_scale.offset; })
                .y(function(d) { return y_scale.scale(d.y) + y_scale.offset; })
                .defined(function(d) { return d.y !== null; });

            var curves_sel = this.el.selectAll(".curve")
                .data(this.model.mark_data, function(d, i) { return d.name; });

            var new_curves = curves_sel.enter().append("g").attr("class", "curve");
            new_curves.append("path").attr("class", "line").attr("fill", "none");

            var that = this;
            curves_sel.select(".line")
                .transition().duration(animation_duration)
                .style("stroke", function(d, i) { return that.get_element_color(d, i); })
                .style("stroke-width", this.model.get("stroke_width"))
                .style("stroke-dasharray", _.bind(this.get_line_style, this))
                .attr("d", function(d) { return that.line(d.values); });

            var dots = curves_sel.selectAll(".dot")
                .data(function(d) {
                    return d.values.map(function(e, i) {
                        return {x: e.x, y: e.y, color: that.get_colors(d.index)}; });
                });

            dots.enter()
                .append("path")
                .attr("class", "dot");

            dots.transition().duration(animation_duration)
                .attr("transform", function(d) { return "translate(" + (x_scale.scale(d.x) + x_scale.offset) +
                           "," + (y_scale.scale(d.y) + y_scale.offset) + ")";
                })
                .attr("d", this.dot.size(this.model.get("marker_size")))
                .style("fill", function(d) { return d.color; });

            //TODO: add drag listeners a la scatter
            //dots.call(this.drag_listener);
            dots.on("click", _.bind(function() {
                this.event_dispatcher("element_clicked");
            }, this));

            dots.exit().remove();

            this.x_pixels = (this.model.mark_data.length > 0) ?
                this.model.mark_data[0].values.map(function(d) {
                    return x_scale.scale(d.x) + x_scale.offset;
                }) : [];

            curves_sel.exit().remove();
        },
        update_marker: function(model, marker) {
            this.el.selectAll(".dot")
                .attr("d", this.dot.type(marker).size(this.model.get("marker_size")));
            this.legend_el.select("path").attr("d", this.dot.type(marker).size(20));
        },
        relayout: function() {
            this.set_ranges();
            this.draw();
        },
        create_labels: function() {
            //do nothing
        },
        compute_view_padding: function() {
            var x_padding = Math.sqrt(this.model.get("marker_size")) / 2 + 1.0;

            if(x_padding !== this.x_padding || x_padding !== this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = x_padding;
                this.trigger("mark_padding_updated");
            }
        },
        update_marker_size: function(model, marker_size) {
            this.compute_view_padding();
            var that = this;
            this.el.selectAll(".curve")
                .selectAll(".dot")
                .attr("d", that.dot.size(marker_size));
        },
        set_positional_scales: function() {
            var x_scale = this.scales.x, y_scale = this.scales.y;
            this.listenTo(x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },

    });

    return {
        MarkerLines: MarkerLines,
    };
});
