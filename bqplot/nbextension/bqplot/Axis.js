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

// Axis view to display the axis
define(["widgets/js/manager", "widgets/js/widget", "d3"], function(WidgetManager, widget, d3) {
     var units_array = ["em", "ex", "px"];
     var Axis = widget.WidgetView.extend({
         render: function() {
            this.parent = this.options.parent;
            this.highlight = this.options.highlight;
            this.margin = this.parent.margin;
            this.vertical = this.model.get("orientation") == "vertical" ? true : false;
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
            this.padding = this.model.get("padding");
            this.offset = 0;
            this.num_ticks = this.model.get("num_ticks");
            this.tick_values = this.model.get("tick_values");
            this.label_loc = this.model.get("label_location");
            this.label_offset = this.extract_label_offset(this.model.get("label_offset"));

            var offset_promise = this.get_offset();
            var that = this;
            Promise.all([scale_promise, offset_promise]).then(function() {
                that.tick_format = that.generate_tick_formatter();
                that.set_scales_range();
                that.append_axis();
                that.parent.on("margin_updated", that.parent_margin_updated, that);
            });

            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"))
                .style("display", this.model.get("visible") ? "inline" : "none");

            this.model.on("change:tick_values", this.tickvalues_changed, this);
            this.model.on("change:tick_format", this.tickformat_changed, this);
            this.model.on("change:num_ticks", function(model, value) { this.num_ticks=value; this.tickvalues_changed();}, this);
            this.model.on("change:color", this.update_color, this);
            this.model.on_some_change(["label", "label_color"], this.update_label, this);
            this.model.on_some_change(["grid_color", "grid_lines"], this.update_grid_lines, this);
            this.model.on("change:label_location", this.update_label_location, this);
            this.model.on("change:label_offset", this.update_label_offset, this);
            this.model.on("change:visible", this.update_visibility, this);
            this.model.on_some_change(["side", "orientation"], this.update_display, this);
        },
        update_display: function() {
            this.side = this.model.get("side");
            this.vertical = this.model.get("orientation") == "vertical" ? true : false;
            if(this.vertical) {
                this.axis.orient(this.side == "right" ? "right" : "left");
            } else {
                this.axis.orient(this.side == "top" ? "top" : "bottom");
            }
            this.label_offset = this.extract_label_offset(this.model.get("label_offset"));
            this.rescale_axis();
        },
        set_tick_values: function() {
            if (this.tick_values.length > 0) {
                this.axis.tickValues(this.tick_values);
            } else if (this.num_ticks != undefined) {
                this.axis.tickValues(this.get_ticks());
            } else {
                if (this.axis_scale.model.type == "ordinal") {
                    this.axis.tickValues(this.axis_scale.scale.domain());
                } else if (this.axis_scale.model.type == "log") {
                    var allticks = this.axis_scale.scale.ticks();
                    var oom = Math.abs(Math.log10(this.axis_scale.scale.domain()[1] / this.axis_scale.scale.domain()[0]));
                    if (oom < 2) {
                        this.axis.tickValues(allticks);
                    } else if (oom < 7) {
                        var useticks = [];
                        for (var i = 0; i < allticks.length; i++) {
                            var r = Math.abs(Math.log10(allticks[i]) % 1);
                            if ((Math.abs(r) < 0.001) || (Math.abs(r-1) < 0.001) || (Math.abs(r-0.30103) < 0.001) || (Math.abs(r-0.69897) < 0.001)) {
                                useticks.push(allticks[i]);
                            }
                        }
                        this.axis.tickValues(useticks);
                    } else {
                        var useticks = [];
                        var s = Math.round(oom / 10)
                        for (var i = 0; i < allticks.length; i++) {
                            var r = Math.abs(Math.log10(allticks[i]) % s);
                            if ((Math.abs(r) < 0.001) || (Math.abs(r-s) < 0.001)) {
                                useticks.push(allticks[i]);
                            }
                        }
                        this.axis.tickValues(useticks);
                    }
                } else {
                    this.axis.tickValues(this.axis_scale.scale.ticks());
                }
            }
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
        tickvalues_changed: function() {
            this.tick_values = this.model.get("tick_values");
            this.set_tick_values();
        },
        tickformat_changed: function() {
            this.tick_format = this.generate_tick_formatter();
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
        update_axis_domain: function() {
            var initial_range = (this.vertical) ? this.parent.get_padded_yrange(this.axis_scale.model) : this.parent.get_padded_xrange(this.axis_scale.model);
            var target_range = (this.vertical) ? this.parent.get_yrange() : this.parent.get_xrange();

            this.axis_scale.expand_domain(initial_range, target_range);
            this.axis.scale(this.axis_scale.scale);
        },
        generate_tick_formatter: function() {
            if(this.axis_scale.model.type == "date" || this.axis_scale.model.type == "date_color_linear")
                return d3.time.format(this.model.get("tick_format"));
            else if (this.axis_scale.model.type == "ordinal")
                return function(d) { return d; };
            return d3.format(this.model.get("tick_format"));
        },
        set_scales_range: function() {
            this.axis_scale.set_range((this.vertical) ? [this.height, 0] : [0, this.width]);
            if(this.offset_scale_model) {
                this.offset_scale.set_range((this.vertical) ? [0, this.width] : [this.height, 0]);
            }
        },
        create_axis_line: function() {
            if(this.vertical) {
                this.axis = d3.svg.axis().scale(this.axis_scale.scale).orient(this.side == "right" ? "right" : "left").tickFormat(this.tick_format);
            } else {
                this.axis = d3.svg.axis().scale(this.axis_scale.scale).orient(this.side == "top" ? "top" : "bottom");
            }
        },
        append_axis: function() {
            this.create_axis_line();
            this.update_axis_domain();

            this.g_axisline = this.el.append("g")
              .attr("class", "axis")
              .attr("transform", this.get_axis_transform())
              .call(this.axis);

            this.g_axisline.append("text")
              .attr("class", "axislabel")
              .attr(this.get_label_attributes())
              .style(this.get_text_styling())
              .text(this.model.get("label"));

            this.set_tick_values();
            this.update_grid_lines();
            this.update_color();
            this.update_label();
        },
        get_offset: function() {
            var that = this;
            var return_promise = Promise.resolve();
            this.loc = this.model.get("offset");
            if(this.loc["value"] != undefined){
                if(this.loc["scale"] == undefined) {
                    this.offset_scale = (this.vertical) ? this.parent.scale_x : this.parent.scale_y;
                } else {
                    this.offset_scale_model = this.loc["scale"];
                    return_promise = this.create_child_view(this.offset_scale_model).then(function(view) {
                        that.offset_scale = view;
                        if(that.offset_scale.model.type != "ordinal") {
                            that.offset_scale.scale.clamp(true);
                        }
                        that.offset_scale.on("domain_changed", that.rescale_axis, that);
                    });
                }
                this.offset_value = this.loc["value"];
            }
            return return_promise;
        },
        highlight_axis: function() {
            if(this.highlight){
                this.g_axisline.classed("axisbold", true);
            }
        },
        unhighlight_axis: function() {
            if(this.highlight){
                this.g_axisline.classed("axisbold", false);
            }
        },
        get_basic_transform: function() {
            if(this.vertical){
                return (this.side == "right") ? this.width : 0;
            } else {
                return (this.side == "top") ? 0 : this.height;
            }
        },
        get_axis_transform: function() {
            if(this.vertical){
                return "translate(" + this.process_offset() + ", 0)";
            } else {
                return "translate(0, " + this.process_offset() + ")";
            }
        },
        process_offset: function() {
            if(typeof this.loc["scale"] == "undefined" && typeof this.loc["value"] == "undefined") {
                return this.get_basic_transform();
            } else {
                var value = this.offset_scale.scale(this.offset_value);
                value = (value === undefined) ? this.get_basic_transform() : value;
                return this.offset_scale.offset + value;
            }
        },
        get_label_attributes: function() {
            var label_x = 0;
             if(this.vertical){
                 if(this.label_loc == "start")
                     label_x = -(this.height);
                 else if(this.label_loc == "middle")
                     label_x = -(this.height) / 2;

                 if(this.side == "right") {
                        return {transform: "rotate(-90)", x: label_x, y: this.label_offset,
                            dy: "1ex", dx: "0em"};
                 } else {
                        return {transform: "rotate(-90)", x: label_x, y: this.label_offset,
                            dy: "0em", dx: "0em"};
                 }
            } else {
                if(this.label_loc == "middle")
                    label_x = this.width / 2;
                else if (this.label_loc == "end")
                    label_x = this.width;

                if(this.side == "top") {
                    return {x: label_x, y: this.label_offset , dy: "0.75ex",
                            dx: "0em", transform: ""};
                } else {
                    return {x: label_x, y: this.label_offset, dy: "0.25ex",
                            dx: "0em", transform: ""};
                }
            }
        },
        get_text_styling: function() {
            // This function returns the text styling based on the attributes
            // of the axis. As of now, only the text-anchor attribute is set.
            // More can be added :)
            if(this.label_loc == "start")
                return {"text-anchor" : "start"};
            else if(this.label_loc == "end")
                return {"text-anchor" : "end"};
            else
                return {"text-anchor" : "middle"};
        },
        update_label: function() {
            this.g_axisline.select("text.axislabel").text(this.model.get("label"));
            this.el.selectAll(".axislabel").selectAll("text");
            if(this.model.get("label_color")!="" && this.model.get("label_color")!=null) {
                this.g_axisline.select("text.axislabel").style("fill", this.model.get("label_color"));
                this.el.selectAll(".axislabel").selectAll("text").style("fill", this.model.get("label_color"));
            }

        },
        update_label_location: function(model, value) {
            this.label_loc = value;
            this.g_axisline.select("text.axislabel")
                .attr(this.get_label_attributes())
                .style(this.get_text_styling());
        },
        update_label_offset: function(model, offset) {
            this.label_offset = this.extract_label_offset(offset);
            this.g_axisline.select("text.axislabel")
                .attr("y", this.label_offset);
        },
        extract_label_offset: function(label_offset) {
            // If the label offset is not defined, depending on the orientation
            // of the axis, an offset is set.
            if(label_offset == undefined) {
                if(!this.vertical)
                    label_offset = "2em"
                else
                    label_offset = "4ex"
            }
            // Label_offset is a signed distance from the axis line. Positive
            // is away from the figure and negative is towards the figure. The
            // notion of away and towards is different for left/ right and
            // top/bottom axis.
            var index = -1;
            for(var iter = 0;(iter < units_array.length && index == -1); iter++)
                index = label_offset.indexOf(units_array[iter]);
            if(index == -1)
                return label_offset;
            if(this.side == "top" || this.side == "left") {
                var num = -1 * parseInt(label_offset.substring(0, index));
                label_offset = num + label_offset.substring(index);
            }
            return label_offset;
        },
        remove: function() {
            Axis.__super__.remove.apply(this);
            this.el.remove();
        },
        update_grid_lines: function() {
            var axis_type = (this.vertical) ? "y" : "x";
            this.el.select("g." + "grid_lines").remove();

            var grid_lines = this.el.append("g")
                                   .attr("class", "grid_lines");

            grid_lines.selectAll("line.grid-line").remove();
            var grid_type = this.model.get("grid_lines");
            var is_x = axis_type == "x";

            //will not work for ordinal scale
            if(grid_type !== "none") {
                grid_lines.selectAll("line.grid-line")
                    .data(this.axis.tickValues())
                    .enter().append("line")
                    .attr("class", "grid-line")
                    .attr("x1", is_x ? this.axis_scale.scale : 0)
                    .attr("x2", is_x ? this.axis_scale.scale : this.width)
                    .attr("y1", is_x ? 0 : this.axis_scale.scale)
                    .attr("y2", is_x ? this.height : this.axis_scale.scale)
                    .attr("stroke", "grey")
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-dasharray", grid_type === "solid" ? "none" : ("5, 5"));

                if(this.model.get("grid_color")!="" && this.model.get("grid_color")!=null) {
                    grid_lines.selectAll("line.grid-line").attr("stroke", this.model.get("grid_color"));
                }
            }
        },
        update_color: function() {
            if(this.model.get("color")!="" && this.model.get("color")!=null) {
                this.el.selectAll(".tick").selectAll("line").style("stroke", this.model.get("color"));
                this.el.selectAll(".tick").selectAll("text").style("fill", this.model.get("color"));
                this.el.selectAll(".domain").style("stroke", this.model.get("color"));
            }
        },
        redraw_axisline: function() {
            // TODO: This call might not be necessary
            // TODO: Doesn't do what it states.
            // Has to redraw from a clean slate
            this.update_axis_domain();

            this.set_tick_values();
            this.update_grid_lines();
        },
        rescale_axis: function() {
            //function to be called when the range of the axis has been updated
            //or the axis has to be repositioned.
            this.set_scales_range();
            this.update_axis_domain();

            this.g_axisline.attr("transform", this.get_axis_transform());
            this.g_axisline.call(this.axis);
            this.g_axisline.select("text.axislabel")
                .attr(this.get_label_attributes())
                .style(this.get_text_styling())
                .text(this.model.get("label"));
            // TODO: what follows is currently part of redraw_axisline
            this.set_tick_values();
            this.update_grid_lines();
        },
        parent_margin_updated: function() {
            //sets the new dimensions of the g element for the axis.
            this.margin = this.parent.margin;
            this.width =  this.parent.width - this.margin.left - this.margin.right;
            this.height = this.parent.height - this.margin.top - this.margin.bottom;
            this.rescale_axis();
        },
        update_visibility: function(model, visible){
            this.el.style("display", visible ? "inline" : "none");
        },
        get_ticks: function(data_array){
            // Have to do different things based on the type of the scale.
            // If an array is passed, then just scale and return equally spaced
            // points in the array. This is the way it is done for ordinal
            // scales.
            if(this.axis_scale.model.type == "ordinal") {
                data_array = this.axis_scale.scale.domain();
            }
            if(this.num_ticks < 2)
                return [];
            if(data_array) {
                if(data_array.length <= this.num_ticks)
                    return data_array;
                else {
                   var step = Math.floor(data_array.length / (this.num_ticks - 1));
                   indices = _.range(0, data_array.length, step);
                   return indices.map(function(index) { return data_array[index]; });
                }
            }
            var scale_range = this.axis_scale.scale.domain();
            var max_index = (this.axis_scale.scale.domain().length - 1);
            var step = (scale_range[max_index] - scale_range[0]) / (this.num_ticks - 1);
            if(this.axis_scale.model.type == "date" || this.axis_scale.model.type == "date_color_linear") {
            //For date scale, the dates have to be converted into milliseconds
            //since epoch time and then back.
                scale_range[0] = scale_range[0].getTime();
                scale_range[max_index] = scale_range[max_index].getTime();
                var max = (scale_range[max_index] + (step * 0.5));
                var range_in_times = _.range(scale_range[0], max, step);
                return range_in_times.map(function(elem) { return new Date(elem); });
            } else {
                var max = (scale_range[max_index] + (step * 0.5));
                return _.range(scale_range[0], max, step);
            }
        },
        set_scale: function(model) {
            // Sets the child scale
            var that = this;
            if (this.axis_scale) {this.axis_scale.remove();}
            return this.create_child_view(model).then(function(view) {
                // Trigger the displayed event of the child view.
                that.after_displayed(function() { view.trigger("displayed"); }, that);
                that.axis_scale = view;
                that.axis_scale.on("domain_changed", that.redraw_axisline, that);
                that.axis_scale.on("highlight_axis", that.highlight_axis, that);
                that.axis_scale.on("unhighlight_axis", that.unhighlight_axis, that);
            });
        },
        update_scale: function(old, value) {
            // Called when the child scale changes
            this.axis_scale.off();
            this.set_scale(value);
        },

     });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Axis", Axis);
    return [Axis];
});
