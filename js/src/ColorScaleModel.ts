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

import * as _ from 'underscore';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"));
import { LinearScaleModel } from './LinearScaleModel';
import * as colorutils from './ColorUtils';

export class ColorScaleModel extends LinearScaleModel {

    defaults() {
        return {...LinearScaleModel.prototype.defaults(),
            _model_name: "ColorScaleModel",
            _view_name: "ColorScale",
            mid: null,
            scheme: 'RdYlGn',
            extrapolation: 'constant',
            colors: null,
        };
    }

    set_init_state() {
        this.type = "color_linear";
        this.color_range = [];
        this.mid = null;
    }

    set_listeners() {
        super.set_listeners();
        this.on_some_change(["colors", "scheme"], this.colors_changed, this);
        this.on("change:mid", this.update_domain, this);
        this.colors_changed();
    }

    update_domain() {
        // Compute domain min and max
        const that = this;
        const min = (!this.min_from_data) ?
            this.min : d3.min(_.map(this.domains, function(d: any[]) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
        const max = (!this.max_from_data) ?
            this.max : d3.max(_.map(this.domains, function(d: any []) {
                return d.length > 0 ? d[d.length-1] : that.global_min;
            }));
        const prev_mid = this.mid;
        this.mid = this.get("mid");

        // If the min/mid/max has changed, or the number of colors has changed,
        // update the domain
        const prev_domain = this.domain;
        const prev_length = prev_domain.length;
        const n_colors = this.color_range.length;

        if(min != prev_domain[0] || max != prev_domain[prev_length-1] ||
           n_colors != prev_length || this.mid != prev_mid) {

            this.domain = this.create_domain(min, this.mid, max, n_colors);
            this.trigger("domain_changed", this.domain);
        }
    }

    create_domain(min, mid, max, n_colors) {
        // Domain ranges from min to max, with the same number of
        // elements as the color range
        const scale = d3.scaleLinear()

        if (mid === undefined || mid === null){
            scale.domain([0, n_colors - 1]).range([min, max]);
        } else {
            const mid_index = n_colors / 2;
            scale.domain([0, mid_index, n_colors - 1]).range([min, mid, max]);
        }

        const domain = [];
        for (let i = 0; i < n_colors; i++) {
            const j = this.reverse ? n_colors-1-i : i;
            domain.push(this.toDomainType(scale(j)));
        }
        return domain;
    }

    colors_changed() {
        const colors = this.get("colors");
        this.color_range = colors.length > 0 ? colors :
            colorutils.get_linear_scale_range(this.get("scheme"));
        // If the number of colors has changed, the domain must be updated
        this.update_domain();
        // Update the range of the views. For a color scale the range doesn't depend
        // on the view, so ideally we could get rid of this
        this.trigger("colors_changed");
    }

    protected toDomainType(value: number) : any {
        return value;
    }

    color_range: Array<number>;
    mid: number;
    reverse: boolean;
}
