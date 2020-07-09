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

import * as _  from 'underscore';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"));
import { ScaleModel } from './ScaleModel';

export class LinearScaleModel extends ScaleModel {

    defaults() {
        return {...ScaleModel.prototype.defaults(),
            _model_name: "LinearScaleModel",
            _view_name: "LinearScale",
            min: null,
            max: null,
            min_range: 0.6,
            mid_range: 0.8
        };
    }

    set_init_state() {
        this.type = "linear";
        this.global_min = Number.NEGATIVE_INFINITY;
        this.global_max = Number.POSITIVE_INFINITY;
    }

    set_listeners() {
        this.on("change:reverse", this.reverse_changed, this);
        this.reverse_changed(undefined, undefined, undefined);
        this.on_some_change(["min", "max"], this.min_max_changed, this);
        this.min_max_changed();
        this.on_some_change(["min_range", "mid_range", "stabilized"], this.update_domain, this);
    }

    min_max_changed() {
        this.min = this.get("min");
        this.max = this.get("max");
        this.min_from_data = (this.min === null);
        this.max_from_data = (this.max === null);
        this.update_domain();
    }

    reverse_changed(model, value, options) {
        const prev_reverse = (model === undefined) ? false : model.previous("reverse");
        this.reverse = this.get("reverse");

        // the domain should be reversed only if the previous value of reverse
        // is different from the current value. During init, domain should be
        // reversed only if reverse is set to True.
        const reverse_domain = (prev_reverse + this.reverse) % 2;
        if(this.domain.length > 0 && reverse_domain === 1) {
            this.domain.reverse();
            this.trigger("domain_changed", this.domain);
        }
    }

    update_domain() {
        const that = this;
        const min = (!this.min_from_data) ?
            this.min : d3.min(_.map(this.domains, function(d: any[]) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
        const max = (!this.max_from_data) ?
            this.max : d3.max(_.map(this.domains, function(d: any[]) {
                return d.length > 1 ? d[1] : that.global_min;
            }));
        const mid = (min + max) * 0.5;
        const new_width = (max - min) * 0.5 / this.get("mid_range");
        const prev_domain = this.domain;
        const min_index = (this.reverse) ? 1 : 0;
        const prev_min = prev_domain[min_index];
        const prev_max = prev_domain[1 - min_index];
        const prev_mid = (prev_max + prev_min) * 0.5;
        const min_width = (prev_max - prev_min) * 0.5 * this.get("min_range");

        const stabilized = this.get("stabilized");

        // If the scale is stabilized, only update if the new min/max is without
        // a certain range, else update as soon as the new min/max is different.
        const update_domain = stabilized ?
            (!(min >= prev_min) || !(min <= prev_mid-min_width) ||
             !(max <= prev_max) || !(max >= prev_mid+min_width)) :
            (min !== prev_min || max !== prev_max);

        if (update_domain) {
            const new_min = stabilized ? mid - new_width : min;
            const new_max = stabilized ? mid + new_width : max;
            this.domain = (this.reverse) ? [new_max, new_min] : [new_min, new_max];
            this.trigger("domain_changed", this.domain);
        }
    }

    compute_and_set_domain(data_array, id) {
        // Takes an array and calculates the domain for the particular
        // view. If you have the domain already calculated on your side,
        // call set_domain function.
        if(!data_array || data_array.length === 0) {
           this.set_domain([], id);
           return;
        }
        const data = data_array[0] instanceof Array ?
            data_array : [data_array];
        const min = d3.min(data.map(function(d) { return d3.min(d); }));
        const max = d3.max(data.map(function(d) { return d3.max(d); }));
        this.set_domain([min, max], id);
    }

    type: string;
    min: number | Date;
    max: number | Date;
    min_from_data: boolean;
    max_from_data: boolean;
    global_min: number | Date;
    global_max: number | Date;
}
