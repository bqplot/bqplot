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

var d3 = require("d3");
var _ = require("underscore");
var markmodel = require("./MarkModel");

var GraphModel = markmodel.MarkModel.extend({
    defaults: function() {
        return _.extend({}, markmodel.MarkModel.prototype.defaults, {
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
        });
    },

    initialize: function() {
        GraphModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["x", "y", "color", "link_color",
                             "node_data", "link_data", "link_color", ],
                            this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
    },

    update_node_data: function() {
        var node_data = this.get("node_data"),
            x = this.get_typed_field("x"),
            y = this.get_typed_field("y"),
            color = this.get_typed_field("color"),

            scales = this.get("scales"),
            x_scale = scales.x,
            y_scale = scales.y,
            color_scale = scales.color;

        function get_shape_attrs(shape, attrs) {
            var new_attrs = {};
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
        var that = this;
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
    },

    update_link_data: function() {
        var link_color_scale = this.get("scales").link_color;
        this.link_data = this.get("link_data");
        var link_matrix = this.get_typed_field("link_matrix");
        var link_color = this.get_typed_field("link_color");
        var that = this;

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
    },

    update_data: function() {
        this.dirty = true;
        this.update_node_data();
        this.update_link_data();
        this.update_unique_ids();
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    },

    update_unique_ids: function() {},

    get_data_dict: function(data, index) {
        return data;
    },

    update_domains: function() {
        var data_scale_key_map = {x: 'xval', y: 'yval'};

        if (!this.mark_data) {
            return;
        }

        var scales = this.get("scales");
        for (var key in scales) {
            if (scales.hasOwnProperty(key)) {
                var scale = scales[key];
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
});

module.exports = {
    GraphModel: GraphModel
};
