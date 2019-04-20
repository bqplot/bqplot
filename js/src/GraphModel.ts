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

import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class GraphModel extends MarkModel {
    defaults() {
        return { ...MarkModel.prototype.defaults(),
        _model_name: "GraphModel",
        _view_name: "Graph",

        x: [],
        y: [],
        color: null,
        hovered_point: null,
        scales_metadata: {
            x: { orientation: "horizontal", dimension: "x" },
            y: { orientation: "vertical", dimension: "y" },
            color: { dimension: "color" }
        },
        colors: [],
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["x", "y", "color", "link_color",
                             "node_data", "link_data", "link_color", ],
                            this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
    }

    update_node_data() {
        let node_data = this.get("node_data");
        const x = this.get("x");
        const y = this.get("y");
        const color = this.get("color") || [];

        const scales = this.get("scales");
        const color_scale = scales.color;

        function get_shape_attrs(shape, attrs) {
            const new_attrs: any = {};
            switch (shape) {
                case "circle":
                    new_attrs.r = attrs.r || 15;
                    break;
                case "rect":
                    new_attrs.width = attrs.width || 25;
                    new_attrs.height = attrs.height || new_attrs.width * 0.8;
                    new_attrs.rx = attrs.rx || 0;
                    new_attrs.ry = attrs.ry || 0;
                    break;
                case "ellipse":
                    new_attrs.rx = attrs.rx || 20;
                    new_attrs.ry = attrs.ry || new_attrs.rx * 0.6;
                    break;
                default:
                    console.log("Invalid shape passed - ", shape);
                }
            return new_attrs;
        }

        if (node_data.length > 0 && typeof node_data[0] === "string") {
            node_data = node_data.map(function(d) { return {label: d}; });
        }

        this.mark_data = [];
        const that = this;
        //populate mark data from node data with meaningful defaults filled in
        node_data.forEach(function(d, i) {
            d.label = d.label || "N" + i;
            d.label_display = d.label_display || "center";
            d.shape = d.shape || "circle";
            d.shape_attrs = get_shape_attrs(d.shape, d.shape_attrs || {});
            d.value = d.value || null;
            that.mark_data.push(d);
        });

        // also add x, y and color fields
        if (x.length !== 0 && y.length !== 0) {
            if (color_scale) {
                if (!this.get("preserve_domain").color) {
                    color_scale.compute_and_set_domain(color,
                                                       this.model_id + "_color");
                } else {
                    color_scale.del_domain([], this.model_id + "_color");
                }
            }

            this.mark_data.forEach(function(d, i) {
                d.xval = x[i];
                d.yval = y[i];
                d.color = color[i];
            });
        }
    }

    update_link_data() {
        const link_color_scale = this.get("scales").link_color;
        this.link_data = this.get("link_data");
        let link_matrix = this.get("link_matrix");
        const link_color = this.get("link_color");
        const that = this;

        if (link_color_scale !== undefined && link_color.length > 0) {
            link_matrix = link_color;
        }

        //coerce link matrix into format understandable by d3 force layout
        if (this.link_data.length === 0 && link_matrix.length > 0) {
            link_matrix.forEach(function(d, i) {
                d.forEach(function(e, j) {
                    if (e !== null) {
                        that.link_data.push({source: i, target: j, value: e});
                    }
                });
            });
        }
    }

    update_data() {
        this.dirty = true;
        this.update_node_data();
        this.update_link_data();
        this.update_unique_ids();
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_unique_ids() {}

    get_data_dict(data, index) {
        return data;
    }

    update_domains() {
        const data_scale_key_map = {x: 'xval', y: 'yval'};

        if (!this.mark_data) {
            return;
        }

        const scales = this.get("scales");
        for (let key in scales) {
            if (scales.hasOwnProperty(key)) {
                const scale = scales[key];
                if (!this.get("preserve_domain")[key]) {
                    scale.compute_and_set_domain(this.mark_data.map(function(d) {
                        return d[key] || d[data_scale_key_map[key]];
                    }), this.model_id + key);
                } else {
                    scale.del_domain([], this.model_id + key);
                }
            }
       }
    }

    static serializers = {
        ...MarkModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        color: serialize.array_or_json,
        link_color: serialize.array_or_json,
        link_matrix: serialize.array_or_json
    }

    link_data: any;
}
