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
// var d3 =Object.assign({}, require("d3-scale"), require("d3-scale-chromatic"));
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class PieModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "PieModel",
            _view_name: "Pie",

            sizes: [],
            color: null,
            x: 0.5,
            y: 0.5,
            scales_metadata: {
                color: { dimension: "color" }
            },
            sort: false,
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            stroke: null,
            opacities: [],
            radius: 180,
            inner_radius: 0.1,
            start_angle: 0.0,
            end_angle: 360.0,
            display_labels: 'inside',
            display_values: false,
            values_format: '.1f',
            label_color: null,
            font_size: '12px',
            font_weight: 'normal',
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on("change:sizes", this.update_data, this);
        this.on("change:color", function() {
            this.update_color();
            this.trigger("colors_updated");
        }, this);
        this.on("change:labels", this.update_labels, this);

        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
        this.update_color();
        this.update_labels();
        this.update_domains();
    }

    update_data() {
        const sizes = this.get("sizes");
        const color = this.get("color") || [];
        const labels = this.get("labels");
        this.mark_data = Array.prototype.map.call(sizes, function(d, i) {
            return {
                size: d,
                color: color[i],
                // jshint eqnull: true
                label: labels[i] == null ? "" : labels[i],
                index: i
            };
        });
        this.update_color();
        this.update_domains();
        this.trigger("data_updated");
    }

    update_labels() {
        if(!this.mark_data) {
            return;
        }
        const labels = this.get("labels");
        this.mark_data.forEach(function(data, index) {
            // jshint eqnull: true
            data.label = labels[index] == null ? "" : labels[index];
        });
        this.trigger("labels_updated");
    }

    update_color() {
        if(!this.mark_data) {
            return;
        }
        const color = this.get("color");
        const color_scale = this.get("scales").color;
        if(color_scale) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(color, this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const x_scale = scales.x;
        const y_scale = scales.y;

        if(x_scale) {
            const x = (x_scale.type === "date") ?
                this.get_date_elem("x") : this.get("x");
            if(!this.get("preserve_domain").x) {
                x_scale.compute_and_set_domain([x], this.model_id + "_x");
            } else {
                x_scale.del_domain([], this.model_id + "_x");
            }
        }
        if(y_scale) {
            if(!this.get("preserve_domain").y) {
                y_scale.compute_and_set_domain([this.get("y")], this.model_id + "_y");
            } else {
                y_scale.del_domain([], this.model_id + "_y");
            }
        }
    }

    get_data_dict(data, index) {
        return data.data;
    }

   static serializers =  {
        ...MarkModel.serializers,
        sizes: serialize.array_or_json,
        color: serialize.array_or_json
    }
}
