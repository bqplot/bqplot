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

var d3 = require("d3");
var _ = require("underscore");
var selector = require("./Selector");
var utils = require("./utils");
var sel_utils = require("./selector_utils");

var BaseBrushSelector = {

    brush_render: function() {
        var that = this;
        var scale_creation_promise = this.create_scales();
        
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.brush = d3.svg.brush()
                .on("brushstart", _.bind(that.brush_start, that))
                .on("brush", _.bind(that.brush_move, that))
                .on("brushend", _.bind(that.brush_end, that));
            that.set_brush_scale();

            that.d3el.attr("class", "selector brushintsel");
            that.brushsel = that.d3el.call(that.brush);
            that.adjust_rectangle();
            that.color_change();
            that.create_listeners();
            // that.selected_changed();
        });
    },

    color_change: function() {
         if (this.model.get("color") !== null) {
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

    reset: function() {
        this.brush.clear();
        this._update_brush();

        this.model.set("selected", [], {js_ignore: true});
        this.update_mark_selected();
        this.touch();
    },

    reset_mark_selected: function() {
    },

    scale_changed: function() {
        this.brush.clear();
        this.create_scales();
        this.set_brush_scale();
    },

    adjust_rectangle: function() {
        if (this.model.get("orientation") == "vertical") {
            this.d3el.selectAll("rect")
                .attr("x", 0)
                .attr("width", this.width);
        } else {
            this.d3el.selectAll("rect")
                .attr("y", 0)
                .attr("height", this.height);
        }
    },

    _update_brush: function() {
        // Programmatically setting the brush does not redraw it. It is
        // being redrawn below
        this.brushsel = this.d3el.call(this.brush);
        this.d3el.call(this.brush.event);
    },

    update_mark_selected: function(extent_x, extent_y) {

        if(extent_x === undefined || extent_x.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view) {
                return mark_view.selector_changed();
            });
        } if (extent_y === undefined) {
            // 1d brush
            var orient = this.model.get("orientation");
            var x = (orient == "vertical") ? [] : extent_x,
                y = (orient == "vertical") ? extent_x : [];
        } else {
            // 2d brush
            var x = extent_x, y = extent_y;
        }
        var point_selector = function(p) {
            return sel_utils.point_in_rectangle(p, x, y);
        };
        var rect_selector = function(xy) {
            return sel_utils.rect_inter_rect(xy[0], xy[1], x, y);
        };

        _.each(this.mark_views, function(mark_view) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    },
}

var BrushSelector = selector.BaseXYSelector.extend(BaseBrushSelector).extend({

    render: function() {
        BrushSelector.__super__.render.apply(this);
        this.brush_render();
        // Put inside promise?
        // this.is_x_date = (this.x_scale.model.type === "date");
        // this.is_y_date = (this.y_scale.model.type === "date");
    },

    create_listeners: function() {
        BrushSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.color_change, this);
    },

    convert_and_save: function(extent) {
        if(extent.length === 0) {
            this.update_mark_selected([]);
            return;
        }
        var extent_x = [extent[0][0], extent[1][0]];
        var extent_y = [extent[0][1], extent[1][1]];

        var x_ordinal = (this.x_scale.model.type === "ordinal"),
            y_ordinal = (this.y_scale.model.type === "ordinal");
        var pixel_extent_x = x_ordinal ? extent_x : extent_x.map(this.x_scale.scale),
            pixel_extent_y = y_ordinal ? extent_y : extent_y.map(this.y_scale.scale);
        
        extent_x = x_ordinal ? this.x_scale.invert_range(extent_x) : extent_x;
        extent_y = y_ordinal ? this.y_scale.invert_range(extent_y) : extent_y;

        this.update_mark_selected(pixel_extent_x, pixel_extent_y);
        // TODO: The call to the function can be removed once _pack_models is
        // changed
        this.model.set("selected", [[extent_x[0], extent_y[0]],
                                    [extent_x[1], extent_y[1]]],
                       {js_ignore: true});
        this.touch();
    },

    relayout: function() {
        BrushSelector.__super__.relayout.apply(this);
        this.d3el.select(".background")
            .attr("width", this.width)
            .attr("height", this.height);

        this.set_x_range([this.x_scale]);
        this.set_y_range([this.y_scale]);
    },

    adjust_rectangle: function() {
    },

    set_brush_scale: function() {
        this.brush.y(this.y_scale.scale)
            .x(this.x_scale.scale);
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
});

