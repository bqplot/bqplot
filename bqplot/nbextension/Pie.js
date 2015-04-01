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

define(["./d3", "./Mark", "./utils"], function(d3, MarkViewModule, utils) {
    "use strict";

    var Pie = MarkViewModule.Mark.extend({
        render: function() {
            var base_creation_promise = Pie.__super__.render.apply(this);
            this.selected_indices = this.model.get("selected");
            this.selected_style = this.model.get("selected_style");
            this.unselected_style = this.model.get("unselected_style");

            var self = this;
            this.el.append("g")
              .attr("class", "pielayout");
            this.after_displayed(function() {
                this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
                this.create_tooltip();
            });

            return base_creation_promise.then(function() {
                self.event_listeners = {};
                self.process_interactions();
                self.create_listeners();
                self.compute_view_padding();
                self.draw();
            }, null);
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            // If no scale for "x" or "y" is specified, figure scales are used.
            var x_scale = this.scales["x"] ? this.scales["x"] : this.parent.scale_x;
            var y_scale = this.scales["y"] ? this.scales["y"] : this.parent.scale_y;

            var that = this;
            this.listenTo(x_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
            this.listenTo(y_scale, "domain_changed", function() {
                if (!that.model.dirty) { that.draw(); }
            });
        },
        create_listeners: function() {
            Pie.__super__.create_listeners.apply(this);
            this.el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
                .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move");}, this))
                .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out");}, this));

            this.model.on("data_updated", this.draw, this);
            this.model.on("change:colors", this.update_colors, this);
            this.model.on("colors_updated", this.update_colors, this);
            this.model.on_some_change(["inner_radius", "radius"], function() {
                this.compute_view_padding();
                this.update_radii();
            }, this);
            this.model.on_some_change(["stroke", "opacity"], this.update_stroke_and_opacity, this);
            this.model.on_some_change(["x", "y"], this.position_center, this);
            this.model.on_some_change(["start_angle", "end_angle", "sort"], this.draw, this);
            this.model.on("labels_updated", this.update_labels, this);
            this.model.on("change:selected", function() {
                this.selected_indices = this.model.get("selected");
                this.apply_styles();
            }, this);
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.parent, "bg_clicked", function() { this.event_dispatcher("parent_clicked")});
        },
        process_interactions: function() {
            var interactions = this.model.get("interactions");
            if(_.isEmpty(interactions)) {
                //set all the event listeners to blank functions
                this.reset_interactions();
            }
            else {
                if(interactions["click"] !== undefined &&
                  interactions["click"] !== null) {
                    if(interactions["click"] === "tooltip") {
                        this.event_listeners["element_clicked"] = function() { return this.refresh_tooltip(true); };
                        this.event_listeners["parent_clicked"] = this.hide_tooltip;
                    } else if (interactions["click"] === "select") {
                        this.event_listeners["parent_clicked"] = this.reset_selection;
                        this.event_listeners["element_clicked"] = this.click_handler;
                    }
                } else {
                    this.reset_click();
                }
                if(interactions["hover"] !== undefined &&
                  interactions["hover"] !== null) {
                    if(interactions["hover"] === "tooltip") {
                        this.event_listeners["mouse_over"] = this.refresh_tooltip;
                        this.event_listeners["mouse_move"] = this.show_tooltip;
                        this.event_listeners["mouse_out"] = function() {
                            this.send({event: "mouse_out"});
                            return this.hide_tooltip();
                        }
                    }
                } else {
                    this.reset_hover();
                }
                if(interactions["legend_click"] !== undefined &&
                  interactions["legend_click"] !== null) {
                    if(interactions["legend_click"] === "tooltip") {
                        this.event_listeners["legend_clicked"] = function() { return this.refresh_tooltip(true); };
                        this.event_listeners["parent_clicked"] = this.hide_tooltip;
                    }
                } else {
                    this.event_listeners["legend_clicked"] = function() {};
                }
            }
        },
        relayout: function() {
            this.set_ranges();
            this.position_center();
            this.update_radii();
        },
        position_center: function() {
            var x_scale = this.scales["x"] ? this.scales["x"] : this.parent.scale_x;
            var y_scale = this.scales["y"] ? this.scales["y"] : this.parent.scale_y;
            var x = (x_scale.model.type === "date") ?
                this.model.get_date_elem("x") : this.model.get("x");
            var y = (y_scale.model.type === "date") ?
                this.model.get_date_elem("y") : this.model.get("y");
            var transform = "translate(" + (x_scale.scale(x) + x_scale.offset) +
                                    ", " + (y_scale.scale(y) + y_scale.offset) + ")";
            this.el.select(".pielayout").transition()
              .duration(this.model.get("animate_dur"))
              .attr("transform", transform);
        },
        update_radii: function() {

            var arc = d3.svg.arc()
              .outerRadius(this.model.get("radius"))
              .innerRadius(this.model.get("inner_radius"));

            var elements = this.el.select(".pielayout").selectAll(".slice");
            var animate_dur = this.model.get("animate_dur")

            elements.select("path")
              .transition().duration(animate_dur)
              .attr("d", arc);

            elements.select("text")
              .transition().duration(animate_dur)
              .attr("transform", function(d) {
                        return "translate(" + arc.centroid(d) + ")"; });
        },
        draw: function() {
            this.set_ranges();
            this.position_center();

            var pie = d3.layout.pie()
              .startAngle(this.model.get("start_angle")*2*Math.PI/360)
              .endAngle(this.model.get("end_angle")*2*Math.PI/360)
                .value(function(d) { return d.size; });
            if (!this.model.get("sort")) { pie.sort(null); }

            var that = this;
            var elements = this.el.select(".pielayout").selectAll(".slice")
              .data(pie(this.model.mark_data));

            var elements_added = elements.enter().append("g")
              .attr("class", "slice")
              .on("click", function(d, i) {
                  return that.event_dispatcher("element_clicked", {"data": d, "index": i});
              });

            elements.append("path")
              .attr("class", "pie_slice");
            elements.append("text")
              .attr("class", "pie_text")
              .attr("dy", ".35em")
              .attr("pointer-events", "none")
              .style("text-anchor", "middle");

            elements.exit().remove();

            this.update_radii();
            this.update_labels();
            this.apply_styles();
        },
        update_stroke_and_opacity: function() {
            var stroke = this.model.get("stroke");
            var opacity = this.model.get("opacity");
            this.el.select(".pielayout").selectAll(".slice")
              .style("stroke", (stroke === undefined || stroke === null) ? "none" : stroke)
              .style("opacity", opacity);
        },
        update_colors: function() {
            var that = this;
            var color_scale = this.scales["color"];
            this.el.select(".pielayout").selectAll(".slice")
              .style("fill", function(d, i) {
                  return (d.data.color !== undefined && color_scale !== undefined) ?
                      color_scale.scale(d.data.color) : that.get_colors(i);
              });
        },
        update_labels: function() {
            this.el.select(".pielayout").selectAll(".slice").select("text")
              .text(function(d) { return d.data.label; });
        },
        clear_style: function(style_dict, indices) {
            // Function to clear the style of a dict on some or all the elements of the
            // chart. If indices is null, clears the style on all elements. If
            // not, clears on only the elements whose indices are matching.
            var elements = this.el.select(".pielayout").selectAll(".slice");
            if(indices) {
                elements = elements.filter(function(d, index) {
                    return indices.indexOf(index) !== -1;
                });
            }
            var clearing_style = {};
            for(var key in style_dict) {
                clearing_style[key] = null;
            }
            elements.style(clearing_style);
        },
        set_style_on_elements: function(style, indices) {
            // If the index array is undefined or of length=0, exit the
            // function without doing anything
            if(indices === undefined || indices === null || indices.length === 0) {
                return;
            }
            var elements = this.el.select(".pielayout").selectAll(".slice");
            elements = elements.filter(function(data, index) {
                return indices.indexOf(index) !== -1;
            });
            elements.style(style);
        },
        set_default_style: function(indices) {
            // For all the elements with index in the list indices, the default
            // style is applied.
            this.update_colors();
            this.update_stroke_and_opacity();
        },
        click_handler: function (args) {
            var data = args["data"];
            var index = args["index"];
            var that = this;
            // if(this.model.get("select_slices")) {
                var idx = this.model.get("selected");
                var selected = idx ? utils.deepCopy(idx) : [];
                var elem_index = selected.indexOf(index);
                // index of slice i. Checking if it is already present in the
                // list
                if(elem_index > -1 && d3.event.ctrlKey) {
                    // if the index is already selected and if ctrl key is
                    // pressed, remove the element from the list
                    selected.splice(elem_index, 1);
                } else {
                    if(d3.event.shiftKey) {
                        //If shift is pressed and the element is already
                        //selected, do not do anything
                        if(elem_index > -1) {
                            return;
                        }
                        //Add elements before or after the index of the current
                        //slice which has been clicked
                        var min_index = (selected.length !== 0) ?
                            d3.min(selected) : -1;
                        var max_index = (selected.length !== 0) ?
                            d3.max(selected) : that.model.mark_data.length;
                        if(index > max_index){
                            _.range(max_index+1, index).forEach(function(i) {
                                selected.push(i);
                            });
                        } else if(index < min_index){
                            _.range(index+1, min_index).forEach(function(i) {
                                selected.push(i);
                            });
                        }
                    } else if(!(d3.event.ctrlKey)) {
                        selected = [];
                    }
                    // updating the array containing the slice indexes selected
                    // and updating the style
                    selected.push(index);
                }
                this.model.set("selected",
                               ((selected.length === 0) ? null : selected),
                               {updated_view: this});
                this.touch();
                if(!d3.event) {
                    d3.event = window.event;
                }
                var e = d3.event;
                if(e.cancelBubble !== undefined) { // IE
                    e.cancelBubble = true;
                }
                if(e.stopPropagation) {
                    e.stopPropagation();
                }
                e.preventDefault();
                this.selected_indices = selected;
                this.apply_styles();
            // }
        },
        reset_selection: function() {
            this.model.set("selected", null);
            this.touch();
            this.selected_indices = null;
            this.clear_style(this.selected_style);
            this.clear_style(this.unselected_style);
            this.set_default_style();
        },
        compute_view_padding: function() {
            var scales = this.model.get("scales");
            var r = d3.max([this.model.get("radius"), this.model.get("inner_radius")]);

            var x_padding = (scales["x"]) ? (r+1) : 0;
            var y_padding = (scales["y"]) ? (r+1) : 0;
            if(x_padding !== this.x_padding || y_padding !== this.y_padding) {
                this.x_padding = x_padding;
                this.y_padding = y_padding;
                this.trigger("mark_padding_updated");
            }
        },
    });

    return {
        Pie: Pie,
    };
});


