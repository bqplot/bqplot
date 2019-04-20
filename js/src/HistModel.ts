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
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"), require("d3-scale-chromatic"));
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class HistModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "HistModel",
            _view_name: "Hist",
            sample: [],
            count: [],
            scales_metadata: {
                sample: { orientation: "horizontal", dimension: "x" },
                count: { orientation: "vertical", dimension: "y" }
            },
            bins: 10,
            midpoints: [],
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            stroke: null,
            opacities: [],
            normalized: false
        };
    }

    initialize(attributes, options) {
        // TODO: should not need to set this.data
        super.initialize(attributes, options);
        this.mark_data = [];
        // For the histogram, changing the "sample" scale changes the "count" values being plotted.
        // Hence, on change of the value of "preserve_domain", we must call the "update_data"
        // function, and not merely "update_domains".
        this.on_some_change(["bins", "sample", "preserve_domain"], this.update_data, this);
        this.update_data();
        this.on("change:normalized", function() { this.normalize_data(true); }, this);
        this.normalize_data(true);
    }

    update_data() {
        let x_data = this.get("sample");
        const scales = this.get("scales");
        const x_scale = scales.sample;

        // TODO: This potentially triggers domain_changed and therefore a
        // Draw, while update_data is generally followed by a Draw.
        this.num_bins = this.get("bins");
        if (x_data.length == 0) {
            this.mark_data = [];
            this.x_mid = [];
            this.count = [];
            this.x_bins = [];
        } else {
            if(!this.get("preserve_domain").sample) {
                x_scale.compute_and_set_domain(x_data, this.model_id + "_sample");
            } else {
                x_scale.del_domain([], this.model_id + "_sample");
            }

            this.min_x = x_scale.domain[0];
            this.max_x = x_scale.domain[1];

            const that = this;
            x_data = x_data.filter(function(d) {
                return (d <= that.max_x && d >= that.min_x);
            });
            // since x_data may be a TypedArray, explicitly use Array.map
            const x_data_ind =  Array.prototype.map.call(x_data, function (d,i) {
                return {index: i, value: d};
            });

            this.x_bins =  this.create_uniform_bins(this.min_x, this.max_x, this.num_bins);
            this.x_mid = this.x_bins.map(function(d, i) {
                return 0.5 * (d + that.x_bins[i - 1]);
            }).slice(1);

            this.mark_data = d3.histogram().thresholds(this.x_bins).value(function(d: any) {
                return d.value;
            })(x_data_ind);
            //adding index attribute to mark_data of the model
            this.mark_data.forEach(function(data, index) { data.index = index; });
        }
        this.normalize_data(false);

        this.set("midpoints", this.x_mid);
        this.set("count", new Float64Array(this.count));

        this.update_domains();
        this.save_changes();
        this.trigger("data_updated");
    }

    normalize_data(save_and_update) {


        this.count = this.mark_data.map(function(d) { return d.length; });
        if (this.get("normalized")) {
            let x_width = 1;
            if(this.mark_data.length > 0) {
                x_width = this.mark_data[0].x1 - this.mark_data[0].x0;
            }

            const sum = this.count.reduce(function(a, b) { return a + b; }, 0);
            if (sum != 0) {
                this.count = this.count.map(function(a) { return a / (sum * x_width); });
            }
        }

        const that = this;
        this.mark_data.forEach(function(el, it) { el['y'] = that.count[it]; });

        if (save_and_update) {
            this.set("count", new Float64Array(this.count));
            this.update_domains();
            this.save_changes();
            this.trigger("data_updated");
        }
    }

    get_data_dict(data, index) {
        const return_dict : any = {};
        return_dict.midpoint = this.x_mid[index];
        return_dict.bin_start = this.x_bins[index];
        return_dict.bin_end = this.x_bins[index + 1];
        return_dict.index = index;
        return_dict.count = this.count[index];
        return return_dict;
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        // For histogram, changing the x-scale domain changes a lot of
        // things including the data which is to be plotted. So the x-domain
        // change is handled by the update_data function and only the
        // y-domain change is handled by this function.
        const y_scale = this.get("scales").count;
        if(!this.get("preserve_domain").count) {
            y_scale.set_domain([0, d3.max(this.mark_data, function(d: any): number {
                return d.y;
            }) * 1.05], this.model_id + "_count");
        }
    }

    create_uniform_bins(min_val, max_val, num_bins) {
        const diff = max_val - min_val;
        const step_size = (diff) / num_bins;
        const return_val = [];
        for(let i=0; i<num_bins; i++) {
            return_val[i] = min_val+ i * step_size;
        }
        return_val[num_bins] = max_val;
        return return_val;
    }

    static serializers = {
        ...MarkModel.serializers,
        sample: serialize.array_or_json,
        count: serialize.array_or_json
    };

    num_bins: number;
    x_bins: Array<any>;
    x_mid: Array<any>;
    count: Array<number>;
    min_x: number;
    max_x: number;
}
