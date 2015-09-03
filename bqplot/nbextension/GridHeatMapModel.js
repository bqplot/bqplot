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

define(["./d3", "./MarkModel"], function(d3, MarkModelModule) {
    "use strict";

    var GridHeatMapModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            GridHeatMapModel.__super__.initialize.apply(this);
            this.on_some_change(["row", "column", "color"], this.update_data, this);
            // FIXME: replace this with on("change:preserve_domain"). It is not done here because
            // on_some_change depends on the GLOBAL backbone on("change") handler which
            // is called AFTER the specific handlers on("change:foobar") and we make that
            // assumption.
            this.on_some_change(["preserve_domain"], this.update_domains, this);
        },
        update_data: function() {
            this.dirty = true;
            // Handling data updates
            var that = this;
            this.colors = this.get_typed_field("color");
            this.rows = this.get_typed_field("row");
            this.columns = this.get_typed_field("column");

            var num_rows = this.colors.length;
            var num_cols = this.colors[0].length;
            var flat_colors = [];
            flat_colors = flat_colors.concat.apply(flat_colors, this.colors);

            this.mark_data = flat_colors.map(function(data, index) {
                var row_num = Math.floor(index / num_rows);
                var col_num = index % num_rows;

                return {
                    row_num : row_num,
                    column_num : col_num,
                    color : that.colors[row_num][col_num],
                    _cell_num : row_num * num_rows + col_num,
                }
            });
            this.identify_modes();
            this.update_domains();
            this.dirty = false;
            this.trigger("data_updated");
        },
        update_domains: function() {
            if(!this.mark_data) {
                return;
            }
            var scales = this.get("scales");
            var y_scale = scales["row"], x_scale = scales["column"];
            var color_scale = scales["color"];

            if(!this.get("preserve_domain")["row"]) {
                y_scale.compute_and_set_domain(this.rows, this.id);
            } else {
                y_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["column"]) {
                x_scale.compute_and_set_domain(this.columns, this.id);
            } else {
                x_scale.del_domain([], this.id);
            }
            if(color_scale !== null && color_scale !== undefined) {
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(this.mark_data.map(function(elem) {
                        return elem.color;
                    }), this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
        },
        get_data_dict: function(data, index) {
            return data;
        },
        identify_modes: function() {
            //based on the data, identify the mode in which the heatmap should
            //be plotted.
            var modes = {}
            var scales = this.get("scales");
            var row_scale = scales["row"];
            var column_scale = scales["column"];
            var data_nrow = this.colors.length;
            var data_ncol = this.colors[0].length;

            if(row_scale.type === "ordinal") {
                modes["row"] = "middle";
            } else {
                if(data_nrow === this.rows.length - 1) {
                    modes["row"] = "boundaries";
                } else if(data_nrow === this.rows.length) {
                    modes["row"] = "expand_one";
                } else if(data_nrow === this.rows.length + 1) {
                    modes["row"] = "expand_two";
                }
            }

            if(column_scale.type === "ordinal") {
                modes["column"] = "middle";
            } else {
                if(data_ncol === this.columns.length - 1) {
                    modes["column"] = "boundaries";
                } else if(data_ncol === this.columns.length) {
                    modes["column"] = "expand_one";
                } else if(data_ncol === this.columns.length + 1) {
                    modes["column"] = "expand_two";
                }
            }
            this.modes = modes;
        },
    });

    return {
        GridHeatMapModel: GridHeatMapModel,
    };
});
