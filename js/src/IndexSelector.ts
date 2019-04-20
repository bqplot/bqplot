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
// var d3 =Object.assign({}, require("d3-selection"));
import * as _ from 'underscore';
import { BaseXSelector } from './Selector';

export class IndexSelector extends BaseXSelector {

    render () {
        super.render();
        this.active = false;
        this.dirty = false;
        const that = this;
        const scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            that.line = that.d3el.append("line")
              .attr("class", "selector indsel")
              .attr("x1", 0)
              .attr("y1", 0)
              .attr("x2", 0)
              .attr("y2", that.height)
              .attr("stroke-width", that.model.get("line_width"))
              .attr("pointer-events", "none")
              .attr("visibility", "hidden");
            that.color_change();

            //container for mouse events
            that.background = that.d3el.append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", that.width)
              .attr("height", that.height)
              .attr("class", "selector selectormouse")
              .attr("pointer-events", "all")
              .attr("visibility", "hidden");

            that.background.on("mousemove", _.bind(that.mousemove, that))
                .on("click", _.bind(that.initial_click, that));

            that.create_listeners();
            that.selected_changed();
        });
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:color", this.color_change);
    }

    color_change() {
        if(this.model.get("color") !== null){
            this.line.style("stroke", this.model.get("color"));
        }
    }

    initial_click() {
        this.line.attr("visibility", "visible");
        this.click();
        this.background.on("click", _.bind(this.click, this));
    }

    click () {
        this.active = !this.active;
    }

    mousemove() {
        if (!this.active) {
            return;
        }
        this.dirty = true;
        const mouse_pos = d3.mouse(this.background.node());
        const xpixel = mouse_pos[0];
        //update the index vertical line
        this.line.attr("x1", xpixel).attr("x2", xpixel);

        this.set_selected("selected", [this.invert_pixel(xpixel)]);
        _.each(this.mark_views, function(mark_view: any) {
             mark_view.invert_point(xpixel);
        });
        this.touch();
        this.dirty = false;
    }

    invert_pixel(pixel) {
        return this.scale.invert(pixel);
    }

    reset() {
        this.active = false;
        if(this.line !== undefined && this.line !== null) {
            this.line.attr("x1", 0)
                     .attr("x2", 0)
                     .attr("visibility", "hidden");
        }

        if(this.background !== undefined && this.background !== null) {
            this.background.on("click", _.bind(this.initial_click, this));
        }
        this.model.set("selected", null);

        _.each(this.mark_views, function(mark_view: any) {
            mark_view.invert_point();
        });
        this.touch();
    }

    update_scale_domain(ignore_gui_update) {
        // Call the base class function to update the scale.
        super.update_scale_domain();
        if(ignore_gui_update !== true) {
            this.selected_changed();
        }
    }

    selected_changed() {
        if(this.dirty) {
            //this change was most probably triggered from the js side and
            //should be ignored.
            return;
        }
        //reposition the interval selector and set the selected attribute.
        const selected = this.model.get("selected") || [];
        if(selected.length === 0) {
            this.reset();
        } else if (selected.length != 1) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            const pixel = this.scale.scale(selected[0]);
            if(this.line !== undefined && this.line !== null) {
                this.line.attr("x1", 0)
                         .attr("x2", 0)
                         .attr("visibility", "visible");
            }
            //the selected may be called before the index selector is
            //active for the first time.
            this.background.on("click", _.bind(this.click, this));
            _.each(this.mark_views, function(mark_view: any) {
                mark_view.invert_point(pixel);
            });
        }
    }

    relayout() {
        super.relayout();
        this.line.attr("y1", 0)
            .attr("y2", this.height);
        this.background.attr("width", this.width)
            .attr("height", this.height);
        this.set_range([this.scale]);
    }

    set_range(array) {
        for(let iter = 0; iter < array.length; iter++) {
            array[iter].set_range([0, this.width]);
        }
    }

    active: boolean;
    dirty: boolean;
    line: any;
    background: any;
}

