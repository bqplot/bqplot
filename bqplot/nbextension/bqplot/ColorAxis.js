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

define(["widgets/js/manager", "d3", "./utils", "./ColorUtils", "./Axis"], function(WidgetManager, d3, utils, Col_Pic, Axis) {
    var AxisView = Axis[0];
    var ColorBar = AxisView.extend({
        render: function() {
            this.parent = this.options.parent;
            this.highlight = this.options.highlight;
            this.margin = this.parent.margin;
            this.vertical = this.model.get("orientation") == "vertical" ? true : false;
            this.height = this.parent.height - (this.margin.top + this.margin.bottom);
            this.width = this.parent.width - (this.margin.left + this.margin.right);
            this.unique_id = IPython.utils.uuid();

            // scale data for drawing the axis
            var scale = this.model.get("scale");
            var that = this;
            this.create_child_view(scale).then(function(view) {
                that.axis_scale = view;
                that.axis_scale.set_range();
                that.axis_scale.on("domain_changed", that.redraw_axisline, that);
                that.axis_scale.on("color_scale_range_changed", that.redraw_axis, that);
                if(that.axis_scale.model.type == "date_color_linear") {
                    that.axis_line_scale = d3.time.scale().nice();
                } else if(that.axis_scale.model.type == "ordinal") {
                    that.axis_line_scale = d3.scale.ordinal();
                    that.ordinal = true;
                } else {
                    that.axis_line_scale = d3.scale.linear();
                }

                that.tick_format = that.generate_tick_formatter();
                that.append_axis();
            });

            // attributes used in drawing the color bar
            this.x_offset = 100;
            this.y_offset = 40;
            this.bar_height = 20;
            this.side = this.model.get("side");
            // Formatting data particular to the axis
            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"))
                .attr("class", "ColorBar")
                .attr("display", (this.model.get("visible") ? "inline" : "none"))
                .style("transform", this.get_topg_transform());

            this.label = this.model.get("label");
            this.ordinal = false;
            this.num_ticks = this.model.get("num_ticks");
            this.tick_values = this.model.get("tick_values");

            this.parent.on("margin_updated", this.parent_margin_updated, this);
            this.model.on("change:tick_format", this.tickformat_changed, this);
            this.model.on("change:visible", this.update_visibility, this);
            this.model.on("change:label", this.update_label, this);
        },
        append_axis: function() {
            // The label is allocated a space of 100px. If the label
            // occupies more than 100px then you are out of luck :)
            this.axis_line_scale.domain(this.axis_scale.scale.domain());
            this.set_scales_range();

            this.axis = d3.svg.axis()
                .scale(this.axis_line_scale)
                .orient(this.side)
                .tickFormat(this.tick_format);

            var that = this;
            if(this.label) {
                this.el.append("g")
                    .attr("transform", this.get_label_transform())
                    .attr("class", "axis")
                    .append("text")
                    .append("tspan")
                    .attr("id", "text_elem")
                    .attr("dy", "0.5ex")
                    .text(this.model.get("label"))
                    .attr("class", "axislabel")
                    .style("text-anchor", this.vertical ? "middle" : "end");
            }

            var colorBar = this.el.append("g")
                .attr({
                    "id"        : "colorBarG" + this.unique_id,
                    "transform" : this.get_colorbar_transform()
                });

            this.draw_color_bar();
            this.g_axisline = colorBar.append("g")
                .attr("class", "axis")
                .call(this.axis)
                .attr("transform", this.get_axisline_transform());
            this.set_tick_values();
        },
        draw_color_bar: function() {
            var colorBar = this.el.select("#colorBarG" + this.unique_id);
            var that = this;
            colorBar.selectAll(".g-rect")
                .remove();
            colorBar.selectAll(".g-defs")
                .remove();

            this.set_scales_range();
            this.colors = this.axis_scale.scale.range();
            var colorSpacing = 100 / (this.colors.length - 1);

            if(this.ordinal) {
                var bar_width = this.get_color_bar_width() / this.colors.length;
                var rects = colorBar.append("g")
                    .attr("class", "g-rect axis")
                    .style("transform", (this.vertical) ? "rotate(-90deg)" : "")
                    .selectAll("rect")
                    .data(this.colors);

                rects.enter()
                    .append("rect")
                    .attr("y", 0)
                    .attr("height", this.bar_height)
                    .attr("width", bar_width)
                    .style("fill",function(d) { return d; });

                if(this.vertical) {
                    rects.attr("x", function(d, i) { return i * bar_width - (that.height - 2 * that.x_offset)  ; });
                } else {
                    rects.attr("x", function(d, i) { return i * bar_width; });
                }
            }
            else {
                colorBar.append("g")
                    .attr("class", "g-defs")
                    .append("defs")
                    .append("linearGradient")
                    .attr({
                        id : "colorBarGradient" + this.unique_id,
                        x1 : "0%",
                        y1 : "0%",
                        x2 : "100%",
                        y2 : "0%"
                    })
                    .selectAll("stop")
                    .data(this.colors)
                    .enter()
                    .append("stop")
                    .attr({
                        "offset": function(d,i){return colorSpacing * (i) + "%"},
                        "stop-color":function(d,i){return that.colors[i]},
                        "stop-opacity":1
                    });

                colorBar.append("g")
                    .attr("class", "g-rect axis")
                    .style("transform", (this.vertical) ? "rotate(-90deg)" : "")
                    .append("rect")
                    .attr({
                        "width": this.get_color_bar_width(),
                        "height": this.bar_height,
                        x: (this.vertical) ? -(this.height - 2 * this.x_offset) : 0,
                        y: 0,
                        "stroke-width":1
                    })
                    .style("fill","url(#colorBarGradient" + this.unique_id + ")");
            }
        },
        get_topg_transform: function() {
            if(this.vertical){
                if(this.side == "right") {
                    return "translate(" + this.get_basic_transform() + "px, 0px)" + " translate(" + this.margin.right + "px, 0px)" +
                         " translate(" + (-this.bar_height) + "px, 0px) translate(-5em, 0px)";
                }
                    return "translate(" + this.get_basic_transform() + "px, 0px)" + " translate(" + -(this.margin.left) + "px, 0px)" +
                         " translate(" + (this.bar_height) + "px, 0px) translate(5em, 0px)";

            } else {
                return "translate(0px, " + this.get_basic_transform() + "px)" + "translate(0px, " + this.margin.bottom + "px)" +
                         " translate(0px, " + (-this.bar_height) + "px) translate(0px, -2em)";
            }
        },
        get_label_transform: function() {
            if(this.vertical) {
                return "translate(" + ((this.side == "right") ? (this.bar_height / 2) : (-this.bar_height / 2)) + ", " + (this.x_offset - 15) + ")";
            }
            return "translate(" + (this.x_offset - 5) + ", " + (this.bar_height / 2)+ ")";
        },
        get_axisline_transform: function() {
            if(this.vertical) {
                return "translate(" + ((this.side == "right") ? this.bar_height : -(this.bar_height)) + ", 0)";
            }
            return "translate(0, " + this.bar_height + ")";
        },
        get_colorbar_transform: function() {
            if(this.vertical) {
                return "translate(0, " + (this.x_offset) + ")";
            }
            return "translate(" + this.x_offset + ", 0)";
        },
        set_scales_range: function() {
            var range = (this.vertical) ? [this.height - 2 * this.x_offset, 0] : [0, this.width -  2 * this.x_offset];
            if(this.ordinal) {
                this.axis_line_scale.rangeRoundBands(range, 0.05);
            }
            else {
                if(this.axis_scale.divergent) {
                    this.axis_line_scale.range([range[0], (range[0] + range[1]) * 0.5, range[1]]);
                } else {
                    this.axis_line_scale.range(range);
                }
            }
        },
        get_color_bar_width: function() {
            return (this.vertical) ? (this.height - (2 * this.x_offset)) : (this.width - 2 * this.x_offset);
        },
        tickformat_changed: function() {
            this.tick_format = this.generate_tick_formatter();
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
        update_label: function(model, value) {
            this.label = value;
            this.el.select("#text_elem")
                .text(this.label);
        },
        rescale_axis: function() {
            // rescale the axis
            this.height = this.parent.height - (this.margin.top + this.margin.bottom);
            this.width = this.parent.width - (this.margin.left + this.margin.right);
            this.set_scales_range();
            // shifting the entire g of the color bar first.
            this.el.style("transform", this.get_topg_transform());
            var self = this;
            var bar_width = this.get_color_bar_width() / this.colors.length;
            if(this.ordinal) {
                var rectangles = this.el.select("#colorBarG" + this.unique_id)
                    .select(".g-rect")
                    .selectAll("rect")
                    .attr("width", bar_width);
                if(this.vertical)
                    rectangles.attr("x", function(d, i) { return (i * bar_width) - (self.height - 2 * self.x_offset)  ; });
                else
                    rectangles.attr("x", function(d, i) { return i * bar_width; });
            } else {
                this.el.select("#colorBarG" + this.unique_id)
                    .select(".g-rect")
                    .selectAll("rect")
                    .attr("width", this.get_color_bar_width())
                    .attr("x", (this.vertical) ? -(this.height - 2 * this.x_offset) : 0);
            }
            this.g_axisline.call(this.axis);
        },
        redraw_axisline: function() {
            this.axis_line_scale.domain(this.axis_scale.scale.domain());
            this.axis.scale(this.axis_line_scale);
            this.set_tick_values();
            this.g_axisline.call(this.axis);
        },
        redraw_axis: function() {
            this.draw_color_bar();
            this.redraw_axisline();
        },
        set_tick_values: function() {
            if (this.tick_values.length > 0) {
                this.axis.tickValues(this.tick_values);
            } else if (this.num_ticks != undefined) {
                    this.axis.tickValues(this.get_ticks())
            } else {
                this.axis.tickValues((this.axis_scale.model.type == "ordinal")
                                    ? this.axis_scale.scale.domain()
                                    : this.axis_scale.scale.ticks())
            }
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.ColorAxis", ColorBar);

});
