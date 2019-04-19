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
// var d3 =Object.assign({}, require("d3-drag"), require("d3-selection"), require("d3-shape"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import {BaseXYSelector} from './Selector';
import * as sel_utils from './selector_utils';

export class LassoSelector extends BaseXYSelector {
    render() {
        super.render();
        const scale_creation_promise = this.create_scales();
        this.line = d3.line();
        this.all_vertices = {};
        this.lasso_counter = 0;

        const that = this;
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(() => {
            // Warning: arrow functions actually breaks the drag
            const drag = d3.drag()
                .on("start", function () {that.drag_start();})
                .on("drag", function() {that.drag_move();})
                .on("end", function() {that.drag_end();});

            d3.select(window).on("keydown", () => {this.keydown();});

            that.d3el.attr("class", "lassoselector");

            //container for mouse events
            that.background = that.d3el.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.width)
                .attr("height", that.height)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .style("cursor", "crosshair")
                .call(drag);

            that.create_listeners();
        });
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:color", this.change_color);
    }

    change_color(model, color) {
        if (color) {
            this.d3el.selectAll("path").style("stroke", color);
        }
    }

    create_new_lasso() {
        const lasso = this.d3el.append("path")
            .attr("id", "l" + (++this.lasso_counter))
            .on("click", function() {
                //toggle the opacity of lassos
                const lasso = d3.select(this);
                lasso.classed("selected", !lasso.classed("selected"));
            });
        const color = this.model.get("color");
        if (color) {
            lasso.style("stroke", color);
        }
    }

    drag_start() {
        this.current_vertices = [];
        this.create_new_lasso();
    }

    drag_move() {
        this.current_vertices.push(d3.mouse(this.background.node()));
        this.d3el.select("#l" + this.lasso_counter)
            .attr("d", this.line(this.current_vertices));
    }

    drag_end() {
        const lasso_name = "l" + this.lasso_counter;
        // Close the lasso
        this.d3el.select("#" + lasso_name)
            .attr("d", this.line(this.current_vertices) + "Z");
        // Add the current vertices to the global lasso vertices
        this.all_vertices[lasso_name] = this.current_vertices;
        // Update selected for each mark
        this.update_mark_selected(this.all_vertices)
    }

    update_mark_selected(vertices?) {

        if(vertices === undefined || vertices.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view: any) {
                return mark_view.selector_changed();
            });
        }
        const point_selector = function(p) {
            for (let l in vertices) {
                if (sel_utils.point_in_lasso(p, vertices[l])) { return true; }
            } return false;
        };
        const rect_selector = function(xy) {
            for (let l in vertices) {
                if (sel_utils.lasso_inter_rect(xy[0], xy[1], vertices[l])) { return true; }
            } return false;
        };

        _.each(this.mark_views, function(mark_view: any) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    }

    relayout() {
        super.relayout();
        this.background.attr("width", this.width).attr("height", this.height);
    }

    keydown() {
       // delete key pressed
       if (d3GetEvent().keyCode === 46) {
           // Delete selected lassos
           const lassos_to_delete = this.d3el.selectAll(".selected");
           // Update the lasso vertices
           const vertices = this.all_vertices;
           lassos_to_delete.each(function() {
               const lasso_name = d3.select(this).attr("id");
               delete vertices[lasso_name];
           });
           lassos_to_delete.remove();
           this.update_mark_selected(this.all_vertices);
      }
    }

    reset() {
        this.lasso_counter = 0;
        this.all_vertices = {};
        this.d3el.selectAll("path").remove();
        this.update_mark_selected();
    }

    // TODO: this is here to provide an implementation of an abstract method
    // from the base class.
    selected_changed() {}

    line: any;
    all_vertices: any;
    lasso_counter: number;
    background: any;
    current_vertices: any[];

}
