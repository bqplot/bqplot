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
            this.on_some_change(["x", "y", "color"], this.update_data, this);
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
                var num_rows = this.rows.length;
                var num_cols = this.columns.length;
            var data_indices = _.range(num_rows * num_cols);

            this.mark_data = data_indices.map(function(index) {
                var row_num = Math.floor(index / num_rows);
                var col_num = index % num_rows;

                return {
                    row_num : row_num,
                    col_num : col_num,
                    row : that.rows[row_num],
                    column : that.columns[col_num],
                    data : that.colors[row_num][col_num],
                }
            });
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
                        return elem.data;
                    }), this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
        },
        get_data_dict: function(data, index) {
            return data;
        },
    });

    return {
        GridHeatMapModel: GridHeatMapModel,
    };
});
