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
        this.on_some_change(["x", "y", "color",
                             "link_matrix", "node_labels"],
                            this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
    },

    update_node_data: function() {
        var node_labels = this.get("node_labels"),
            x_data = this.get_typed_field("x"),
            y_data = this.get_typed_field("y"),
            color_data = this.get_typed_field("color")
            scales = this.get("scales"),
            x_scale = scales.x,
            y_scale = scales.y,
            color_scale = scales.color;

        if (x_data.length !== 0 && y_data.length !== 0) {
            if (color_scale) {
                if (!this.get("preserve_domain").color) {
                    color_scale.compute_and_set_domain(color_data,
                                                       this.id + "_color");
                } else {
                    color_scale.del_domain([], this.id + "_color");
                }
            }

            this.mark_data = node_labels.map(function(d, i) {
                return {
                    name: d,
                    x: x_data[i],
                    y: y_data[i],
                    color: color_data[i],
                    index: i
                };
            });
        } else {
            this.mark_data = node_labels.map(function(d, i) {
                return {
                    name: d,
                    index: i
                };
            });
        }
    },

    update_link_data: function() {
        var link_matrix = this.get_typed_field("link_matrix");
        //coerce link matrix into format understandable by d3 force layout
        this.link_data = [];
        var that = this;
        link_matrix.forEach(function(d, i) {
            d.forEach(function(e, j) {
                if (e !== null) {
                    that.link_data.push({source: i, target: j, value: e});
                }
            })
        });
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
        if (!this.mark_data) {
            return;
        }

        var scales = this.get("scales");
        for (var key in scales) {
            if (scales.hasOwnProperty(key) && key != "color") {
                var scale = scales[key];
                if (!this.get("preserve_domain")[key]) {
                    scale.compute_and_set_domain(this.mark_data.map(function(d)
                    {
                        return d[key];
                    }), this.id + key);
                } else {
                    scale.del_domain([], this.id + key);
                }
            }
       }
    }
});

module.exports = {
    GraphModel: GraphModel
};
