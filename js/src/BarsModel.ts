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
// import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"), require("d3-scale-chromatic"));
import * as _ from 'underscore';
import * as markmodel from './MarkModel';
import * as serialize from './serialize';

export class BarsModel extends markmodel.MarkModel {

    defaults() {
        return {...markmodel.MarkModel.prototype.defaults(),
            _model_name: "BarsModel",
            _view_name: "Bars",
            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            color_mode: "auto",
            type: "stacked",
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            padding: 0.05,
            stroke: null,
            base: 0.0,
            opacities: [],
            orientation: "vertical",
            align: "center"
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.is_y_2d = false;
        this.on_some_change(["x", "y", "base"], this.update_data, this);
        this.on("change:color", function() {
            this.update_color();
            this.trigger("colors_updated");
        }, this);
        // FIXME: replace this with on("change:preserve_domain"). It is not done here because
        // on_some_change depends on the GLOBAL backbone on("change") handler which
        // is called AFTER the specific handlers on("change:foobar") and we make that
        // assumption.
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
        this.update_color();
        this.update_domains();
    }

    update_data() {
        let x_data = this.get("x");
        let y_data = this.get("y");
        y_data = (y_data.length === 0 || !_.isNumber(y_data[0])) ?
            y_data : [y_data];
        const that = this;

        this.base_value = this.get("base");
        if(this.base_value === undefined || this.base_value === null) {
            this.base_value = 0;
        }

        if (x_data.length === 0 || y_data.length === 0) {
            this.mark_data = [];
            this.is_y_2d = false;
        }
        else {
            x_data = x_data.slice(0, d3.min(y_data.map(function(d) {
                return d.length;
            })));
            // since x_data may be a TypedArray, explicitly use Array.map
            this.mark_data = Array.prototype.map.call(x_data, function (x_elem, index) {
                const data: any = {};
                let y0 = that.base_value;
                let y0_neg = that.base_value;
                let y0_left = that.base_value;
                data.key = x_elem;
                // since y_data may be a TypedArray, explicitly use Array.map
                data.values = Array.prototype.map.call(y_data, function(y_elem, y_index) {
                    const value = y_elem[index] - that.base_value;
                    const positive = (value >= 0);
                    return {
                        index: index,
                        sub_index: y_index,
                        x: x_elem,
                        // In the following code, the values y0, y1 are
                        // only relevant for a stacked bar chart. grouped
                        // bars only deal with base_value and y.

                        // y0 is the value on the y scale for the upper end
                        // of the bar.
                        y0: (positive) ? y0 : (function() {
                            y0_left += value;
                            return y0_left
                        }()),
                        // y1 is the value on the y scale for the lower end
                        // of the bar.
                        y1: (positive) ? (y0 += value) : (function() {
                            y0_neg += value;
                            return (y0_neg - value);
                        }()),
                        // y_ref is the value on the y scale which represents
                        // the height of the bar
                        y_ref: value,
                        y: y_elem[index],
                    };
                });
                // pos_max is the maximum positive value for a group of
                // bars.
                data.pos_max = y0;
                // neg_max is the minimum negative value for a group of
                // bars.
                data.neg_max = y0_neg;
                return data;
            });
            this.is_y_2d = (this.mark_data[0].values.length > 1);
            this.update_color();
        }
        this.update_domains();
        this.trigger("data_updated");
    }

    get_data_dict(data, index) {
        return data;
    }

    update_color() {
        //Function to update the color attribute for the data. In scatter,
        //this is taken care of by the update_data itself. This is separate
        //in bars because update data does a lot more complex calculations
        //which should be avoided when possible
        if(!this.mark_data) {
            return;
        }
        const color = this.get("color") || [];
        const color_scale = this.get("scales").color;
        const color_mode = this.get("color_mode");
        const apply_color_to_groups = ((color_mode === "group") ||
                                     (color_mode === "auto" && !(this.is_y_2d)));
        this.mark_data.forEach(function(single_bar_d, bar_grp_index) {
            single_bar_d.values.forEach(function(bar_d, bar_index) {
                bar_d.color_index = (apply_color_to_groups) ? bar_grp_index : bar_index;
                bar_d.color = color[bar_d.color_index];
            });
        });
        if(color_scale && color.length > 0) {
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
        const dom_scale = scales.x;
        const range_scale = scales.y;

        if(!this.get("preserve_domain").x) {
            dom_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                return elem.key;
            }), this.model_id + "_x");
        }
        else {
            dom_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            if(this.get("type") === "stacked") {
                range_scale.compute_and_set_domain([d3.min(this.mark_data, function(c: any) { return c.neg_max; }),
                                                d3.max(this.mark_data, function(c: any) { return c.pos_max; }), this.base_value],
                                                this.model_id + "_y");
            } else {
                const min = d3.min(this.mark_data,
                    function(c: any) {
                        return d3.min(c.values, function(val: any) {
                            return val.y_ref;
                        });
                    });
                const max = d3.max(this.mark_data, function(c: any) {
                    return d3.max(c.values, function(val: any) {
                        return val.y_ref;
                    });
                });
                range_scale.compute_and_set_domain([min, max, this.base_value], this.model_id + "_y");
            }
        } else {
            range_scale.del_domain([], this.model_id + "_y");
        }
    }

    static serializers = {
        ...markmodel.MarkModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        color: serialize.array_or_json
    };

    is_y_2d: boolean;
    base_value: number;
}
