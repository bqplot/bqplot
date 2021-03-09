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
import { Mark } from './Mark';

// TODO: examine refactoring the two abstract base classes belowing using an
// up-to-date mixin pattern.

// Because we use abstract base classes, the mixins cannot work with current TypeScript:
// https://github.com/microsoft/TypeScript/issues/29653

// Instead of using mixins we use free functions for now


function point_selector (x, y) {
    return function(xar, yar) {
        if(typeof yar == "undefined") { // the 'old' method for backwards compatibility
            return sel_utils.point_in_rectangle(xar, x, y);
        }

        const len = Math.min(xar.length, yar.length);
        const mask = new Uint8Array(len);
        // for performance we keep the if statement out of the loop
        if(x.length && y.length) {
            for(let i = 0; i < len; i++) {
                mask[i] = (x[0] <= xar[i] && xar[i] <= x[1] && y[0] <= yar[i] && yar[i] <= y[1]) ? 1 : 0;
            }
            return mask;
        } else if(x.length) {
            for(let i = 0; i < len; i++) {
                mask[i] = (x[0] <= xar[i] && xar[i] <= x[1]) ? 1 : 0;
            }
        } else { // (y.length)
            for(let i = 0; i < len; i++) {
                mask[i] = (y[0] <= yar[i] && yar[i] <= y[1]) ? 1 : 0;
            }
        };

        return mask;
    }
}

function rect_selector (x, y) {
    return function(xy) {
        return sel_utils.rect_inter_rect(xy[0], xy[1], x, y);
    }
}

function sort (a, b){
    return a - b;
}

function update_mark_selected (brush, extent_x?, extent_y?) {
    if (extent_x === undefined || extent_x.length === 0) {
        // Reset all the selected in marks
        _.each(brush.mark_views, (mark_view: any) => {
            return mark_view.selector_changed();
        });
        return;
    }

    let x, y;
    if (extent_y === undefined) {
        // 1d brush
        const orient = brush.model.get("orientation");
        x = (orient == "vertical") ? [] : extent_x,
        y = (orient == "vertical") ? extent_x : [];
    } else {
        // 2d brush
        x = extent_x, y = extent_y;
    }

    if (x.length) {
        x.sort(sort);
    }
    if (y.length) {
        y.sort(sort);
    }

    _.each(brush.mark_views, (mark_view: any) => {
        mark_view.selector_changed(point_selector(x, y), rect_selector(x, y));
    });
}

function adjust_rectangle (brush) {
    if (brush.model.get("orientation") == "vertical") {
        brush.d3el.selectAll("rect")
          .attr("x", 0)
          .attr("width", brush.width);
    } else {
        brush.d3el.selectAll("rect")
          .attr("y", 0)
          .attr("height", brush.height);
    }
}


abstract class BrushMixinXYSelector extends selector.BaseXYSelector {
    brush_render() {
        this.brushing = false;
    }

    color_change() {
        if (this.model.get("color") !== null) {
            this.d3el.selectAll(".selection").style("fill", this.model.get("color"));
        }
    }

    brush_start () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.brushing = true;
        this.model.set("brushing", true);
        this.touch();
    }

    brush_move () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.convert_and_save();
    }

    brush_end () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.model.set("brushing", false);
        this.convert_and_save();
        this.brushing = false;
    }

    adjust_rectangle() {
        adjust_rectangle(this);
    }

    update_mark_selected(extent_x?, extent_y?) {
        return update_mark_selected(this, extent_x, extent_y);
    }

    abstract convert_and_save(extent?, item?);

    brush: d3.BrushBehavior<any>;
    brushing: boolean;

    // TODO: should this be mark_views_promises?
    mark_views: Mark[];

    ignoreBrushEvents: boolean = false;
}

abstract class BrushMixinXSelector extends selector.BaseXSelector {
    brush_render() {
        this.brushing = false;
    }

    color_change() {
        if (this.model.get("color") !== null) {
            this.d3el.selectAll(".selection").style("fill", this.model.get("color"));
        }
    }

    brush_start () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.brushing = true;
        this.model.set("brushing", true);
        this.touch();
    }

    brush_move () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.convert_and_save();
    }

    brush_end () {
        if (this.ignoreBrushEvents) {
            return;
        }
        this.model.set("brushing", false);
        this.convert_and_save();
        this.brushing = false;
    }

    adjust_rectangle() {
        adjust_rectangle(this);
    }

    update_mark_selected(extent_x?, extent_y?) {
        return update_mark_selected(this, extent_x, extent_y);
    }

    abstract convert_and_save(extent?, item?);

    brush: d3.BrushBehavior<any>;
    brushing: boolean;

    // TODO: should this be mark_views_promises?
    mark_views: Mark[];

    ignoreBrushEvents: boolean = false;
}

export class BrushSelector extends BrushMixinXYSelector {

