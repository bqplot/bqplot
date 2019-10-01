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

// TODO: examine refactoring the two abstract base classes belowing using a more
// up-to-date mixin pattern. See
// https://www.bryntum.com/blog/the-mixin-pattern-in-typescript-all-you-need-to-know/
// and
// https://github.com/Microsoft/TypeScript/issues/9110#issuecomment-239235909

// For now, since it's not clear what mixin approach we should use with abstract
// classes, we provide two children classes with the same functionality. If you
// change one, make sure to change the other correspondingly.

abstract class BrushMixinXYSelector extends selector.BaseXYSelector {
    brush_render() {
        this.brushing = false;
    }

    color_change() {
        if (this.model.get("color") !== null) {
            this.brushsel.select(".selection").style("fill", this.model.get("color"));
        }
    }

    brush_start () {
        this.model.set("brushing", true);
        this.touch();
        this.brushing = true;
    }

    brush_move () {
        this.convert_and_save();
    }

    brush_end () {
        this.model.set("brushing", false);
        this.convert_and_save();
        this.brushing = false;
    }

    adjust_rectangle() {
        if (this.model.get("orientation") == "vertical") {
            this.d3el.selectAll("rect")
              .attr("x", 0)
              .attr("width", this.width);
        } else {
            this.d3el.selectAll("rect")
              .attr("y", 0)
              .attr("height", this.height);
        }
    }

    update_mark_selected(extent_x?, extent_y?) {

        if(extent_x === undefined || extent_x.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view: any) {
                return mark_view.selector_changed();
            });
            return;
        }
        let x, y;
        if (extent_y === undefined) {
            // 1d brush
            const orient = this.model.get("orientation");
            x = (orient == "vertical") ? [] : extent_x,
            y = (orient == "vertical") ? extent_x : [];
        } else {
            // 2d brush
            x = extent_x, y = extent_y;
        }
        const point_selector = function(p) {
            return sel_utils.point_in_rectangle(p, x, y);
        };
        const rect_selector = function(xy) {
            return sel_utils.rect_inter_rect(xy[0], xy[1], x, y);
        };

        _.each(this.mark_views, function(mark_view: any) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    }

    abstract convert_and_save(extent?, item?);

    brush: any;
    brushing: boolean;
    brushsel: any;

    // TODO: should this be mark_views_promises?
    mark_views: any;
}

abstract class BrushMixinXSelector extends selector.BaseXSelector {
    brush_render() {
        this.brushing = false;
    }

    color_change() {
        if (this.model.get("color") !== null) {
            this.brushsel.select(".selection").style("fill", this.model.get("color"));
        }
    }

    brush_start () {
        this.model.set("brushing", true);
        this.touch();
        this.brushing = true;
    }

    brush_move () {
        this.convert_and_save();
    }

    brush_end () {
        this.model.set("brushing", false);
        this.convert_and_save();
        this.brushing = false;
    }

    adjust_rectangle() {
        if (this.model.get("orientation") == "vertical") {
            this.d3el.selectAll("rect")
              .attr("x", 0)
              .attr("width", this.width);
        } else {
            this.d3el.selectAll("rect")
              .attr("y", 0)
              .attr("height", this.height);
        }
    }

    update_mark_selected(extent_x?, extent_y?) {

        if(extent_x === undefined || extent_x.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view: any) {
                return mark_view.selector_changed();
            });
            return;
        }
        let x, y;
        if (extent_y === undefined) {
            // 1d brush
            const orient = this.model.get("orientation");
            x = (orient == "vertical") ? [] : extent_x,
            y = (orient == "vertical") ? extent_x : [];
        } else {
            // 2d brush
            x = extent_x, y = extent_y;
        }
        if(x.length)
            x.sort(function(a, b){ return a - b; });
        if(y.length)
            y.sort(function(a, b){ return a - b; });
        const point_selector = function(xar, yar) {
            if(typeof yar == "undefined") { // the 'old' method for backwards compatibility
                const p = xar;
                return sel_utils.point_in_rectangle(p, x, y);
            }
            const N = Math.min(xar.length, yar.length);
            const mask = new Uint8Array(N);
            // for performance we keep the if statement out of the loop
            if(x.length && y.length) {
                for(let i = 0; i < N; i++) {
                    mask[i] = (x[0] <= xar[i] && xar[i] <= x[1] && y[0] <= yar[i] && yar[i] <= y[1]) ? 1 : 0;
                }
                return mask;
            } else if(x.length) {
                for(let i = 0; i < N; i++) {
                    mask[i] = (x[0] <= xar[i] && xar[i] <= x[1]) ? 1 : 0;
                }
            } else { // (y.length)
                for(let i = 0; i < N; i++) {
                    mask[i] = (y[0] <= yar[i] && yar[i] <= y[1]) ? 1 : 0;
                }
            };
            return mask;
        }
        const rect_selector = function(xy) {
            return sel_utils.rect_inter_rect(xy[0], xy[1], x, y);
        };

        _.each(this.mark_views, function(mark_view: any) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    }

    abstract convert_and_save(extent?, item?);

    brush: any
    brushing: boolean;
    brushsel: any;

    // TODO: should this be mark_views_promises?
    mark_views: any;
}

