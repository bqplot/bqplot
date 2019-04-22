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
// var d3 =Object.assign({}, require("d3-scale"), require("d3-scale-chromatic"), require("d3-array"));
import * as _ from 'underscore';
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';
import * as utils from './utils';

export class LinesModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "LinesModel",
            _view_name: "Lines",
            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            fill_colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            stroke_width: 2.0,
            labels_visibility: "none",
            curves_subset: [],
            line_style: "solid",
            interpolation: "linear",
            close_path: false,
            fill: "none",
            marker: null,
            marker_size: 64,
            opacities: [],
            fill_opacities: []
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["x", "y", "color"], this.update_data, this);
        this.on("change:labels", this.update_labels, this);
        // FIXME: replace this with on("change:preserve_domain"). It is not done here because
        // on_some_change depends on the GLOBAL backbone on("change") handler which
        // is called AFTER the specific handlers on("change:foobar") and we make that
        // assumption.
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
        this.update_domains();
    }

    update_data() {
        this.dirty = true;
        // Handling data updates
        const that = this;
        this.x_data = this.get("x");
        this.y_data = this.get("y");
        this.color_data = this.get("color") || [];

        let curve_labels = this.get("labels");
        if (this.x_data.length === 0 || this.y_data.length === 0) {
            this.mark_data = [];
        } else {
            this.x_data = utils.is_array(this.x_data[0]) ?
                this.x_data : [this.x_data];
            this.y_data = utils.is_array(this.y_data[0]) ?
                this.y_data : [this.y_data];
            curve_labels = this.get_labels();

            const y_length = this.y_data.length;

            if (this.x_data.length == 1 && y_length > 1) {
                // same x for all y
                this.mark_data = curve_labels.map(function(name, i) {
                    return {
                        name: name,
                        // since y_data may be a TypedArray, explicitly use Array.map
                        values: Array.prototype.map.call(that.y_data[i], function(d, j) {
                            return {x: that.x_data[0][j], y: d,
                                    y0: that.y_data[Math.min(i + 1, y_length - 1)][j],
                                    sub_index: j};
                        }),
                        color: that.color_data[i],
                        index: i,
                    };
                });
            } else {
                this.mark_data = curve_labels.map(function(name, i) {
                    const xy_data = d3.zip(that.x_data[i], that.y_data[i]);
                    return {
                        name: name,
                        values: xy_data.map(function(d, j) {
                            return {x: d[0], y: d[1],
                                    y0: that.y_data[Math.min(i + 1, y_length - 1)][j],
                                    sub_index: j};
                        }),
                        color: that.color_data[i],
                        index: i,
                    };
                });
            }
        }
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_labels() {
        // update the names in mark_data
        const labels = this.get_labels();
        this.mark_data.forEach(function(element, i) {
            element.name = labels[i];
        });
        this.trigger("labels_updated");
    }

    get_labels() {
        // Function to set the labels appropriately.
        // Setting the labels to the value sent and filling in the
        // remaining values.
        let curve_labels = this.get("labels");
        const data_length = (this.x_data.length == 1) ?
            (this.y_data.length) : Math.min(this.x_data.length, this.y_data.length);
        if(curve_labels.length > data_length) {
            curve_labels = curve_labels.slice(0, data_length);
        }
        else if(curve_labels.length < data_length) {
            _.range(curve_labels.length, data_length).forEach(function(index) {
                curve_labels[index] = "C" + (index+1);
            });
        }
        return curve_labels;
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const x_scale = scales.x, y_scale = scales.y;
        const color_scale = scales.color;

        if(!this.get("preserve_domain").x) {
            x_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                return elem.values.map(function(d) { return d.x; });
            }), this.model_id + "_x");
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            y_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                return elem.values.map(function(d) { return d.y; });
            }), this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }
        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.color;
                }), this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
    }

    get_data_dict(data, index) {
        return data;
    }

    static serializers = {
        ...MarkModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        color: serialize.array_or_json
    };

    x_data: any;
    y_data: any;
    color_data: any;
}

export class FlexLineModel extends LinesModel {

    defaults() {
        return {...LinesModel.prototype.defaults(),
            _model_name: "FlexLineModel",
            _view_name: "FlexLine",

            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            fill_colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            stroke_width: 2.0,
            labels_visibility: "none",
            curves_subset: [],
            line_style: "solid",
            interpolation: "linear",
            close_path: false,
            fill: "none",
            marker: null,
            marker_size: 64,
            opacities: [],
            fill_opacities: [],
        };
    }

    update_data() {
        this.dirty = true;
        // Handling data updates
        const that = this;
        this.x_data = this.get("x");
        this.y_data = this.get("y");

        let curve_labels = this.get("labels");
        if (this.x_data.length === 0 || this.y_data.length === 0) {
            this.mark_data = [];
            this.data_len = 0;
        } else {
            this.x_data = !_.isNumber(this.x_data[0]) ?
                this.x_data : [this.x_data];
            this.y_data = !_.isNumber(this.y_data[0]) ?
                this.y_data : [this.y_data];
            curve_labels = this.get_labels();
            const color_data = this.get("color") || [];
            const width_data = this.get("width") || [];
            this.data_len = Math.min(this.x_data[0].length, this.y_data[0].length);

            this.mark_data = [{
                name: curve_labels[0],
                values: _.range(this.data_len - 1).map(function(val, index) {
                    return {
                        x1: that.x_data[0][index],
                        y1: that.y_data[0][index],
                        x2: that.x_data[0][index + 1],
                        y2: that.y_data[0][index + 1],
                        color: color_data[index],
                        size: width_data[index]
                    };
                })
            }];
        }

        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const x_scale = scales.x, y_scale = scales.y;
        const color_scale = scales.color;
        const width_scale = scales.width;

        if(!this.get("preserve_domain").x) {
            x_scale.compute_and_set_domain(this.x_data[0].slice(0, this.data_len), this.model_id + "_x");
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            y_scale.compute_and_set_domain(this.y_data[0].slice(0, this.data_len), this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }

        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) {
                        return d.color;
                    });
                }), this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
        if(width_scale !== null && width_scale !== undefined) {
            if(!this.get("preserve_domain").width) {
                width_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                    return elem.values.map(function(d) {
                        return d.size;
                    });
                }), this.model_id + "_width");
            } else {
                width_scale.del_domain([], this.model_id + "_width");
            }
        }
    }

    data_len: any;
}

