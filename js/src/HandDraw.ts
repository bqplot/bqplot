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
import * as utils from './utils';
import { Interaction } from './Interaction';
const convert_dates = require('./utils').convert_dates;

export class HandDraw extends Interaction {

    render() {
        super.render();
        this.d3el.style("cursor", "crosshair");
        this.active = false;

        // Register the mouse callback when the mark view promises are
        // resolved.
        this.set_lines_view().then(() => {
            this.d3el.on("mousedown", () => {
                return this.mousedown();
            });
            this.set_limits();
        });

        // Update line index
        this.update_line_index();
        this.listenTo(this.model, "change:line_index", this.update_line_index);
        this.model.on_some_change(["min_x", "max_x"], this.set_limits, this);
    }

    set_lines_view() {
        const fig = this.parent;
        const lines_model = this.model.get("lines");
        return Promise.all(fig.mark_views.views).then((views) => {
            const fig_mark_ids = fig.mark_views._models.map((mark_model) => {
                return mark_model.model_id; // Model ids of the marks in the figure
            });
            const mark_index = fig_mark_ids.indexOf(lines_model.model_id);
            this.lines_view = views[mark_index];
        });
    }

    mousedown () {
        this.active = true;
        this.mouse_entry(false);
        this.d3el.on("mousemove", () => { this.mousemove(); });
        this.d3el.on("mouseleave", () => { this.mouseup(); });
        this.d3el.on("mouseup", () => { this.mouseup(); });
    }

    mouseup () {
        if (this.active) {
            this.mouse_entry(true);
            const lines_model = this.model.get("lines");
            lines_model.set("y", convert_dates(utils.deepCopy(lines_model.y_data)));
            this.lines_view.touch();
            this.active = false;
            this.d3el.on("mousemove", null);
            this.d3el.on("mouseleave", null);
            this.d3el.on("mouseup", null);
        }
    }

    mousemove() {
        this.mouse_entry(true);
    }

    mouse_entry(memory) {
        // If memory is set to true, itermediate positions between the last
        // position of the mouse and the current one will be interpolated.
        if (this.active) {
            const lines_model = this.model.get("lines");
            const xindex = Math.min(this.line_index,
                                  lines_model.x_data.length - 1);
            const mouse_pos = d3.mouse(this.el);
            if (!memory || !("previous_pos" in this)) {
                this.previous_pos = mouse_pos;
            }
            const scale_x = this.lines_view.scales.x.scale;
            const scale_y = this.lines_view.scales.y.scale;

            const newx = scale_x.invert(mouse_pos[0]);
            const newy = scale_y.invert(mouse_pos[1]);
            const oldx = scale_x.invert(this.previous_pos[0]);
            scale_y.invert(this.previous_pos[1]);
            const old_index = this.nns(lines_model.x_data[xindex], oldx);
            const new_index = this.nns(lines_model.x_data[xindex], newx);
            const min = Math.min(old_index, new_index);
            const max = Math.max(old_index, new_index);
            for (let i=min; i<=max; ++i) {
                if ((!(this.valid_min) ||
                     lines_model.x_data[xindex][i] >= this.min_x) &&
                    ((!this.valid_max) ||
                     lines_model.x_data[xindex][i] <= this.max_x)) {
                    lines_model.y_data[this.line_index][i] = newy;
                }
            }
            const xy_data = lines_model.x_data[xindex].map((d, i) => {
                return {
                    x: d,
                    y: lines_model.y_data[this.line_index][i]
                };
            });
            this.lines_view.d3el.select("#curve" + (this.line_index + 1))
                .attr("d", function(d) {
                    return this.lines_view.line(xy_data);
                });
            this.previous_pos = mouse_pos;
        }
    }

    capnfloor(val) {
        // Not taking into account the position of the mouse beyond min_x
        // and max_x
        return Math.max(Math.min(val,this.model.get("max_x")),
                        this.model.get("min_x"));
    }

    set_limits() {
        const is_date = (this.lines_view.scales.x.model.type == "date");
        if(is_date) {
            this.min_x = this.model.get_date_elem("min_x");
            this.valid_min = !(this.min_x === null ||
                               this.min_x === undefined ||
                               isNaN(this.min_x.getTime()));
            this.max_x = this.model.get_date_elem("max_x");
            this.valid_max = !(this.max_x === null ||
                               this.max_x === undefined ||
                               isNaN(this.max_x.getTime()));
        } else {
            this.min_x = this.model.get("min_x");
            this.max_x = this.model.get("max_x");
            this.valid_min = !(this.min_x === null ||
                               this.min_x === undefined);
            this.valid_max = !(this.max_x === null ||
                               this.max_x === undefined);
        }
    }

    nns(x_data, x) {
        // Nearest neighbor search
        const idx = this.lines_view.bisect(x_data, x);
        if (x - x_data[idx-1] > x_data[idx] - x) {
            return idx;
        } else {
            return idx-1;
        }
    }

    update_line_index() {
        // Called when the line index is changed in the model
        this.line_index = this.model.get("line_index");
    }

    active: boolean;
    lines_view: any;
    line_index: any;
    min_x: any;
    max_x: any;
    valid_min: any;
    valid_max: any;
    previous_pos: any;
};