export class BrushSelector extends BrushMixinXYSelector {

    render() {
        super.render.apply(this);
        this.brush_render();

        const that = this;
        const scale_creation_promise = this.create_scales();
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
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:color", this.color_change);
        // Move these to BaseXYSelector
        this.listenTo(this.model, "change:selected_x", this.selected_changed);
        this.listenTo(this.model, "change:selected_y", this.selected_changed);
    }

    empty_selection() {
        this.update_mark_selected();
        this.model.set("selected_x", null);
        this.model.set("selected_y", null);
        this.touch();
    }

    convert_and_save() {
        const e = d3GetEvent();
        if(!e.sourceEvent) return;
        if(!e.selection) {
            this.empty_selection();
        } else {
            const d0 = e.selection;
            var pixel_extent_x = [d0[0][0], d0[1][0]];
            var pixel_extent_y = [d0[1][1], d0[0][1]];

            // d3 does not always (!) give the selection in [[xmin, xmax], [ymin, ymax]] order
            // so we sort it to be sure
            var sortFunction = (a: number, b: number) => a - b;
            pixel_extent_x.sort(sortFunction)
            pixel_extent_y.sort(sortFunction)

            const extent_x = pixel_extent_x.map(this.x_scale.scale.invert).sort(
                (a: number, b: number) => a - b);
            const extent_y = pixel_extent_y.map(this.y_scale.scale.invert).sort(
                (a: number, b: number) => a - b);

            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
            this.set_selected("selected_x", extent_x);
            this.set_selected("selected_y", extent_y);
            this.touch();
        }
    }

    selected_changed() {
        if(this.brushing) {
            return;
        }
        //reposition the interval selector and set the selected attribute.
        const selected_x = this.model.get("selected_x") || [],
            selected_y = this.model.get("selected_y") || [];
        if(selected_x.length === 0 || selected_y.length === 0) {
            this.update_mark_selected();
        } else if(selected_x.length != 2 || selected_y.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            const extent = [[selected_x[0], selected_y[0]],
                          [selected_x[1], selected_y[1]]];
            this.brush.extent(extent);
            const pixel_extent_x = selected_x.map(this.x_scale.scale).sort(
                function(a, b) { return a - b; });
            const pixel_extent_y = selected_y.map(this.y_scale.scale).sort(
                function(a, b) { return a - b; });
            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
        }
    }

    relayout() {
        super.relayout();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_x_range([this.x_scale]);
        this.set_y_range([this.y_scale]);

        this.brush.extent([[0, 0], [this.width, this.height]]);
        if(this.model.get("selected_x") && this.model.get("selected_y")) {
            const range_x = this.model.get("selected_x").map(this.x_scale.scale).sort(
                function(a, b) { return a - b; });
            const range_y = this.model.get("selected_y").map(this.y_scale.scale).sort(
                function(a, b) { return a - b; });
            this.brush.move(this.d3el, [[range_x[0], range_y[0]], [range_x[1], range_y[1]]]);
            this.brushsel = this.d3el.call(this.brush);
        }
    }

    // TODO: check that we've properly overridden the mixin.
    adjust_rectangle() {
    }
    reset() { }
}


export class BrushIntervalSelector extends BrushMixinXSelector {

    render() {
        super.render();
        this.brush_render();

        const that = this;
        const scale_creation_promise = this.create_scales();
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

    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:color", this.color_change);
    }

    empty_selection() {
        this.update_mark_selected();
        this.model.set("selected", []);
        this.touch();
    }

    convert_and_save() {
        const e = d3GetEvent();
        if(!e.sourceEvent) return;
        if(!e.selection) {
            this.empty_selection();
        } else {
            const pixel_extent = e.selection;
            const extent = pixel_extent.map(this.scale.scale.invert).sort(
                (a, b) => a - b);
            this.update_mark_selected(pixel_extent);

            this.set_selected("selected", extent);
            this.touch();
        }
    }

    update_scale_domain(ignore_gui_update) {
        // Call the base class function to update the scale.
        super.update_scale_domain();
        if(ignore_gui_update !== true) {
            this.selected_changed();
        }
    }

    selected_changed() {
        if(this.brushing) {
            return;
        }
        //reposition the interval selector and set the selected attribute.
        const selected = this.model.get("selected") || [];
        if(selected.length === 0) {
            this.update_mark_selected();
        } else if(selected.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            const extent = [selected[0], selected[1]];
            this.brush.extent(extent);
            const pixel_extent = extent.map(this.scale.scale).sort(
                (a: number, b: number) => a - b);
            this.update_mark_selected(pixel_extent);
        }
    }