    async render() {
        await super.render();
        this.brush_render();

        await this.create_scales();
        await this.mark_views_promise
        this.brush = d3.brush()
            .on("start", _.bind(this.brush_start, this))
            .on("brush", _.bind(this.brush_move, this))
            .on("end", _.bind(this.brush_end, this));
        this.brush.extent([[0, 0], [this.width, this.height]]);

        this.d3el.attr("class", "selector brushintsel");
        this.d3el.call(this.brush);
        this.adjust_rectangle();
        this.color_change();
        this.create_listeners();
        this.selected_changed();
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

            const extent_x = pixel_extent_x.map(this.x_scale.invert.bind(this.x_scale)).sort(sort);
            const extent_y = pixel_extent_y.map(this.y_scale.invert.bind(this.y_scale)).sort(sort);

            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
            this.set_selected("selected_x", this.x_scale.model.typedRange((extent_x as ArrayLike<number>)));
            this.set_selected("selected_y", this.y_scale.model.typedRange((extent_y as ArrayLike<number>)));
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
            const pixel_extent_x = selected_x.map((v) => this.x_scale.offset + this.x_scale.scale(v)).sort(sort);
            const pixel_extent_y = selected_y.map((v) => this.y_scale.offset + this.y_scale.scale(v)).sort(sort);
            this.update_mark_selected(pixel_extent_x, pixel_extent_y);
        }
        this.syncModelToBrush();
    }

    relayout() {
        super.relayout();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_x_range([this.x_scale]);
        this.set_y_range([this.y_scale]);

        this.brush.extent([[0, 0], [this.width, this.height]]);
        this.syncModelToBrush();
    }

    private syncModelToBrush() {
        // Move and redraw the brush selector, preventing move events to be triggered
        this.ignoreBrushEvents = true;

        try {
            if(this.model.get("selected_x") && this.model.get("selected_y")) {
                const range_x = this.model.get("selected_x").map((v) => this.x_scale.offset + this.x_scale.scale(v)).sort(sort);
                const range_y = this.model.get("selected_y").map((v) => this.y_scale.offset + this.y_scale.scale(v)).sort(sort);
                this.brush.move(this.d3el, [[range_x[0], range_y[0]], [range_x[1], range_y[1]]]);
            } else {
                this.brush.move(this.d3el, null);
            }

            this.d3el.call(this.brush);
        } finally {
            this.ignoreBrushEvents = false;
        }

        this.d3el.call(this.brush);
    }

    // TODO: check that we've properly overridden the mixin.
    adjust_rectangle() {
    }
    reset() { }

    d3el: d3.Selection<SVGGElement, any, any, any>;
}


export class BrushIntervalSelector extends BrushMixinXSelector {

    async render() {
        await super.render();
        this.brush_render();

        await this.mark_views_promise;
        await this.create_scales();
        this.brush = (this.model.get("orientation") == "vertical" ? d3.brushY() : d3.brushX())
            .on("start", _.bind(this.brush_start, this))
            .on("brush", _.bind(this.brush_move, this))
            .on("end", _.bind(this.brush_end, this));
        this.brush.extent([[0, 0], [this.width, this.height]]);

        this.d3el.attr("class", "selector brushintsel");
        this.d3el.call(this.brush);
        this.adjust_rectangle();
        this.color_change();
        this.create_listeners();
        this.selected_changed();
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:color", this.color_change);
        this.listenTo(this.model, "change:selected", this.selected_changed);
    }

    empty_selection() {
        this.update_mark_selected();
        this.model.set("selected", null);
        this.touch();
    }

    convert_and_save() {
        const e = d3GetEvent();
        if(!e.sourceEvent) return;
        if(!e.selection) {
            this.empty_selection();
        } else {
            const pixel_extent = e.selection;
            const extent = pixel_extent.map(this.scale.invert.bind(this.scale)).sort(sort);

            this.update_mark_selected(pixel_extent);
            this.set_selected("selected", this.scale.model.typedRange(extent));
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
            const pixel_extent = extent.map((v) => this.scale.scale(v)).sort(sort);
            this.update_mark_selected(pixel_extent);
        }
        this.syncModelToBrush();
    }

    relayout() {
        super.relayout();

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
        this.brush.extent([[0, 0], [this.width, this.height]]);
        this.syncModelToBrush();
    }

    private syncModelToBrush() {
        // Move and redraw the brush selector, preventing move events to be triggered
        this.ignoreBrushEvents = true;
        try {
            if (this.model.get("selected")) {
                const range = this.model.get("selected").map((v) => this.scale.scale(v)).sort(sort);

                this.brush.move(this.d3el, range);
            } else {
                this.brush.move(this.d3el, null);
            }

            this.d3el.call(this.brush);
        } finally {
            this.ignoreBrushEvents = false;
        }
    }

    reset() { }

    d3el: d3.Selection<SVGGElement, any, any, any>;
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
        this.brush_render();

        this.names = this.model.get("names");
        this.curr_index = 0;

