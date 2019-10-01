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
// var d3 =Object.assign({}, require("d3-array"));
import * as _ from 'underscore';
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class OHLCModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "OHLCModel",
            _view_name: "OHLC",

            x: [],
            y: [],
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" }
            },
            marker: 'candle',
            stroke: null,
            stroke_width: 1.0,
            colors: ['green', 'red'],
            opacities: [],
            format: 'ohlc',
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["x", "y"], this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.on("change:format", this.update_format, this);
        this.px = { o: -1, h: -1, l: -1, c: -1 };
        this.mark_data = [];
        this.display_el_classes = ["stick_body"] ;
        this.update_data();
        this.update_domains();
        this.update_format();
    }

    update_format() {
        this.update_data();
        this.trigger("format_updated");
    }

    update_data() {
        let x_data = this.get("x");
        let y_data = this.get("y");
        const format = this.get("format");

        // Local private function to report errors in format
        function print_bad_format(format) {
            if(console) {
                console.error("Invalid OHLC format: '" + format + "'");
            }
        }

        // Generate positional map and check for duplicate characters
        this.px = format.toLowerCase().split("")
            .reduce(function(dict, key, val) {
                if(dict[key] !== -1) {
                    print_bad_format(format);
                    x_data = [];
                    y_data = [];
                }
                dict[key] = val;
                return dict;
            }, { o: -1, h: -1, l: -1, c: -1 });

        // We cannot have high without low and vice versa
        if((this.px.h !== -1 && this.px.l === -1) ||
           (this.px.h === -1 && this.px.l !== -1) ||
            format.length < 2 || format.length > 4)
        {
            print_bad_format(format);
            x_data = [];
            y_data = [];
        } else {
            // Verify that OHLC data is valid
            const px = this.px;
            if((this.px.h !== -1 &&
               !y_data.every(function(d) {
                return (d[px.h] === d3.max(d) &&
                        d[px.l] === d3.min(d)); })) || !y_data.every(function(d) {
                return d.length === format.length; }))
            {
                x_data = [];
                y_data = [];
                if(console) console.error("Invalid OHLC data");
            }
        }

        // Make x and y data the same length
        if(x_data.length > y_data.length) {
            x_data = x_data.slice(0, y_data.length);
        } else if(x_data.length < y_data.length) {
            y_data = y_data.slice(0, x_data.length);
        }

        this.mark_data = _.zip(x_data, y_data);
        this.mark_data.forEach(function(elem, i) { elem.index = i;});
        this.update_domains();
        this.trigger("data_updated");
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const x_scale = scales.x, y_scale = scales.y;
        let min_x_dist = Number.POSITIVE_INFINITY;
        let max_y_height = 0;
        let dist = 0;
        let height = 0;

        /*
         * Compute the minimum x distance between the data points. We will
         * use this to pad either side of the x domain.
         * Also compute the maximum height of all of the marks (i.e. maximum
         * distance from high to low) and use that to pad the y domain.
         */
        for(let i = 0; i < this.mark_data.length; i++) {
            if(i > 0) {
                dist = this.mark_data[i][0] - this.mark_data[i-1][0];
                if(dist < min_x_dist) min_x_dist = dist;
            }
            height = this.mark_data[i][this.px.h] -
                        this.mark_data[i][this.px.l];
            if(height > max_y_height) max_y_height = height;
        }
        if(this.mark_data.length < 2) {
            min_x_dist = 0;
        }

        let min;
        let max;
        // X Scale
        if((!this.get("preserve_domain").x) && this.mark_data.length !== 0) {
            if(x_scale.type === "ordinal") {
                x_scale.compute_and_set_domain(
                    this.mark_data.map(function(d) { return d[0]; })
                );
            } else {
                min = d3.min(this.mark_data.map(function(d) {
                    return d[0];
                }));
                max = d3.max(this.mark_data.map(function(d) {
                    return d[0];
                }));
                if(max instanceof Date) max = max.getTime();
                x_scale.set_domain([min - min_x_dist/2, max + min_x_dist/2], this.model_id + "_x");
            }
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        // Y Scale
        if((!this.get("preserve_domain").y) && this.mark_data.length !== 0) {
            // Remember that elem contains OHLC data here so we cannot use
            // compute_and_set_domain
            let top = this.px.h;
            let bottom = this.px.l;
            if(top === -1 || bottom === -1) {
                top = this.px.o;
                bottom = this.px.c;
            }
            min = d3.min(this.mark_data.map(function(d) {
                return (d[1][bottom] < d[1][top]) ? d[1][bottom] : d[1][top];
            }));
            max = d3.max(this.mark_data.map(function(d) {
                return (d[1][top] > d[1][bottom]) ? d[1][top] : d[1][bottom];
            }));
            if(max instanceof  Date) max = max.getTime();
            y_scale.set_domain([min - max_y_height, max + max_y_height], this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }
    }

    get_data_dict(data, index) {
        const that = this;
        const return_val = {
            index: index,
            x: data.x
        };
        ["open", "low", "high", "close"].forEach(function(str) {
            return_val[str] = data.y[that.px[str.substr(0, 1)]];
        });
        return return_val;
    }
    static serializers = {
        ...MarkModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json
    }

    px: any;
}