    relayout() {
        super.relayout();

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
        this.brush.extent([[0, 0], [this.width, this.height]]);

        if(this.model.get("selected")) {
            const range = this.model.get("selected").map(this.scale.scale).sort(
                function(a, b) { return a - b; });
            this.brush.move(this.d3el, range);
            this.brushsel = this.d3el.call(this.brush);
        }
    }

    reset() { }
}


function add_remove_classes(selection, add_classes, remove_classes) {
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

export class MultiSelector extends BrushMixinXSelector {

    render() {
        super.render.apply(this);

        const that = this;
        this.names = this.model.get("names");
        this.curr_index = 0;

        const scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.d3el.attr("class", "multiselector");
            that.d3el.attr("width", that.width);
            that.d3el.attr("height", that.height);
            that.create_brush();
            that.selecting_brush = false;
            that.create_listeners();
        });
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:names", this.labels_change);
        this.listenTo(this.model, "change:color", this.color_change);
    }

    labels_change(model, value) {
        const prev_names = model.previous("names");
        this.names = value;

        const data = _.range(this.curr_index + 1);
        const that = this;
        const selected = utils.deepCopy(this.model.get("selected"));
        //TODO: Use do diff?
        data.forEach(function(elem) {
            const label = that.get_label(elem);
            const prev_label = that.get_label(elem, prev_names);
            if(prev_label !== label) {
                that.d3el.select(".brush_text_" + elem).text(label);
                selected[label] = selected[prev_label];
                delete selected[prev_label];
            }
        });
        this.set_selected("_selected", selected);
        this.touch();
    }

    create_brush() {
        // Function to add new brushes.
        const that = this;
        const index = this.curr_index;

        const vertical = (this.model.get("orientation") == "vertical");
        const brush = (vertical ? d3.brushY() : d3.brushX())
          .on("start", () => { this.brush_start(); })
          .on("brush", () => { this.brush_move(index, this); })
          .on("end", () => { this.brush_end(index, this); });
        brush.extent([[0, 0], [this.width, this.height]]);

        const new_brush_g = this.d3el.append("g")
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

        const old_handler = new_brush_g.on("mousedown.brush");
        new_brush_g.on("mousedown.brush", function() {
            const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
            if(d3GetEvent().shiftKey && accelKey) {
                that.reset();
            } else if(accelKey) {
                add_remove_classes(d3.select(this), ["inactive"], ["active"]);
                that.create_brush();
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
    }

    get_label(index, arr?) {
        //arr is optional. If you do not pass anything, this.names is
        //considered arr.
        if(arr === undefined || arr === null) {
            arr = this.names;
        }
        return (arr.length > index) ? arr[index] : index;
    }

    brush_start() {
        this.model.set("brushing", true);
        this.touch();
    }

    brush_move(item?, brush_g?) {
        const sel = d3GetEvent().selection;
        const hide_names = !(this.model.get("show_names"));
        d3.select(brush_g).select("text")
          .style("display", ((!sel || hide_names) ? "none" : "inline"));
        this.set_text_location(brush_g, sel);
        this.convert_and_save(sel, item);
    }

    brush_end (item?, brush_g?) {
        const sel = d3GetEvent().selection;
        this.model.set("brushing", false);
        this.convert_and_save(sel, item);
    }

    set_text_location(brush_g, extent) {
        const vertical = (this.model.get("orientation") == "vertical");
        const orient = vertical ? "y" : "x";
        const mid = (extent[0] + extent[1]) / 2;
        d3.select(brush_g).select("text")
          .attr(orient, mid);
    }


    reset() {
        this.d3el.selectAll(".selector")
          .remove();
        this.model.set("_selected", {});
        this.curr_index = 0;
        this.touch();
        this.create_brush();
    }

    convert_and_save(extent, item) {
        if(!extent) {
            this.update_mark_selected();
            this.model.set("_selected", {});
            this.touch();
        } else {
            const selected = utils.deepCopy(this.model.get("_selected"));
            selected[this.get_label(item)] = extent.map(this.scale.scale.invert);
            this.update_mark_selected(extent);
            this.model.set("_selected", selected);
            this.touch();
        }
    }

    // TODO: make a proper implementation
    selected_changed() { }

    color_change() {
        if (this.model.get("color") !== null) {
            this.d3el.selectAll(".selector")
              .style("fill", this.model.get("color"));
        }
    }

    relayout() {
        super.relayout();

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
    }

    remove() {
        this.model.off("change:names", null, this);
        super.remove();
    }

    curr_index: number;
    selecting_brush: boolean;
    names: any;
}