        const scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(() => {
            this.d3el.attr("class", "multiselector");
            this.d3el.attr("width", this.width);
            this.d3el.attr("height", this.height);
            this.create_brush();
            this.selecting_brush = false;
            this.create_listeners();
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
        const selected = utils.deepCopy(this.model.get("selected"));

        // TODO: Use do diff?
        data.forEach((elem) => {
            const label = this.get_label(elem);
            const prev_label = this.get_label(elem, prev_names);
            if(prev_label !== label) {
                this.d3el.select(".brush_text_" + elem).text(label);
                selected[label] = selected[prev_label];
                delete selected[prev_label];
            }
        });
        this.set_selected("_selected", selected);
        this.touch();
    }

    create_brush() {
        // Function to add new brushes.
        const index = this.curr_index;

        const vertical = (this.model.get("orientation") == "vertical");
        const brush: d3.BrushBehavior<any> = (vertical ? d3.brushY() : d3.brushX())
          .on("start", () => { this.brush_start(); })
          .on("brush", () => { this.multi_brush_move(index); })
          .on("end", () => { this.multi_brush_end(index); });
        brush.extent([[0, 0], [this.width, this.height]]);

        const new_brush_g: d3.Selection<SVGGElement, any, any, any> = this.d3el.append("g")
          .attr("class", "selector brushintsel active");

        new_brush_g.append("text")
          .text(this.get_label(this.curr_index))
          .attr("class", "brush_text_" + this.curr_index)
          .style("display", "none");

        if (this.model.get("orientation") == "vertical") {
            new_brush_g.select("text").attr("x", 30);
        } else {
            new_brush_g.select("text").attr("y", 30);
        }

        new_brush_g.call(brush);

        this.color_change();
        this.adjust_rectangle();
        this.reset_handler(new_brush_g);

        this.brushes[this.curr_index] = brush;
        this.brush_g[this.curr_index] = new_brush_g;
        this.curr_index = this.curr_index + 1;
    }

    reset_handler (brush_g) {
        const that = this;
        const old_handler = brush_g.on("mousedown.brush");

        brush_g.on("mousedown.brush", function() {
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
    }

    get_label(index, arr?) {
        //arr is optional. If you do not pass anything, this.names is
        //considered arr.
        if(arr === undefined || arr === null) {
            arr = this.names;
        }
        return (arr.length > index) ? arr[index] : index;
    }

    multi_brush_move (item) {
        if (this.ignoreBrushEvents) {
            return;
        }

        const extent = d3GetEvent().selection;

        this.update_text(item, extent);
        this.convert_and_save(extent, item);
    }

    update_text (item, extent) {
        if (extent === null) {
            this.d3el.select('.brush_text_' + item)
                .style("display", "none");
            return;
        }

        const orient = this.model.get("orientation") == "vertical" ? "y" : "x";
        const hide_names = !this.model.get("show_names");
        const mid = (extent[0] + extent[1]) / 2;

        this.d3el.select('.brush_text_' + item)
            .style("display", hide_names ? "none" : "inline")
            .attr(orient, mid);
    }

    multi_brush_end (item) {
        if (this.ignoreBrushEvents) {
            return;
        }

        const sel = d3GetEvent().selection;
        this.model.set("brushing", false);
        this.convert_and_save(sel, item);
        this.brushing = false;
    }

    reset() {
        this.d3el.selectAll(".selector")
          .remove();
        this.model.set("_selected", {});
        this.curr_index = 0;
        this.brushes = [];
        this.brush_g = [];
        this.touch();
        this.create_brush();
    }

    convert_and_save(extent, item) {
        if(!extent) {
            this.update_mark_selected();
            this.model.set("_selected", {});
        } else {
            const selected = utils.deepCopy(this.model.get("_selected"));
            selected[this.get_label(item)] = extent.map(this.scale.invert.bind(this.scale));
            this.update_mark_selected(extent);
            this.model.set("_selected", selected);
        }
        this.touch();
    }

    // TODO: make a proper implementation
    selected_changed() { }

    relayout() {
        super.relayout();

        this.adjust_rectangle();
        this.d3el.select(".background")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_range([this.scale]);
        this.brushes.forEach((brush) => {
            brush.extent([[0, 0], [this.width, this.height]]);
        });
        this.syncModelToBrush();
    }

    private syncModelToBrush() {
        // Move and redraw the brush selectors, preventing move events to be triggered
        this.ignoreBrushEvents = true;
        try {
            const selected = this.model.get("_selected");

            this.brushes.forEach((brush, index) => {
                const brushSelected = selected[this.get_label(index)];

                if (brushSelected) {
                    const range = brushSelected.map((v) => this.scale.scale(v)).sort(sort);

                    this.update_text(index, range);
                    brush.move(this.brush_g[index], range);
                } else {
                    this.update_text(index, null);
                    brush.move(this.brush_g[index], null);
                }

                this.brush_g[index].call(brush);
                this.reset_handler(this.brush_g[index]);
            });
        } finally {
            this.ignoreBrushEvents = false;
        }
    }

    remove() {
        this.model.off("change:names", null, this);
        this.model.off("change:color", null, this);
        super.remove();
    }

    brushes: d3.BrushBehavior<any>[] = [];
    brush_g: d3.Selection<SVGGElement, any, any, any>[] = [];

    curr_index: number;
    selecting_brush: boolean;
    names: string[];
}
