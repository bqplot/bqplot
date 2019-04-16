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

import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-brush"), require("d3-selection"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import * as selector from './Selector';
import * as utils from './utils';
import * as sel_utils from './selector_utils';

export const BaseBrushSelector = {

    brush_render: function() {
        this.brushing = false;
    },

    color_change: function() {
        if (this.model.get("color") !== null) {
            this.brushsel.select(".selection").style("fill", this.model.get("color"));
        }
    },

    brush_start: function () {
        this.model.set("brushing", true);
        this.touch();
        this.brushing = true;
    },

    brush_move: function () {
        this.convert_and_save();
    },

    brush_end: function () {
        this.model.set("brushing", false);
        this.convert_and_save();
        this.brushing = false;
    },

    scale_changed: function() {
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

    update_mark_selected: function(extent_x, extent_y) {

        if(extent_x === undefined || extent_x.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view: any) {
                return mark_view.selector_changed();
            });
            return;
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

        _.each(this.mark_views, function(mark_view: any) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    },
}

export const BrushSelector = selector.BaseXYSelector.extend(BaseBrushSelector).extend({

    render: function() {
        BrushSelector.__super__.render.apply(this);
        this.brush_render();

        var that = this;
        var scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.brush = d3.brush()
              .on("start", _.bind(that.brush_start, that))
              .on("brush", _.bind(that.brush_move, that))
              .on("end", _.bind(that.brush_end, that));
            that.brush.extent([[0, 0], [that.width, that.height]]);

            that.d3el.attr("class", "selector brushintsel");
            that.brushsel = that.d3el.call(that.brush);
            that.adjust_rectangle();
            that.color_change();
            that.create_listeners();
            that.selected_changed();
        });
    },

    create_listeners: function() {
        BrushSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.color_change, this);
        // Move these to BaseXYSelector
        this.listenTo(this.model, "change:selected_x", this.selected_changed);
        this.listenTo(this.model, "change:selected_y", this.selected_changed);
    },

    empty_selection: function() {
        this.update_mark_selected();
        this.model.set("selected_x", null);
        this.model.set("selected_y", null);
        this.touch();
    },

    convert_and_save: function() {
        var e = d3GetEvent();
        if(!e.sourceEvent) return;
        if(!e.selection) {
            this.empty_selection();
        } else {
            var d0 = e.selection;
            var pixel_extent_x = [d0[0][0], d0[1][0]];
            var pixel_extent_y = [d0[1][1], d0[0][1]];

            var extent_x = pixel_extent_x.map(this.x_scale.scale.invert).sort(
                (a: number, b: number) => a - b);
            var extent_y = pixel_extent_y.map(this.y_scale.scale.invert).sort(
                (a: number, b: number) => a - b);

            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
            this.set_selected("selected_x", extent_x);
            this.set_selected("selected_y", extent_y);
            this.touch();
        }
    },

    selected_changed: function(model, value) {
        if(this.brushing) {
            return;
        }
        //reposition the interval selector and set the selected attribute.
        var selected_x = this.model.get("selected_x") || [],
            selected_y = this.model.get("selected_y") || [];
        if(selected_x.length === 0 || selected_y.length === 0) {
            this.update_mark_selected();
        } else if(selected_x.length != 2 || selected_y.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            var extent = [[selected_x[0], selected_y[0]],
                          [selected_x[1], selected_y[1]]];
            this.brush.extent(extent);
            var pixel_extent_x = selected_x.map(this.x_scale.scale).sort(
                function(a, b) { return a - b; });
            var pixel_extent_y = selected_y.map(this.y_scale.scale).sort(
                function(a, b) { return a - b; });
            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
        }
    },

    relayout: function() {
        BrushSelector.__super__.relayout.apply(this);
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_x_range([this.x_scale]);
        this.set_y_range([this.y_scale]);

        this.brush.extent([[0, 0], [this.width, this.height]]);
        var range_x = this.model.get("selected_x").map(this.x_scale.scale).sort(
            function(a, b) { return a - b; });
        var range_y = this.model.get("selected_y").map(this.y_scale.scale).sort(
            function(a, b) { return a - b; });
        this.brush.move(this.d3el, [[range_x[0], range_y[0]], [range_x[1], range_y[1]]]);
        this.brushsel = this.d3el.call(this.brush);
    },

    adjust_rectangle: function() {
    },
});

