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
            this.enable_highlight = this.options.enable_highlight;
            this.margin = this.parent.margin;
            this.vertical = this.model.get("orientation") === "vertical";
            this.height = this.parent.height - (this.margin.top + this.margin.bottom);
            this.width = this.parent.width - (this.margin.left + this.margin.right);

            var scale_promise = this.set_scale(this.model.get("scale"));
            this.model.on("change:scale", function(model, value) {
                this.update_scale(model.previous("scale"), value);
                // TODO: rescale_axis does too many things. Decompose
                this.axis.scale(this.axis_scale.scale); // TODO: this is in redraw_axisline
                this.rescale_axis();
            }, this);

            this.side = this.model.get("side");
            this.x_offset = 100;
            this.y_offset = 40;
            this.bar_height = 20;
            // Formatting data particular to the axis
            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"))
                .attr("class", "ColorBar")
                .attr("display", (this.model.get("visible") ? "inline" : "none"))
                .style("transform", this.get_topg_transform());

            this.label = this.model.get("label");
            this.ordinal = false;
            this.num_ticks = this.model.get("num_ticks");
            this.tick_values = this.model.get_typed_field("tick_values");

            var that = this;
            scale_promise.then(function() {
                that.tick_format = that.generate_tick_formatter();
                that.set_scales_range();
                that.append_axis();
                that.parent.on("margin_updated", that.parent_margin_updated, that);

                that.model.on("change:tick_format", that.tickformat_changed, that);
                that.model.on("change:visible", that.update_visibility, that);
                that.model.on("change:label", that.update_label, that);
                that.model.on_some_change(["side", "orientation"], function() {
                    this.vertical = this.model.get("orientation") === "vertical";
                    this.side = this.model.get("side");
                    this.rescale_axis();
                    this.redraw_axis();
                }, that);
            });
        },
        set_scale: function(model) {
            // Sets the child scale
            var that = this;
            if (this.axis_scale) { this.axis_scale.remove(); }
            return this.create_child_view(model).then(function(view) {
                // Trigger the displayed event of the child view.
                that.after_displayed(function() {
                    view.trigger("displayed");
                }, that);
                that.axis_scale = view;
                that.axis_scale.on("domain_changed", that.redraw_axisline, that);
                that.axis_scale.on("color_scale_range_changed", that.redraw_axis, that);
                that.axis_scale.on("highlight_axis", that.highlight, that);
                that.axis_scale.on("unhighlight_axis", that.unhighlight, that);

                // TODO: eventually removes what follows
                if(that.axis_scale.model.type === "date_color_linear") {
                    that.axis_line_scale = d3.time.scale().nice();
                } else if(that.axis_scale.model.type === "ordinal") {
                    that.axis_line_scale = d3.scale.ordinal();
                    that.ordinal = true;
                } else {
                    that.axis_line_scale = d3.scale.linear();
                }
            });
        },
        append_axis: function() {
            // The label is allocated a space of 100px. If the label
            // occupies more than 100px then you are out of luck.
            var that = this;
            if(this.label) {
                this.el.append("g")
                    .attr("transform", this.get_label_transform())
                    .attr("class", "axis label_g")
                    .append("text")
                    .append("tspan")
                    .attr("id", "text_elem")
                    .attr("dy", "0.5ex")
                    .text(this.model.get("label"))
                    .attr("class", "axislabel")
                    .style("text-anchor", this.vertical ? "middle" : "end");
            }

            var colorBar = this.el.append("g")
                .attr("id","colorBarG" + this.cid);

            this.draw_color_bar();
            this.axis_line_scale.domain(this.axis_scale.scale.domain());

            this.g_axisline = colorBar.append("g")
                .attr("class", "axis");

            this.axis = d3.svg.axis()
                .tickFormat(this.tick_format);
            this.redraw_axisline();
        },
        draw_color_bar: function() {
            var colorBar = this.el.select("#colorBarG" + this.cid);
            colorBar.attr("transform", this.get_colorbar_transform());

            var that = this;
            colorBar.selectAll(".g-rect")
                .remove();
            colorBar.selectAll(".g-defs")
                .remove();

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
                    .style("fill", function(d) { return d; });

                if(this.vertical) {
                    rects.attr("x", function(d, i) {
                        return i * bar_width - (that.height - 2 * that.x_offset);
                    });
                } else {
                    rects.attr("x", function(d, i) {
                        return i * bar_width;
                    });
                }
            }
            else {
                colorBar.append("g")
                    .attr("class", "g-defs")
                    .append("defs")
                    .append("linearGradient")
                    .attr({
                        id : "colorBarGradient" + this.cid,
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
                        "offset": function(d,i) {
                            return colorSpacing * (i) + "%";
                        },
                        "stop-color": function(d,i) { return that.colors[i]; },
                        "stop-opacity": 1
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
                        "stroke-width": 1
                    })
                    .style("fill","url(#colorBarGradient" + this.cid + ")");
            }
        },
        get_topg_transform: function() {
            if(this.vertical){
                if(this.side === "right") {
                    return "translate(" + this.get_basic_transform() + "px, 0px)"
                        + " translate(" + (this.margin.right/2) + "px, 0px)"
                        + " translate(" + (-this.bar_height) + "px, 0px)";
                }
                    return "translate(" + this.get_basic_transform() + "px, 0px)"
                        + " translate(" + -(this.margin.left/2) + "px, 0px)"
                        + " translate(" + (this.bar_height) + "px, 0px)";
            } else {
                if(this.side === "top") {
                    return "translate(0px, " + this.get_basic_transform() + "px)"
                        + "translate(0px, " + -(this.margin.top) + "px)"
                        + " translate(0px, " + (this.bar_height) + "px)"
                        + " translate(0px, 2em)";
                }
                return "translate(0px, " + this.get_basic_transform() + "px)"
                     + "translate(0px, " + this.margin.bottom + "px)"
                     + " translate(0px, " + (-this.bar_height) + "px)"
                     + " translate(0px, -2em)";
            }
        },
        get_label_transform: function() {
            if(this.vertical) {
                return "translate(" + ((this.side === "right") ?
                    (this.bar_height / 2) : (-this.bar_height / 2)) + ", " + (this.x_offset - 15) + ")";
            }
            return "translate(" + (this.x_offset - 5) + ", " + (this.bar_height / 2)+ ")";
        },
        get_axisline_transform: function() {
            if(this.vertical) {
                return "translate(" + ((this.side === "right") ?
                    this.bar_height : 0) + ", 0)";
            }
            return "translate(0, " + ((this.side === "top") ?
                    0 : this.bar_height) + ")";
        },
        get_colorbar_transform: function() {
            if(this.vertical) {
                return "translate(0, " + (this.x_offset) + ")";
            }
            return "translate(" + this.x_offset + ", 0)";
        },
        set_scales_range: function() {
            this.axis_scale.set_range();
            var range = (this.vertical) ?
                [this.height - 2 * this.x_offset, 0] : [0, this.width -  2 * this.x_offset];
            if(this.ordinal) {
                this.axis_line_scale.rangeRoundBands(range, 0.05);
            } else {
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
                var rectangles = this.el.select("#colorBarG" + this.cid)
                    .select(".g-rect")
                    .selectAll("rect")
                    .attr("width", bar_width);
                if(this.vertical) {
                    rectangles.attr("x", function(d, i) {
                        return (i * bar_width) - (self.height - 2 * self.x_offset);
                    });
                } else {
                    rectangles.attr("x", function(d, i) {
                        return i * bar_width;
                    });
                }
            } else {
                this.el.select("#colorBarG" + this.cid)
                    .select(".g-rect")
                    .selectAll("rect")
                    .attr("width", this.get_color_bar_width())
                    .attr("x", (this.vertical) ? -(this.height - 2 * this.x_offset) : 0);
            }
            if(this.label) {
                this.el.select(".label_g")
                    .attr("transform", this.get_label_transform())
                    .select("#text_elem")
                    .text(this.model.get("label"))
                    .style("text-anchor", this.vertical ? "middle" : "end");
            }
            this.g_axisline.call(this.axis);
        },
        redraw_axisline: function() {
            if (this.axis) {
                this.axis_line_scale.domain(this.axis_scale.scale.domain());
                // We need to set the range here again. Only because, if the
                // domain has changed from a two element array to a three
                // element one, the range of the axis has to be changed
                // accordingly.
                this.set_scales_range();
                this.axis.orient(this.side)
                    .scale(this.axis_line_scale);
                this.set_tick_values();
                this.g_axisline
                    .attr("transform", this.get_axisline_transform())
                    .call(this.axis);
            }
        },
        redraw_axis: function() {
            this.draw_color_bar();
            this.redraw_axisline();
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.ColorAxis", ColorBar);
});
