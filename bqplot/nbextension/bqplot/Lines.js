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
    var Lines = Mark.extend({
        render: function() {
            var base_render_promise = Lines.__super__.render.apply(this);
            var self = this;

            //TODO: create_listeners is put inside the promise success handler
            //because some of the functions depend on child scales being
            //created. Make sure none of the event handler functions make that
            //assumption.
            return base_render_promise.then(function() {
                self.line = d3.svg.line()
                    .interpolate(self.model.get("interpolate"))
                    .x(function(d) { return self.x_scale.scale(d.x) + self.x_offset; })
                    .y(function(d) { return self.y_scale.scale(d.y) + self.y_offset; })
                    .defined(function(d) { return d.y !== null; });
                self.create_listeners();
                self.draw();
            }, null);
        },
        create_listeners: function() {
            Lines.__super__.create_listeners.apply(this);
            this.model.on('change:interpolate', this.update_interpolate, this);
            this.model.on('change:colors', this.update_colors, this);
            this.model.on('data_updated', this.draw, this);
            this.model.on('change:stroke_width', this.update_stroke_width, this);
            this.model.on('change:curve_display', this.update_legend_labels, this);
            this.model.on('change:line_style', this.update_line_style, this);
        },
        update_legend_labels: function() {
            if(this.model.get("curve_display") == "none") {
                this.el.selectAll(".legend")
                    .attr("display", "none");

                this.el.selectAll(".curve_label")
                    .attr("display", "none");
            } else if(this.model.get("curve_display") == "label") {

                this.el.selectAll(".legend")
                    .attr("display", "none");

                this.el.selectAll(".curve_label")
                    .attr("display", "inline");
            } else {
                this.el.selectAll(".legend")
                    .attr("display", "inline");

                this.el.selectAll(".curve_label")
                    .attr("display", "none");
            }
        },
        get_line_style: function() {
            switch (this.model.get("line_style")) {
                case 'solid':
                    return "none";
                case 'dashed':
                    return "10,10";
                case 'dotted':
                    return "2,10";
            }
        },
        // Updating the style of the curve, stroke, colors, dashed etc...
        // Could be fused in a single function for increased readability
        // and to avoid code repetition
        update_line_style: function() {
            this.el.selectAll(".curve").selectAll("path").style("stroke-dasharray", $.proxy(this.get_line_style, this))
            if (this.legend_el) {
                this.legend_el.select("line").style("stroke-dasharray", $.proxy(this.get_line_style, this));
            }
        },
        update_stroke_width: function(model, stroke_width){
            this.el.selectAll(".curve").selectAll("path").style("stroke-width", stroke_width);
            if (this.legend_el){
                this.legend_el.select("line").style("stroke-width", stroke_width);
            }
        },
        update_colors: function(model, colors) {
            var that = this;
            // update curve colors
            this.el.selectAll(".curve").select("path")
                .style("stroke", function(d, i) { return that.get_colors(i); });
            // update legend colors
            if (this.legend_el){
                this.legend_el.select("line")
                    .style("stroke", function(d, i) { return that.get_colors(i); });
                this.legend_el.select("text")
                    .style("fill", function(d, i) { return that.get_colors(i); });
            }
        },
        update_interpolate: function(model, interpolate) {
            var that = this;
            this.line.interpolate(interpolate);
            this.el.selectAll(".curve").selectAll("path")
                .attr("d", function(d) { return that.line(d.values); });
        },
        rescale: function() {
            Lines.__super__.rescale.apply(this);
            this.set_ranges();

            var that = this;
            this.el.selectAll(".curve").selectAll("path")
                  .transition().duration(300)
                  .attr("d", function(d) { return that.line(d.values); });
            this.create_labels();
        },
        invert_range: function(start_pxl, end_pxl) {
            var self = this;
            var start = this.x_scale.scale.invert(start_pxl);
            var end = this.x_scale.scale.invert(end_pxl);
            var data = this.model.x_data[0] instanceof Array ? this.model.x_data[0] : this.model.x_data;

            var indices = [start, end].map(function(elem) { return self.bisect(data, elem); });
            this.model.set("idx_selected", indices);
            this.touch();
            return indices;
        },
        invert_point: function(pixel) {
            var data_point = this.x_scale.scale.invert(pixel);
            var data = this.model.x_data[0] instanceof Array ? this.model.x_data[0] : this.model.x_data;

            var index = this.bisect(data, data_point);
            this.model.set("idx_selected", [index]);
            this.touch();
            return index;
        },
        update_multi_range: function(brush_extent) {
            var that = this;
            var x_start = brush_extent[0];
            var x_end = brush_extent[1];

            var data = this.model.x_data[0] instanceof Array ? this.model.x_data[0] : this.model.x_data;
            var idx_start = this.bisect(data, x_start);
            var idx_end = this.bisect(data, x_end);

            x_start = (this.x_scale.model.type == "date") ? this.x_scale.format_date(x_start) : x_start;
            x_end = (this.x_scale.model.type == "date") ? this.x_scale.format_date(x_end) : x_end;

            this.selector_model.set("idx_selected", [idx_start, idx_end]);
            this.selector.touch();
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            this.model.update_labels();
            this.legend_el = elem.selectAll(".legend" + this.uuid)
                .data(this.model.mark_data, function(d, i) { return d.name; });

            var that = this;
            var rect_dim = inter_y_disp * 0.8;
            this.legend_el.enter()
              .append("g")
                .attr("class", "legend" + this.uuid)
                .attr("transform", function(d, i) { return "translate(0, " + (i * inter_y_disp + y_disp)  + ")"; })
                .on("mouseover", $.proxy(this.highlight_axis, this))
                .on("mouseout", $.proxy(this.unhighlight_axis, this))
              .append("line")
                .style("stroke", function(d,i) { return that.get_colors(i); })
                .style("stroke-width", this.model.get("stroke_width"))
                .style("stroke-dasharray", $.proxy(this.get_line_style, this))
                .attr({x1: 0, x2: rect_dim, y1: rect_dim / 2 , y2: rect_dim / 2});

            this.legend_el.append("text")
                .attr("class","legendtext")
                .attr("x", rect_dim * 1.2)
                .attr("y", rect_dim / 2)
                .attr("dy", "0.35em")
                .text(function(d, i) {return that.model.curve_labels[i]; })
                .style("fill", function(d,i) { return that.get_colors(i);});

            var max_length = d3.max(this.model.curve_labels, function(d) { return d.length; });
            this.legend_el.exit().remove();
            return [this.model.mark_data.length, max_length];
        },
        create_labels: function() {
            var curves_sel = this.el.selectAll(".curve");
            var that = this;

            curves_sel.selectAll(".curve_label").remove();
            curves_sel.append("text")
                    .attr("class", "curve_label")
                    .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
                    .attr("transform", function(d) { return "translate(" + that.x_scale.scale(d.value.x) + "," + that.y_scale.scale(d.value.y) + ")"; })
                    .attr("x", 3)
                    .attr("dy", ".35em")
                    .attr("display", function(d) { return (that.model.get("curve_display") != "label") ? "none" : "inline"; })
                    .text(function(d) { return d.name; });
        },
        legend_click: function(index) {
            var path = "#curve" + (index + 1);
            var opacity = this.model.mark_data[index].opacity = (this.model.mark_data[index].opacity === 1) ? 0.1 : 1;
            this.el.select("#legend"+(index+1))
                .style("opacity", opacity + 0.4);
            this.el.select(path).style("opacity", opacity);
        },
        update_curves_subset: function() {
            // TODO: Some of this should move to the model
            var that = this;
            // Show subset of curves
            var curves_subset = this.model.get("curves_subset");
            if (curves_subset.length > 1) {
                this.el.selectAll(".curve")
                    .select("path")
                    .attr("display", function(d, i) { return curves_subset.indexOf(i) != -1 ? "inline" : "none"; });
                this.el.selectAll(".curve")
                    .select(".curve_label")
                    .attr("display", function(d, i) { return (curves_subset.indexOf(i) != -1 && that.model.get("curve_display") == "label") ? "inline" : "none"; });
            } else { //make all curves visible
                this.el.selectAll(".curve").select("path").attr("display", "inline");
                this.el.selectAll(".curve").select(".curve_label").attr("display", function(d) { return that.model.get("curve_display") == "label" ? "inline" : "none"; });
            }
        },
        draw: function() {
            this.set_ranges();
            var curves_sel = this.el.selectAll(".curve")
                .data(this.model.mark_data, function(d, i) { return d.name; });

            var new_curves = curves_sel.enter().append("g")
                .attr("class", "curve");
            new_curves.append("path")
                .attr("class", "line")
                .attr("fill", "none");

            var that = this;
            curves_sel.select("path")
                .attr("id", function(d, i) { return "curve" + (i+1); })
                .style("stroke", function(d, i) { return that.get_colors(i); })
                .style("stroke-width", this.model.get("stroke_width"))
                .style("stroke-dasharray", $.proxy(this.get_line_style, this));

            curves_sel.select("path")
                .transition().duration(this.model.get("animate_dur"))
                .attr("d", function(d) { return that.line(d.values) });

            curves_sel.exit()
                .transition().duration(this.model.get("animate_dur"))
                .remove();

            this.el.selectAll(".curve")
                .select(".curve_label")
                .attr("display", function(d) { return that.model.get("curve_display") == "label" ? "inline" : "none"; });

            // alter the display only if a few of the curves are visible
            if(this.model.get("curves_subset").length > 0) {
                this.el.selectAll(".curve")
                    .select("path")
                    .attr("display", function(d, i) { return curves_subset.indexOf(i) != -1 ? "inline" : "none"; });
                this.el.selectAll(".curve")
                    .select(".curve_label")
                    .attr("display", function(d, i) { return (curves_subset.indexOf(i) != -1 && that.model.get("curve_display") == "label") ? "inline" : "none"; });
            }
            this.create_labels();
        },
    });

    WidgetManager.WidgetManager.register_widget_view("bqplot.Lines", Lines);
    return [Lines];
});
