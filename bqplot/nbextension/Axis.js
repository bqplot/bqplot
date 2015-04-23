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

define(["widgets/js/widget", "./d3", "./utils"], function(Widget, d3, bqutils) {
    "use strict";

     var units_array = ["em", "ex", "px"];
     var Axis = Widget.WidgetView.extend({
         render: function() {

            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"))
              .style("display", this.model.get("visible") ? "inline" : "none");

            this.parent = this.options.parent;
            this.enable_highlight = this.options.enable_highlight;
            this.margin = this.parent.margin;
            this.vertical = this.model.get("orientation") === "vertical";
            this.height = this.parent.height - (this.margin.top + this.margin.bottom);
            this.width = this.parent.width - (this.margin.left + this.margin.right);

            var scale_promise = this.set_scale(this.model.get("scale"));
            this.side = this.model.get("side");
            this.padding = this.model.get("padding");
            this.offset = 0;
            this.num_ticks = this.model.get("num_ticks");
            this.label_loc = this.model.get("label_location");
            this.label_offset = this.extract_label_offset(this.model.get("label_offset"));

            var offset_promise = this.get_offset();
            var that = this;
            Promise.all([scale_promise, offset_promise]).then(function() {
                that.create_listeners();
                that.tick_format = that.generate_tick_formatter();
                that.set_scales_range();
                that.append_axis();
            });
        },
        create_listeners: function() {
            this.model.on("change:scale", function(model, value) {
                this.update_scale(model.previous("scale"), value);
                // TODO: rescale_axis does too many things. Decompose
                this.axis.scale(this.axis_scale.scale); // TODO: this is in redraw_axisline
                this.rescale_axis();
            }, this);

            this.model.on("change:tick_values", this.set_tick_values, this);
            this.model.on("change:tick_format", this.tickformat_changed, this);
            this.model.on("change:num_ticks", function(model, value) {
                this.num_ticks = value;
                this.set_tick_values();
            }, this);
            this.model.on("change:color", this.update_color, this);
            this.model.on_some_change(["label", "label_color"], this.update_label, this);
            this.model.on_some_change(["grid_color", "grid_lines"], this.update_grid_lines, this);
            this.model.on("change:label_location", this.update_label_location, this);
            this.model.on("change:label_offset", this.update_label_offset, this);
            this.model.on("change:visible", this.update_visibility, this);
            this.model.on_some_change(["side", "orientation"], this.update_display, this);
            this.model.on("change:offset", function() {
                var offset_creation_promise = this.get_offset();
                var that = this;
                offset_creation_promise.then(function() {
                    that.set_scales_range();
                    that.update_offset_scale_domain();
                    that.g_axisline.attr("transform", that.get_axis_transform());
                });
            }, this);
            this.parent.on("margin_updated", this.parent_margin_updated, this);
        },
        update_display: function() {
            this.side = this.model.get("side");
            this.vertical = this.model.get("orientation") === "vertical";
            if(this.vertical) {
                this.axis.orient(this.side === "right" ? "right" : "left");
            } else {
                this.axis.orient(this.side === "top" ? "top" : "bottom");
            }
            this.label_offset = this.extract_label_offset(this.model.get("label_offset"));
            this.rescale_axis();
        },
        set_tick_values: function() {
            var tick_values = this.model.get_typed_field("tick_values");
            var useticks = [];
            if (tick_values !== undefined && tick_values !== null && tick_values.length > 0) {
                this.axis.tickValues(tick_values);
            } else if (this.num_ticks !== undefined && this.num_ticks !== null) {
                this.axis.tickValues(this.get_ticks());
            } else {
                if (this.axis_scale.model.type === "ordinal") {
                    this.axis.tickValues(this.axis_scale.scale.domain());
                } else if (this.axis_scale.model.type === "log") {
                    var allticks = this.axis_scale.scale.ticks();
                    var oom = Math.abs(Math.log10(this.axis_scale.scale.domain()[1] / this.axis_scale.scale.domain()[0]));
                    if (oom < 2) {
                        this.axis.tickValues(allticks);
                    } else if (oom < 7) {
                        useticks = [];
                        for (var i = 0; i < allticks.length; i++) {
                            var r = Math.abs(Math.log10(allticks[i]) % 1);
                            if ((Math.abs(r) < 0.001) ||
                                (Math.abs(r-1) < 0.001) ||
                                (Math.abs(r-0.30103) < 0.001) ||
                                (Math.abs(r-0.69897) < 0.001)) {
                                useticks.push(allticks[i]);
                            }
                        }
                        this.axis.tickValues(useticks);
                    } else {
                        useticks = [];
                        var s = Math.round(oom / 10);
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
            if(this.model.get("tick_format") == null ||
                this.model.get("tick_format") == undefined) {
                    if(this.axis_scale.type !== "ordinal") {
                        // TODO: can be avoided if num_ticks and tickValues are
                        // not mentioned
                        this.tick_format = this.guess_tick_format(this.axis.tickValues());
                    }
            }
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
        tickformat_changed: function() {
            this.tick_format = this.generate_tick_formatter();
            this.axis.tickFormat(this.tick_format);
            if(this.g_axisline) {
                this.g_axisline.call(this.axis);
            }
        },
        update_axis_domain: function() {
            var initial_range = (this.vertical) ?
                this.parent.padded_range("y", this.axis_scale.model) : this.parent.padded_range("x", this.axis_scale.model);
            var target_range = (this.vertical) ?
                this.parent.range("y") : this.parent.range("x");
            this.axis_scale.expand_domain(initial_range, target_range);
            this.axis.scale(this.axis_scale.scale);
        },
        update_offset_scale_domain: function() {
            if(this.offset_scale) {
                var initial_range = (!this.vertical) ?
                    this.parent.padded_range("y", this.offset_scale.model) :
                    this.parent.padded_range("x", this.offset_scale.model);
                var target_range = (!this.vertical) ?
                    this.parent.range("y") :
                    this.parent.range("x");
                this.offset_scale.expand_domain(initial_range, target_range);
            }
        },
        generate_tick_formatter: function() {
            if(this.axis_scale.model.type === "date" ||
               this.axis_scale.model.type === "date_color_linear") {
                if(this.model.get("tick_format")) {
                    return d3.time.format(this.model.get("tick_format"));
                } else {
                    return this.guess_tick_format();
                }
            } else if (this.axis_scale.model.type === "ordinal") {
                var tick_format = this.model.get("tick_format");
                if(tick_format) {
                    //TODO: This may not be the best way to do this. We can
                    //check the instance of the elements in the domain and
                    //apply the format depending on that.
                    if(bqutils.is_valid_time_format(tick_format)) {
                        return d3.time.format(tick_format);
                    } else {
                        return d3.format(tick_format);
                    }
                }
                return function(d) { return d; };
            } else {
                // linear or log scale
                if(this.model.get("tick_format")) {
                    return d3.format(this.model.get("tick_format"));
                }
                return this.guess_tick_format();
            }
        },
        set_scales_range: function() {
            this.axis_scale.set_range((this.vertical) ?
                [this.height, 0] : [0, this.width]);
            if(this.offset_scale) {
                this.offset_scale.set_range((this.vertical) ?
                    [0, this.width] : [this.height, 0]);
            }
        },
        create_axis_line: function() {
            if(this.vertical) {
                this.axis = d3.svg.axis().scale(this.axis_scale.scale)
                  .orient(this.side === "right" ? "right" : "left");
            } else {
                this.axis = d3.svg.axis().scale(this.axis_scale.scale)
                  .orient(this.side === "top" ? "top" : "bottom");
            }
        },
        append_axis: function() {
            this.create_axis_line();
            this.update_axis_domain();
            this.update_offset_scale_domain();

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
            /*
             * The offset may require the creation of a Scale, which is async
             * Hence, get_offset returns a promise.
             */
            var that = this;
            var return_promise = Promise.resolve();
            var offset = this.model.get("offset");
            if(offset["value"] !== undefined && offset["value"] !== null) {
                //If scale is undefined but, the value is defined, then we have
                //to
                if(offset["scale"] === undefined) {
                    this.offset_scale = (this.vertical) ?
                        this.parent.scale_x : this.parent.scale_y;
                } else {
                    var offset_scale_model = offset["scale"];
                    return_promise = this.create_child_view(offset_scale_model)
                        .then(function(view) {
                            that.offset_scale = view;
                            if(that.offset_scale.model.type !== "ordinal") {
                                that.offset_scale.scale.clamp(true);
                            }
                            that.offset_scale.on("domain_changed",
                                                 function() {
                                                    this.update_offset_scale_domain();
                                                    this.g_axisline.attr("transform", this.get_axis_transform());
                                                 }, that);
                        });
                }
                this.offset_value = offset["value"];
            } else {
                //required if the offset has been changed from a valid value
                //to null
                this.offset_scale = this.offset_value = undefined;
            }
            return return_promise;
        },
        highlight: function() {
            /*
             * Highlights the axis
             */
            if(this.enable_highlight){
                this.g_axisline.classed("axisbold", true);
            }
        },
        unhighlight: function() {
            /*
             * Unhighlight the axis
             */
            if(this.enable_highlight){
                this.g_axisline.classed("axisbold", false);
            }
        },
        get_basic_transform: function() {
            if(this.vertical){
                return (this.side === "right") ? this.width : 0;
            } else {
                return (this.side === "top") ? 0 : this.height;
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
            if(this.offset_scale === undefined || this.offset_scale === null) {
                return this.get_basic_transform();
            } else {
                var value = this.offset_scale.scale(this.offset_value);
                //The null check is required for two reasons. Value may be null
                //or the scale is ordinal which does not include the value in
                //its domain.
                value = (value === undefined) ? this.get_basic_transform()
                                              : value;
                return this.offset_scale.offset + value;
            }
        },
        get_label_attributes: function() {
            var label_x = 0;
             if(this.vertical){
                 if(this.label_loc === "start") {
                     label_x = -(this.height);
                 } else if(this.label_loc === "middle") {
                     label_x = -(this.height) / 2;
                 }
                 if(this.side === "right") {
                    return {
                        transform: "rotate(-90)",
                        x: label_x,
                        y: this.label_offset,
                        dy: "1ex",
                        dx: "0em"
                    };
                 } else {
                     return {
                         transform: "rotate(-90)",
                         x: label_x,
                         y: this.label_offset,
                         dy: "0em", dx: "0em"
                     };
                 }
            } else {
                if(this.label_loc === "middle") {
                    label_x = this.width / 2;
                } else if (this.label_loc === "end") {
                    label_x = this.width;
                }
                if(this.side === "top") {
                    return {
                        x: label_x,
                        y: this.label_offset ,
                        dy: "0.75ex",
                        dx: "0em", transform: ""
                    };
                } else {
                    return {
                        x: label_x,
                        y: this.label_offset,
                        dy: "0.25ex",
                        dx: "0em", transform: ""
                    };
                }
            }
        },
        get_text_styling: function() {
            // This function returns the text styling based on the attributes
            // of the axis. As of now, only the text-anchor attribute is set.
            // More can be added :)
            if(this.label_loc === "start")
                return {"text-anchor" : "start"};
            else if(this.label_loc === "end")
                return {"text-anchor" : "end"};
            else
                return {"text-anchor" : "middle"};
        },
        update_label: function() {
            this.g_axisline.select("text.axislabel")
                .text(this.model.get("label"));
            this.el.selectAll(".axislabel").selectAll("text");
            if(this.model.get("label_color") !== "" &&
               this.model.get("label_color") !== null) {
                this.g_axisline.select("text.axislabel")
                  .style("fill", this.model.get("label_color"));
                this.el.selectAll(".axislabel").selectAll("text")
                  .style("fill", this.model.get("label_color"));
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
            if(!label_offset) {
                if(!this.vertical) {
                    label_offset = "2em";
                } else {
                    label_offset = "4ex";
                }
            }
            // Label_offset is a signed distance from the axis line. Positive
            // is away from the figure and negative is towards the figure. The
            // notion of away and towards is different for left/right and
            // top/bottom axis.
            var index = -1;
            for(var it = 0; (it < units_array.length && index === -1); it++) {
                index = label_offset.indexOf(units_array[it]);
            }
            if(index === -1) {
                return label_offset;
            }
            if(this.side === "top" || this.side === "left") {
                var num = -1 * parseInt(label_offset.substring(0, index));
                label_offset = num + label_offset.substring(index);
            }
            return label_offset;
        },
        remove: function() {
            this.model.off(null, null, this);
            this.el.remove();
            Axis.__super__.remove.apply(this);
        },
        update_grid_lines: function() {
            this.el.select("g." + "grid_lines").remove();
            var grid_lines = this.el.append("g")
                                   .attr("class", "grid_lines");
            var that = this;

            grid_lines.selectAll("line.grid-line").remove();
            var grid_type = this.model.get("grid_lines");
            var is_x = !(this.vertical) ;

            //will not work for ordinal scale
            if(grid_type !== "none") {
                grid_lines.selectAll("line.grid-line")
                    .data(this.axis.tickValues())
                    .enter().append("line")
                    .attr("class", "grid-line")
                    .attr("x1", is_x ? function(d) { return (that.axis_scale.scale(d) + that.axis_scale.offset);} : 0)
                    .attr("x2", is_x ? function(d) { return (that.axis_scale.scale(d) + that.axis_scale.offset);} : this.width)
                    .attr("y1", is_x ? 0 : function(d) { return (that.axis_scale.scale(d) + that.axis_scale.offset);})
                    .attr("y2", is_x ? this.height : function(d) { return (that.axis_scale.scale(d) + that.axis_scale.offset);})
                    .attr("stroke", "grey")
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-dasharray", grid_type === "solid" ?
                          "none" : ("5, 5"));

                if(this.model.get("grid_color") !== "" &&
                   this.model.get("grid_color") !== null) {
                    grid_lines.selectAll("line.grid-line")
                      .attr("stroke", this.model.get("grid_color"));
                }
            }
        },
        update_color: function() {
            if(this.model.get("color") !== "" &&
               this.model.get("color") !== null) {
                this.el.selectAll(".tick").selectAll("line")
                  .style("stroke", this.model.get("color"));
                this.el.selectAll(".tick").selectAll("text")
                  .style("fill", this.model.get("color"));
                this.el.selectAll(".domain")
                  .style("stroke", this.model.get("color"));
            }
        },
        redraw_axisline: function() {
            // TODO: This call might not be necessary
            // TODO: Doesn't do what it states.
            // Has to redraw from a clean slate
            this.update_axis_domain();
            this.update_offset_scale_domain();

            this.set_tick_values();
            this.update_grid_lines();
        },
        rescale_axis: function() {
            //function to be called when the range of the axis has been updated
            //or the axis has to be repositioned.
            this.set_scales_range();
            //The following two calls to update domains are made as the domain
            //of the axis scale needs to be recalculated as the expansion due
            //to the padding depends on the size of the canvas because of the
            //presence of fixed pixel padding for the bounding box.
            this.update_axis_domain();
            this.update_offset_scale_domain();

            this.g_axisline.attr("transform", this.get_axis_transform());
            this.g_axisline.call(this.axis);
            this.g_axisline.select("text.axislabel")
                .attr(this.get_label_attributes())
                .style(this.get_text_styling());
            // TODO: what follows is currently part of redraw_axisline
            this.set_tick_values();
            this.update_grid_lines();
        },
        parent_margin_updated: function() {
            // sets the new dimensions of the g element for the axis.
            this.margin = this.parent.margin;
            this.width = this.parent.width - this.margin.left - this.margin.right;
            this.height = this.parent.height - this.margin.top - this.margin.bottom;
            this.rescale_axis();
        },
        update_visibility: function(model, visible) {
            this.el.style("display", visible ? "inline" : "none");
        },
        get_ticks: function(data_array) {
            // Have to do different things based on the type of the scale.
            // If an array is passed, then just scale and return equally spaced
            // points in the array. This is the way it is done for ordinal
            // scales.
            if(this.axis_scale.model.type === "ordinal") {
                data_array = this.axis_scale.scale.domain();
            }
            if(this.num_ticks < 2)
                return [];
            if(data_array) {
                if(data_array.length <= this.num_ticks) {
                    return data_array;
                } else {
                   var step = Math.floor(data_array.length / (this.num_ticks - 1));
                   var indices = _.range(0, data_array.length, step);
                   return indices.map(function(index) {
                       return data_array[index];
                   });
                }
            }
            var scale_range = this.axis_scale.scale.domain();
            var max_index = (this.axis_scale.scale.domain().length - 1);
            var step = (scale_range[max_index] - scale_range[0]) / (this.num_ticks - 1);
            if(this.axis_scale.model.type === "date" ||
               this.axis_scale.model.type === "date_color_linear") {
            //For date scale, the dates have to be converted into milliseconds
            //since epoch time and then back.
                scale_range[0] = scale_range[0].getTime();
                scale_range[max_index] = scale_range[max_index].getTime();
                var max = (scale_range[max_index] + (step * 0.5));
                var range_in_times = _.range(scale_range[0], max, step);
                return range_in_times.map(function(elem) {
                    return new Date(elem);
                });
            } else {
                var max = (scale_range[max_index] + (step * 0.5));
                return _.range(scale_range[0], max, step);
            }
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
                that.axis_scale.on("highlight_axis", that.highlight, that);
                that.axis_scale.on("unhighlight_axis", that.unhighlight, that);
            });
        },
        update_scale: function(old, value) {
            // Called when the child scale changes
            this.axis_scale.off();
            this.set_scale(value);
        },
        _get_digits: function(number) {
            return (number == 0) ? 1 : (Math.floor(Math.log10(Math.abs(number))) + 1);
        },
        _replace_trailing_zeros: function(str) {
            //regex to replace the trailing
            //zeros after the decimal point.
            //Handles the case of exponentially formatted string
            //TODO: Should be done in a single regex
            var e_index = str.search("e");
            if(e_index != -1) {
                return str.substring(0, e_index).replace(/(\.[0-9]*?)0+$/gi, "$1").replace(/\.$/, "") +
                       str.substring(e_index);
            } else {
                return str.replace(/(\.[0-9]*?)0+$/gi, "$1").replace(/\.$/, "");
            }
        },
        get_format_func: function(prec) {
            if(prec === 0) {
            // format this as an integer
                return function(number) { return d3.format("d")(Math.round(number)); }
            }
            //if it is -1, then it is a generic format
            var fmt_string = (prec == -1) ? "" : ("." + (prec));
            var self = this;
            return function(number) {
                var str = d3.format(fmt_string + "g")(number);
                var reg_str = str.replace(/-|\.|e/gi, "");
                if(reg_str.length < 6) {
                    return self._replace_trailing_zeros(str);
                } else {
                    //if length is more than 6, format it exponentially
                    if(fmt_string === "") {
                        //if fmt_string is "", then the number o/p can be
                        //arbitrarily large
                        var new_str = d3.format(fmt_string + "e")(number);
                        if(new_str.length >= 7) {
                            //in the case of a round off error, setting the max
                            //limit to be 6
                             new_str = d3.format(".6e")(number);
                        }
                        return self._replace_trailing_zeros(new_str);
                    } else {
                        //Format with the precision required
                        return self._replace_trailing_zeros(d3.format(fmt_string + "e")(number));
                    }
                }
            };
        },
        _linear_scale_precision: function(ticks) {
            ticks = (ticks === undefined || ticks === null) ? this.axis_scale.scale.ticks() : ticks;
            var diff = Math.abs(ticks[1] - ticks[0]);
            var max = Math.max(Math.abs(ticks[0]), Math.abs(ticks[ticks.length - 1]));

            var max_digits = this._get_digits(max);
            // number of digits in the max
            var diff_digits = this._get_digits(diff);
            // number of digits in the min

            var precision = Math.abs(max_digits - diff_digits);
            // difference in the number of digits. The number of digits we have
            // to display is the diff above + 1.
            var limit = 6;
            // limit is a choice of the max number of digits that are
            // represented
            if(max_digits >= 0 && diff_digits > 0) {
                if(max_digits <= 6) {
                // format the number as an integer
                    return 0;
                } else  {
                // precision plus 1 is returned here as they are the number of
                // digits to be displayed. Capped at 6
                    return Math.min(precision, 6) + 1;
                }
            }
            else if(diff_digits <= 0) {
                // return math.abs(diff_digits) + max_digits + 1. Capped at 6.
                return Math.min((Math.abs(diff_digits) + max_digits), 6) + 1;
            }
        },
        linear_sc_format: function(ticks) {
            return this.get_format_func(this._linear_scale_precision(ticks));
        },
        date_sc_format: function(ticks) {
            // assumes that scale is a linear date scale
            ticks = (ticks === undefined || ticks === null) ? this.axis_scale.scale.ticks() : ticks;
            // diff is the difference between ticks in milliseconds
            var diff = Math.abs(ticks[1] - ticks[0]);
            var div = 1000;

            if(Math.floor(diff / div) == 0) {
                //diff is less than a second
                return [[".%L", function(d) { return d.getMilliseconds(); }],
                [":%S", function(d) { return d.getSeconds(); }],
                ["%I:%M", function(d) { return true; }]];
            } else if (Math.floor(diff / (div *= 60)) == 0) {
                //diff is less than a minute
                 return [[":%S", function(d) { return d.getSeconds(); }],
                 ["%I:%M", function(d) { return true; }]];
            } else if (Math.floor(diff / (div *= 60)) == 0) {
                // diff is less than an hour
                return [["%I:%M", function(d) { return d.getMinutes(); }],
                ["%I %p", function(d) { return true; }]];
            } else if (Math.floor(diff / (div *= 24)) == 0) {
                //diff is less than a day
                 return [["%I %p", function(d) { return d.getHours(); }],
                 ["%b %d", function(d) { return true; }]];
            } else if (Math.floor(diff / (div *= 27)) == 0) {
                //diff is less than a month
                return [["%b %d", function(d) { return d.getDate() !== 1; }],
                        ["%b %Y", function(d) { return true; }]];
            } else if (Math.floor(diff / (div *= 12)) == 0) {
                //diff is less than a year
                return [["%b %d", function(d) { return d.getDate() !== 1; }],
                        ["%b %Y", function() { return true;}]];
            } else {
                //diff is more than a year
                return  [["%b %d", function(d) { return d.getDate() !== 1; }],
                         ["%b %Y", function() { return d.getMonth();}],
                         ["%Y", function() { return true; }]];
            }
        },
        log_sc_format: function(ticks) {
            return this.get_format_func(this._log_sc_precision(ticks));
        },
        _log_sc_precision: function(ticks) {
            ticks = (ticks === undefined || ticks === null) ? this.axis_scale.scale.ticks() : ticks;
            var ratio = Math.abs(Math.log10(ticks[1] / ticks[0]));

            if(ratio >= 0.3010) {
                //format them as they are with the max_length of 6
                return -1;
            } else {
                //return a default of 3 digits of precision
                return 3;
            }
        },
        guess_tick_format: function(ticks) {
            if(this.axis_scale.model.type == "linear") {
                return this.linear_sc_format(ticks);
            } else if (this.axis_scale.model.type == "date" ||
                       this.axis_scale.model.type == "date_color_linear") {
                return d3.time.format.multi(this.date_sc_format(ticks));
            } else if (this.axis_scale.model.type == "log") {
                return this.log_sc_format(ticks);
            }
        },
     });
    return {
        Axis: Axis,
    };
});