export const BrushIntervalSelector = selector.BaseXSelector.extend(BaseBrushSelector).extend({

    render: function() {
        BrushIntervalSelector.__super__.render.apply(this);
        this.brush_render();

        var that = this;
        var scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.brush = (that.model.get("orientation") == "vertical" ? d3.brushY() : d3.brushX())
              .on("start", _.bind(that.brush_start, that))
              .on("brush", _.bind(that.brush_move, that))
              .on("end", _.bind(that.brush_end, that));
            that.brush.extent([[0, 0], [that.width, that.height]]);

            that.d3el.attr("class", "selector brushintsel");
            that.brushsel = that.d3el.call(that.brush);
            that.adjust_rectangle();
            that.color_change();
            that.create_listeners();
            that.selected_changed();
        });

    },

    create_listeners: function() {
        BrushIntervalSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.change_color, this);
    },

    empty_selection: function() {
        this.update_mark_selected();
        this.model.set("selected", []);
        this.touch();
    },

    convert_and_save: function() {
        var e = d3GetEvent();
        if(!e.sourceEvent) return;
        if(!e.selection) {
            this.empty_selection();
        } else {
            var pixel_extent = e.selection;
            var extent = pixel_extent.map(this.scale.scale.invert).sort(
                (a, b) => a - b);
            this.update_mark_selected(pixel_extent);

            this.set_selected("selected", extent);
            this.touch();
        }
    },

    update_scale_domain: function(ignore_gui_update) {
        // Call the base class function to update the scale.
        BrushIntervalSelector.__super__.update_scale_domain.apply(this);
        if(ignore_gui_update !== true) {
            this.selected_changed();
        }
    },

    selected_changed: function(model, value) {
        if(this.brushing) {
            return;
        }
        //reposition the interval selector and set the selected attribute.
        var selected = this.model.get("selected") || [];
        if(selected.length === 0) {
            this.update_mark_selected();
        } else if(selected.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            var extent = [selected[0], selected[1]];
            this.brush.extent(extent);
            var pixel_extent = extent.map(this.scale.scale).sort(
                (a: number, b: number) => a - b);
            this.update_mark_selected(pixel_extent);
        }
    },

    relayout: function() {
        BrushIntervalSelector.__super__.relayout.apply(this);

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
        this.brush.extent([[0, 0], [this.width, this.height]]);

        var range = this.model.get("selected").map(this.scale.scale).sort(
            function(a, b) { return a - b; });
        this.brush.move(this.d3el, range);
        this.brushsel = this.d3el.call(this.brush);
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

export const MultiSelector = selector.BaseXSelector.extend(BaseBrushSelector).extend({

    render: function() {
        MultiSelector.__super__.render.apply(this);

        var that = this;
        this.names = this.model.get("names");
        this.curr_index = 0;

        var scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.d3el.attr("class", "multiselector");
            that.d3el.attr("width", that.width);
            that.d3el.attr("height", that.height);
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
        this.set_selected("_selected", selected);
        this.touch();
    },

    create_brush: function(event) {
        // Function to add new brushes.
        var that = this;
        var index = this.curr_index;

        var vertical = (this.model.get("orientation") == "vertical");
        var brush = (vertical ? d3.brushY() : d3.brushX())
          .on("start", function() { that.brush_start(); })
          .on("brush", function() { that.brush_move(index, this); })
          .on("end", function() { that.brush_end(index, this); });
        brush.extent([[0, 0], [this.width, this.height]]);

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
            new_brush_g.select("text").attr("x", 30);
        } else {
            new_brush_g.select("text").attr("y", 30);
        }
        new_brush_g.call(brush);

        this.color_change();
        this.adjust_rectangle();

        var old_handler = new_brush_g.on("mousedown.brush");
        new_brush_g.on("mousedown.brush", function() {
            var accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
            if(d3GetEvent().shiftKey && accelKey) {
                that.reset();
            } else if(accelKey) {
                add_remove_classes(d3.select(this), ["inactive"], ["active"]);
                that.create_brush(d3GetEvent());
            } else if(d3GetEvent().shiftKey && that.selecting_brush === false) {
                add_remove_classes(that.d3el.selectAll(".selector"), ["visible"], ["active", "inactive"]);
                that.selecting_brush = true;
            } else {
                add_remove_classes(that.d3el.selectAll(".selector"), ["inactive"], ["visible"]);
                add_remove_classes(d3.select(this), ["active"], ["inactive"]);
                old_handler.call(this);
                that.selecting_brush = false;
            }
        });
        this.curr_index = this.curr_index + 1;
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
        var sel = d3GetEvent().selection;
        var hide_names = !(this.model.get("show_names"));
        d3.select(brush_g).select("text")
          .style("display", ((!sel || hide_names) ? "none" : "inline"));
        this.set_text_location(brush_g, sel);
        this.convert_and_save(sel, item);
    },

    brush_end: function (item, brush_g) {
        var sel = d3GetEvent().selection;
        this.model.set("brushing", false);
        this.convert_and_save(sel, item);
    },

    set_text_location: function(brush_g, extent) {
        var vertical = (this.model.get("orientation") == "vertical");
        var orient = vertical ? "y" : "x";
        var mid = (extent[0] + extent[1]) / 2;
        d3.select(brush_g).select("text")
          .attr(orient, mid);
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
        if(!extent) {
            this.update_mark_selected();
            this.model.set("_selected", {});
            this.touch();
        } else {
            var selected = utils.deepCopy(this.model.get("_selected"));
            selected[this.get_label(item)] = extent.map(this.scale.scale.invert);
            this.update_mark_selected(extent);
            this.model.set("_selected", selected);
            this.touch();
        }
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
