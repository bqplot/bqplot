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
// const d3 =Object.assign({}, require("d3-selection"));
import { Interaction } from './Interaction';
const convert_dates = require('./utils').convert_dates;
import { WidgetView } from '@jupyter-widgets/base';

export abstract class BaseSelector extends Interaction {

    initialize(parameters) {
        this.setElement(document.createElementNS(d3.namespaces.svg, "g"));
        this.d3el = d3.select(this.el);
        // The following line is a workaround to avoid calling the initialize
        // method from Interaction. Indeed this last one wraps the area responsible
        // for capturing mouse events in a rect element whose width and height are
        // 0. The whole hierarchy of Interaction should be refactored to fix this.
        WidgetView.prototype.initialize.call(this, parameters);
        //super.initialize.apply(this, arguments);
    }

    render() {
        this.parent = this.options.parent;
        this.width = this.parent.width - this.parent.margin.left - this.parent.margin.right;
        this.height = this.parent.height - this.parent.margin.top - this.parent.margin.bottom;
        this.mark_views_promise = this.populate_mark_views();
    }

    create_listeners() {
        this.parent.on("margin_updated", this.relayout, this);
        this.listenTo(this.model, "change:selected", this.selected_changed);
        this.listenTo(this.model, "change:marks", this.marks_changed);
        this.listenTo(this.model, "msg:custom", this.handle_custom_messages);
    }

    relayout() {
        this.height = this.parent.height - this.parent.margin.top - this.parent.margin.bottom;
        this.width = this.parent.width - this.parent.margin.left - this.parent.margin.right;
    }

    async populate_mark_views() {
        const fig = this.parent;
        const mark_ids = this.model.get("marks").map(m => m.model_id);
        const views = await Promise.all(fig.mark_views.views);

        const fig_mark_ids = fig.mark_views._models.map(m => m.model_id);
        const mark_indices = mark_ids.map(mid => fig_mark_ids.indexOf(mid));
        // return the views, based on the assumption that fig.mark_views is an
        // ordered list
        this.mark_views = mark_indices.map(elem => views[elem]);
    }

    marks_changed() {
        this.populate_mark_views().then(() => this.selected_changed());
    }

    handle_custom_messages(msg) {
        if (msg.type === "reset") {
            this.reset();
        }
    }

    abstract reset();

    abstract selected_changed();
    abstract create_scales();

    set_selected(name, value) {
        this.model.set(name, convert_dates(value))
    }

    width: any
    height: any;
    mark_views_promise: any;
}

export abstract class BaseXSelector extends BaseSelector {

    create_scales() {
        if(this.scale) {
            this.scale.remove();
        }
        if(this.model.get("scale")) {
            const that = this;
            return this.create_child_view(this.model.get("scale")).then(function(view) {
                that.scale = view;
                // The argument is to suppress the update to gui
                that.update_scale_domain(true);
                that.set_range([that.scale]);
                that.scale.on("domain_changed", that.update_scale_domain, that);
                return view;
            });
        }
    }

    update_scale_domain(ignore_gui_update = false) {
        // When the domain of the scale is updated, the domain of the scale
        // for the selector must be expanded to account for the padding.
        const xy = (this.model.get("orientation") == "vertical") ? "y" : "x"
        const initial_range = this.parent.padded_range(xy, this.scale.model);
        const target_range = this.parent.range(xy);
        this.scale.expand_domain(initial_range, target_range);
    }

    set_range(array) {
        const xy = (this.model.get("orientation") == "vertical") ? "y" : "x"
        for(let iter = 0; iter < array.length; iter++) {
            array[iter].set_range(this.parent.range(xy));
        }
    }

    scale: any;
}

export abstract class BaseXYSelector extends BaseSelector {

    create_scales() {
        const that = this;
        if(this.x_scale) {
            this.x_scale.remove();
        }
        if(this.y_scale) {
            this.y_scale.remove();
        }
        const scale_promises = [];
        if(this.model.get("x_scale")) {
            scale_promises.push(this.create_child_view(this.model.get("x_scale")).then(function(view) {
                that.x_scale = view;
                that.update_xscale_domain();
                that.set_x_range([that.x_scale]);
                that.x_scale.on("domain_changed", that.update_xscale_domain, that);
                return view;
            }));
        }
        if(this.model.get("y_scale")) {
            scale_promises.push(this.create_child_view(this.model.get("y_scale")).then(function(view) {
                that.y_scale = view;
                that.update_yscale_domain();
                that.set_y_range([that.y_scale]);
                that.y_scale.on("domain_changed", that.update_yscale_domain, that);
                return view;
            }));
        }

        return Promise.all(scale_promises);
    }

    set_x_range(array) {
        for(let iter = 0; iter < array.length; iter++) {
            array[iter].set_range(this.parent.range("x"));
        }
    }

    set_y_range(array) {
        for(var iter = 0; iter < array.length; iter++) {
            array[iter].set_range(this.parent.range("y"));
        }
    }

    update_xscale_domain() {
        // When the domain of the scale is updated, the domain of the scale
        // for the selector must be expanded to account for the padding.
        const initial_range = this.parent.padded_range("x", this.x_scale.model);
        const target_range = this.parent.range("x");
        this.x_scale.expand_domain(initial_range, target_range);
    }

    update_yscale_domain() {
        // When the domain of the scale is updated, the domain of the scale
        // for the selector must be expanded to account for the padding.
        const initial_range = this.parent.padded_range("y", this.y_scale.model);
        const target_range = this.parent.range("y");
        this.y_scale.expand_domain(initial_range, target_range);
    }

    x_scale: any
    y_scale: any;
}
