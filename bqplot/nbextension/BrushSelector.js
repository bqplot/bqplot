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

define(["./d3", "./Selector", "./utils"], function(d3, BaseSelectors, utils) {
    "use strict";

    var BrushSelector = BaseSelectors.BaseXYSelector.extend({
        render : function() {
            BrushSelector.__super__.render.apply(this);
            var self = this;
            var scale_creation_promise = this.create_scales();
            //TODO: For all selectors, the brush background etc can be created
            //without waiting for the promise. But the issue is with resizing
            //and how they should resize when the parent is resized. So as a
            //defensive move, I am creating them inside the promise. Should be
            //moved outside the promise.
            Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
                self.brush = d3.svg.brush()
                    .x(self.x_scale.scale)
                    .y(self.y_scale.scale)
                    .on("brushstart", _.bind(self.brush_start, self))
                    .on("brush", _.bind(self.brush_move, self))
                    .on("brushend", _.bind(self.brush_end, self));

                self.is_x_date = (self.x_scale.model.type === "date");
                self.is_y_date = (self.y_scale.model.type === "date");

                self.brushsel = self.el.attr("class", "selector brushintsel")
                    .call(self.brush);

                if (self.model.get("color") != null) {
                    self.brushsel.style("fill", self.model.get("color"));
                }
                self.create_listeners();
            });
        },
        create_listeners: function() {
            BrushSelector.__super__.create_listeners.apply(this);
            this.listenTo(this.model, "change:color", this.color_change, this);
        },
        color_change: function() {
             if (this.model.get("color") != null) {
                this.brushsel.style("fill", this.model.get("color"));
            }
        },
        brush_start: function () {
            this.model.set("brushing", true);
            this.touch();
        },
        brush_move: function () {
            var extent = this.brush.empty() ? [] : this.brush.extent();
            this.convert_and_save(extent);
        },
        brush_end: function () {
            var extent = this.brush.empty() ? [] : this.brush.extent();
            this.model.set("brushing", false);
            this.convert_and_save(extent);
        },
        convert_and_save: function(extent) {
            if(extent.length === 0) {
                this.model.set("selected", [], {js_ignore: true});
                _.each(this.mark_views, function(mark_view) {
                    mark_view.invert_2d_range([]);
                });
                this.touch();
                return;
            }
            var extent_x = [extent[0][0], extent[1][0]];
            var extent_y = [extent[0][1], extent[1][1]];

            if(this.x_scale.model.type == "ordinal") {
                extent_x = this.x_scale.invert_range(extent_x);
            }
            if(this.y_scale.model.type == "ordinal") {
                extent_y = this.y_scale.invert_range(extent_y);
            }

            var self = this;
            _.each(this.mark_views, function(mark_view) {
                mark_view.invert_2d_range(self.x_scale.scale(extent_x[0]),
                                          self.x_scale.scale(extent_x[1]),
                                          self.y_scale.scale(extent_y[0]),
                                          self.y_scale.scale(extent_y[1]));
            });
            // TODO: The call to the function can be removed once _pack_models is
            // changed
            this.model.set("selected", this.get_typed_selected([[extent_x[0],
                                                                 extent_y[0]],
                                                                [extent_x[1],
                                                                 extent_y[1]]]),
                            {js_ignore: true});
            this.touch();
        },
        get_typed_selected: function(extent) {
            if(this.is_x_date) {
                extent[0][0] = this.x_scale.model.convert_to_json(extent[0][0]);
                extent[1][0] = this.x_scale.model.convert_to_json(extent[1][0]);
            }
            if(this.is_y_date) {
                extent[0][1] = this.y_scale.model.convert_to_json(extent[0][1]);
                extent[1][1] = this.y_scale.model.convert_to_json(extent[1][1]);
            }
            return extent;
        },
        scale_changed: function() {
            this.brush.clear();
            this.create_scales();
        },
        remove: function() {
            BrushSelector.__super__.remove.apply(this);
        },
        relayout: function() {
            BrushSelector.__super__.relayout.apply(this);
            this.el.select(".background")
                .attr("width", this.width)
                .attr("height", this.height);

            this.set_x_range([this.x_scale]);
            this.set_y_range([this.y_scale]);
        },
        reset: function() {
            this.brush.clear();
            this._update_brush();

            this.model.set("selected", [], {js_ignore: true});
            _.each(this.mark_views, function(mark_view) {
                mark_view.invert_2d_range([]);
            });
            this.touch();
        },
        update_xscale_domain: function() {
            // Call the base class function to update the scale.
            BrushSelector.__super__.update_xscale_domain.apply(this);
            if(this.brush !== undefined && this.brush !== null) {
                this.brush.x(this.x_scale.scale);
            }
            // TODO:If there is a selection, update the visual element.

        },
         update_yscale_domain: function() {
            // Call the base class function to update the scale.
            BrushSelector.__super__.update_yscale_domain.apply(this);
            if(this.brush !== undefined && this.brush !== null) {
                this.brush.y(this.y_scale.scale);
            }
        },
        _update_brush: function() {
            //programmatically setting the brush does not redraw it. It is
            //being redrawn below
            this.brushsel = this.el.call(this.brush);
            this.el.call(this.brush.event);
        },
    });

    var BrushIntervalSelector = BaseSelectors.BaseXSelector.extend({
        render : function() {
            BrushIntervalSelector.__super__.render.apply(this);
            var self = this;
            var scale_creation_promise = this.create_scales();
            Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
                self.brush = d3.svg.brush()
                    .x(self.scale.scale)
                    .on("brushstart", _.bind(self.brush_start, self))
                    .on("brush", _.bind(self.brush_move, self))
                    .on("brushend", _.bind(self.brush_end, self));

                self.el.attr("class", "selector brushintsel");

                self.brushsel = self.el.call(self.brush)
                    .selectAll("rect")
                    .attr("y", 0)
                    .attr("height", self.height);

                if(self.model.get("color")!=null) {
                    self.brushsel.style("fill", self.model.get("color"));
                }

                self.create_listeners();
                self.selected_changed();
            });
        },
        create_listeners: function() {
            BrushSelector.__super__.create_listeners.apply(this);
            this.listenTo(this.model, "change:color", this.change_color, this);
        },
        change_color: function() {
            if (this.model.get("color") != null) {
                this.brushsel.style("fill", this.model.get("color"));
            }
        },
        brush_start: function () {
            this.model.set("brushing", true);
            this.touch();
        },
        brush_move: function () {
            var extent = this.brush.empty() ? [] : this.brush.extent();
            this.convert_and_save(extent);
        },
        brush_end: function () {
            var extent = this.brush.empty() ? [] : this.brush.extent();
            this.model.set("brushing", false);
            this.convert_and_save(extent);
        },
        convert_and_save: function(extent) {
            var self = this;
            if(extent.length === 0) {
                _.each(this.mark_views, function(mark_view) {
                    return mark_view.invert_range(extent);
                });
            } else {
                if(this.scale.model.type === "ordinal") {
                    _.each(this.mark_views, function(mark_view) {
                        mark_view.invert_range(extent[0], extent[1]);
                    });
                } else {
                    _.each(this.mark_views, function(mark_view) {
                        mark_view.invert_range(self.scale.scale(extent[0]),
                                            self.scale.scale(extent[1]));
                    });
                }
            }

            if(this.scale.model.type == "ordinal") {
                extent = this.scale.invert_range(extent);
            }
            this.model.set_typed_field("selected", extent, {js_ignore: true});
            this.touch();
        },
        scale_changed: function() {
            this.brush.clear();
            this.create_scale();
            this.brush.x(this.scale.scale);
        },
        reset: function() {
            this.brush.clear();
            this._update_brush();

            this.model.set_typed_field("selected", [], {js_ignore : true});
            _.each(this.mark_views, function(mark_view) {
                mark_view.invert_range([]);
            });
            this.touch();
        },
        update_scale_domain: function(ignore_gui_update) {
            // Call the base class function to update the scale.
            BrushIntervalSelector.__super__.update_scale_domain.apply(this);
            if(this.brush !== undefined && this.brush !== null) {
                this.brush.x(this.scale.scale);
            }
            if(ignore_gui_update !== true) {
                this.selected_changed();
            }
        },
        selected_changed: function(model, value, options) {
            if(options && options.js_ignore) {
                //this change was most probably triggered from the js side and
                //should be ignored.
                return;
            }
            //reposition the interval selector and set the selected attribute.
            var selected = this.model.get_typed_field("selected");
            if(selected.length == 0) {
                this.reset();
            } else if (selected.length != 2) {
                // invalid value for selected. Ignoring the value
                return;
            } else {
                var self = this;
                selected = selected.sort(function(a, b) { return a - b; });

                this.brush.extent([selected[0], selected[1]]);
                this._update_brush();

                _.each(this.mark_views, function(mark_view) {
                    mark_view.invert_range(self.scale.scale(selected[0]),
                                           self.scale.scale(selected[1]));
                }, this);
            }
        },
        _update_brush: function() {
            //programmatically setting the brush does not redraw it. It is
            //being redrawn below
            this.brushsel = this.el.call(this.brush);
            this.el.call(this.brush.event);
        },
        remove: function() {
            this.brush.clear();
            BrushIntervalSelector.__super__.remove.apply(this);
        },
        relayout: function() {
            BrushIntervalSelector.__super__.relayout.apply(this);
            this.el.selectAll("rect")
                .attr("y", 0)
                .attr("height", this.height);

            this.el.select(".background")
                .attr("width", this.width)
                .attr("height", this.height);

            this.set_range([this.scale]);
        },
    });

    var add_remove_classes = function(selection, add_classes, remove_classes) {
        //adds the classes present in add_classes and removes the classes in
        //the list remove_classes
        //selection attribute should be a d3-selection
        if(remove_classes) {
            remove_classes.forEach(function(r_class) {
                selection.classed(r_class, false);
            });
        }
        if(add_classes) {
            add_classes.forEach(function(a_class) {
                selection.classed(a_class, true);
            });
        }
    };

    var MultiSelector = BaseSelectors.BaseXSelector.extend({
        render : function() {
            MultiSelector.__super__.render.apply(this);

            var self = this;
            this.names = this.model.get("names");
            this.curr_index = 0;

            var name = (this.names.length > this.curr_index) ?
                this.names[this.curr_index] : this.curr_index;

            var scale_creation_promise = this.create_scales();
            Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
                var brush = d3.svg.brush()
                    .x(self.scale.scale)
                    .on("brushstart", function() { self.brush_start(name, self); })
                    .on("brush", function() { self.brush_move(name, self); })
                    .on("brushend", function() { self.brush_end(name, self); });

                // attribute to see if the scale is a date scale
                self.is_date = (self.scale.model.type === "date");

                self.el.attr("class", "multiselector");

                self.create_brush();
                self.model.on("change:names", self.labels_change, self);
                self.selecting_brush = false;
                self.create_listeners();
            });
        },
        labels_change: function(model, value) {
            var prev_names = model.previous("names");
            this.names = value;

            var data = _.range(this.curr_index + 1);
            var self = this;
            var selected = utils.deepCopy(this.model.get("selected"));
            //TODO: Use do diff?
            data.forEach(function(elem) {
                var label = self.get_label(elem);
                var prev_label = self.get_label(elem, prev_names);
                if(prev_label !== label) {
                    self.el.select(".brush_text_" + elem).text(label);
                    selected[label] = selected[prev_label];
                    delete selected[prev_label];
                }
            });
            this.model.set("_selected", selected);
            this.touch();
        },
        create_brush: function(event) {
            // Function to add new brushes.
            var self = this;
            var name = (this.names.length > this.curr_index) ?
                this.names[this.curr_index] : this.curr_index;
            var index = this.curr_index;
            var brush = d3.svg.brush()
                .x(this.scale.scale)
                .on("brushstart", function() { self.brush_start(); })
                .on("brush", function() { self.brush_move(index, this); })
                .on("brushend", function() { self.brush_end(index, this); });

            var new_brush_g = this.el.append("g")
                .attr("class", "selector brushintsel active");

            self.new_brushsel = new_brush_g.call(brush)
                .selectAll("rect")
                .attr("y", 0)
                .attr("height", this.height);

            if(self.model.get("color")!=null) {
                self.new_brushsel.style("fill", self.model.get("color"));
            }

            new_brush_g.append("text")
                .attr("y", 30)
                .text(this.get_label(this.curr_index))
                .attr("class", "brush_text_" + this.curr_index)
                .style("text-anchor", "middle")
                .style("stroke", "yellow")
                .style("font-size", "16px")
                .style("display", "none");

            var old_handler = new_brush_g.on("mousedown.brush");
            new_brush_g.on("mousedown.brush", function() {
                add_remove_classes(self.el.selectAll(".selector"), ["inactive"], ["visible"]);
                add_remove_classes(d3.select(this), ["active"], ["inactive"]);

                old_handler.call(this);
                d3.select(this).on("mousedown.brush", function() {
                    if(d3.event.shiftKey && d3.event.ctrlKey && d3.event.altKey) {
                        self.reset();
                    } else if(d3.event.ctrlKey) {
                        add_remove_classes(d3.select(this), ["inactive"], ["active"]);
                        self.create_brush(d3.event);
                    } else if(d3.event.shiftKey && self.selecting_brush === false) {
                        add_remove_classes(self.el.selectAll(".selector"), ["visible"], ["active", "inactive"]);
                        self.selecting_brush = true;
                    } else {
                        add_remove_classes(self.el.selectAll(".selector"), ["inactive"], ["visible"]);
                        add_remove_classes(d3.select(this), ["active"], ["inactive"]);
                        old_handler.call(this);
                        self.selecting_brush = false;
                    }
                });
            });
            this.curr_index = this.curr_index + 1;
            /* if(this.curr_index > 1) {
                // Have to create a dupicate event and re dispatch it for the
                // event to get triggered on the new brush.
                // if curr_index === 1, then it is the first brush being
                // created. So no duplicate event needs to dispatched.
                var duplicate_event = new event.constructor(event.type, event);
                new_brush_g.node().dispatchEvent(duplicate_event);
            } */
        },
        get_label: function(index, arr) {
            //arr is optional. If you do not pass anything, this.names is
            //considered arr.
            if(arr === undefined || arr === null) {
                arr = this.names;
            }
            return (arr.length > index) ? arr[index] : index;
        },
        brush_start: function () {
            this.model.set("brushing", true);
            this.touch();
        },
        brush_move: function (item, brush_g) {
            var brush = d3.event.target;
            var extent = brush.empty() ? this.scale.scale.domain() : brush.extent();
            var hide_names = !(this.model.get("show_names"));
            d3.select(brush_g).select("text")
                .attr("x", this.get_text_location(extent))
                .style("display", ((brush.empty() || hide_names) ? "none" : "inline"));
            this.convert_and_save(extent, item);
        },
        get_text_location: function(extent) {
            var mid = (extent[0] + extent[1]) / 2;
            if(this.scale.model.type === "date") {
                mid = new Date((extent[0].getTime() + extent[1].getTime()) / 2);
            }
            return this.scale.scale(mid);
        },
        brush_end: function (item, brush_g) {
            var brush = d3.event.target;
            var self = this;
            var extent = brush.empty() ?
                this.scale.scale.domain() : brush.extent();
            this.model.set("brushing", false);
            this.convert_and_save(extent, item);
        },
        reset: function() {
            this.el.selectAll(".selector")
                .remove();
            this.model.set("_selected", {});
            this.curr_index = 0;
            this.touch();
            this.create_brush();
        },
        convert_and_save: function(extent, item) {
            var selected = utils.deepCopy(this.model.get("_selected"));
            var self = this;
            _.each(this.mark_views, function(mark_view) {
                mark_view.invert_range(self.scale.scale(extent[0]),
                                       self.scale.scale(extent[1]));
            });
            // TODO: remove the ternary operator once _pack_models is changed
            selected[this.get_label(item)] = extent.map(function(elem) {
                return (self.is_date) ?
                    self.scale.model.convert_to_json(elem) : elem;
            });
            this.model.set("_selected", selected);
            this.touch();
        },
        scale_changed: function() {
            this.el.selectAll(".selector")
                .remove();
            this.curr_index = 0;
            this.create_scale();
            this.create_brush();
        },
        relayout: function() {
            MultiSelector.__super__.relayout.apply(this);
            this.el.selectAll(".brushintsel")
                .selectAll("rect")
                .attr("y", 0)
                .attr("height", this.height);

            this.el.select(".background")
                .attr("width", this.width)
                .attr("height", this.height);

            this.set_range([this.scale]);
        },
        remove: function() {
            this.model.off("change:names", null, this);
            MultiSelector.__super__.remove.apply(this);
        },
    });

    return {
        BrushSelector: BrushSelector,
        BrushIntervalSelector: BrushIntervalSelector,
        MultiSelector: MultiSelector,
    };
});