var BrushIntervalSelector = selector.BaseXSelector.extend(BaseBrushSelector).extend({

    render: function() {
        BrushIntervalSelector.__super__.render.apply(this);
        this.brush_render();
    },

    create_listeners: function() {
        BrushIntervalSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.change_color, this);
    },

    convert_and_save: function(extent) {
        if(extent.length === 0) {
            this.update_mark_selected([]);
            return;
        }
        var ordinal = (this.scale.model.type === "ordinal");
        var pixel_extent = ordinal ? extent : extent.map(this.scale.scale);
        extent = ordinal ? this.scale.invert_range(extent) : extent;

        this.update_mark_selected(pixel_extent);

        this.model.set_typed_field("selected", extent, {js_ignore: true});
        this.touch();
    },

    update_scale_domain: function(ignore_gui_update) {
        // Call the base class function to update the scale.
        BrushIntervalSelector.__super__.update_scale_domain.apply(this);
        if(this.brush !== undefined && this.brush !== null) {
            this.set_brush_scale();
        }
        if(ignore_gui_update !== true) {
            this.selected_changed();
        }
    },

    set_brush_scale: function() {
        if (this.model.get("orientation") == "vertical") {
                this.brush.y(this.scale.scale);
            } else {
                this.brush.x(this.scale.scale);
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
        if(selected.length === 0) {
            this.reset();
        } else if(selected.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            var extent = [selected[0], selected[1]];
            this.brush.extent(extent);
            this._update_brush();
            var pixel_extent = extent.map(this.scale.scale).sort(
                function(a, b) { return a - b; });
            this.update_mark_selected(pixel_extent);
        }
    },

    remove: function() {
        this.brush.clear();
        BrushIntervalSelector.__super__.remove.apply(this);
    },

    relayout: function() {
        BrushIntervalSelector.__super__.relayout.apply(this);

        this.adjust_rectangle();
        this.d3el.select(".background")
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

var MultiSelector = selector.BaseXSelector.extend(BaseBrushSelector).extend({

    render: function() {
        MultiSelector.__super__.render.apply(this);

        var that = this;
        this.names = this.model.get("names");
        this.curr_index = 0;

        var scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.d3el.attr("class", "multiselector");
            that.create_brush();
            that.selecting_brush = false;
            that.create_listeners();
        });
    },

    create_listeners: function() {
        MultiSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:names", this.labels_change, this);
        this.listenTo(this.model, "change:color", this.color_change, this);
    },

    labels_change: function(model, value) {
        var prev_names = model.previous("names");
        this.names = value;

        var data = _.range(this.curr_index + 1);
        var that = this;
        var selected = utils.deepCopy(this.model.get("selected"));
        //TODO: Use do diff?
        data.forEach(function(elem) {
            var label = that.get_label(elem);
            var prev_label = that.get_label(elem, prev_names);
            if(prev_label !== label) {
                that.d3el.select(".brush_text_" + elem).text(label);
                selected[label] = selected[prev_label];
                delete selected[prev_label];
            }
        });
        this.model.set("_selected", selected);
        this.touch();
    },

    create_brush: function(event) {
        // Function to add new brushes.
        var that = this;
        var index = this.curr_index;

        var brush = d3.svg.brush()
          .on("brushstart", function() { that.brush_start(); })
          .on("brush", function() { that.brush_move(index, this); })
          .on("brushend", function() { that.brush_end(index, this); });

        var new_brush_g = this.d3el.append("g")
          .attr("class", "selector brushintsel active");

        new_brush_g.append("text")
          .text(this.get_label(this.curr_index))
          .attr("class", "brush_text_" + this.curr_index)
          .style("text-anchor", "middle")
          .style("stroke", "yellow")
          .style("font-size", "16px")
          .style("display", "none");

        if (this.model.get("orientation") == "vertical") {
            brush.y(this.scale.scale);
            new_brush_g.select("text").attr("x", 30);
        } else {
            brush.x(this.scale.scale);
            new_brush_g.select("text").attr("y", 30);
        }
        new_brush_g.call(brush);

        this.color_change();
        this.adjust_rectangle();

        var old_handler = new_brush_g.on("mousedown.brush");
        new_brush_g.on("mousedown.brush", function() {
            add_remove_classes(that.d3el.selectAll(".selector"), ["inactive"], ["visible"]);
            add_remove_classes(d3.select(this), ["active"], ["inactive"]);
            old_handler.call(this);
            // Replacement for "Accel" modifier.
            d3.select(this).on("mousedown.brush", function() {
                var accelKey = d3.event.ctrlKey || d3.event.metaKey;
                if(d3.event.shiftKey && accelKey && d3.event.altKey) {
                    that.reset();
                } else if(accelKey) {
                    add_remove_classes(d3.select(this), ["inactive"], ["active"]);
                    that.create_brush(d3.event);
                } else if(d3.event.shiftKey && that.selecting_brush === false) {
                    add_remove_classes(that.d3el.selectAll(".selector"), ["visible"], ["active", "inactive"]);
                    that.selecting_brush = true;
                } else {
                    add_remove_classes(that.d3el.selectAll(".selector"), ["inactive"], ["visible"]);
                    add_remove_classes(d3.select(this), ["active"], ["inactive"]);
                    old_handler.call(this);
                    that.selecting_brush = false;
                }
            });
        });
        this.curr_index = this.curr_index + 1;
        /* if(this.curr_index > 1) {
            // Have to create a duplicate event and re dispatch it for the
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

    brush_start: function() {
        this.model.set("brushing", true);
        this.touch();
    },

    brush_move: function(item, brush_g) {
        var brush = d3.event.target;
        var extent = brush.empty() ? this.scale.scale.domain() : brush.extent();
        var hide_names = !(this.model.get("show_names"));
        d3.select(brush_g).select("text")
          .style("display", ((brush.empty() || hide_names) ? "none" : "inline"));
        this.set_text_location(brush_g, extent);
        this.convert_and_save(extent, item);
    },

    set_text_location: function(brush_g, extent) {
        var mid = (extent[0] + extent[1]) / 2;
        if(this.scale.model.type === "date") {
            mid = new Date((extent[0].getTime() + extent[1].getTime()) / 2);
        }
        var orient = (this.model.get("orientation") == "vertical") ? "y" : "x";
        d3.select(brush_g).select("text")
          .attr(orient, this.scale.scale(mid));
    },

    brush_end: function (item, brush_g) {
        var brush = d3.event.target;
        var extent = brush.empty() ?
            this.scale.scale.domain() : brush.extent();
        this.model.set("brushing", false);
        this.convert_and_save(extent, item);
    },

    reset: function() {
        this.d3el.selectAll(".selector")
          .remove();
        this.model.set("_selected", {});
        this.curr_index = 0;
        this.touch();
        this.create_brush();
    },

    convert_and_save: function(extent, item) {
        var that = this;
        var selected = utils.deepCopy(this.model.get("_selected"));
        selected[this.get_label(item)] = extent;
        var pixel_extent = extent.map(this.scale.scale);
        this.update_mark_selected(pixel_extent);
        this.model.set("_selected", selected);
        this.touch();
    },

    scale_changed: function() {
        this.d3el.selectAll(".selector")
          .remove();
        this.curr_index = 0;
        this.create_scale();
        this.create_brush();
    },

    color_change: function() {
        if (this.model.get("color") !== null) {
            this.d3el.selectAll(".selector")
              .style("fill", this.model.get("color"));
        }
    },

    relayout: function() {
        MultiSelector.__super__.relayout.apply(this);

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
    },

    remove: function() {
        this.model.off("change:names", null, this);
        MultiSelector.__super__.remove.apply(this);
    }
});


module.exports = {
    BrushSelector: BrushSelector,
    BrushIntervalSelector: BrushIntervalSelector,
    MultiSelector: MultiSelector
};
