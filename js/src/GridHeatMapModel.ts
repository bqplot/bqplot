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

import * as _ from 'underscore';
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class GridHeatMapModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "GridHeatMapModel",
            _view_name: "GridHeatMap",
            row: null,
            column: null,
            color: null,
            scales_metadata: {
                row: { orientation: "vertical", dimension: "y" },
                column: { orientation: "horizontal", dimension: "x" },
                color: { dimension: "color" }
            },
            row_align: "start",
            column_align: "start",
            null_color: "black",
            stroke: "black",
            opacity: 1.0,
            anchor_style: {},
            display_format: null,
            font_style: {},
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["row", "column", "color"], this.update_data, this);
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
        this.colors = this.get("color");

        const num_rows = this.colors.length;
        const num_cols = this.colors[0].length;

        this.rows = this.get("row") || _.range(num_rows);
        this.columns = this.get("column") || _.range(num_cols);

        const flat_colors = [].concat.apply([], this.colors.map((x) => Array.prototype.slice.call(x, 0)));

        this.mark_data = flat_colors.map((data, index) => {
            const row_num = Math.floor(index / num_cols);
            const col_num = index % num_cols;

            return {
                row_num : row_num,
                row : this.rows[row_num],
                column : this.columns[col_num],
                column_num : col_num,
                color : data,
                _cell_num : index,
            };
        });
        this.identify_modes();
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const y_scale = scales.row, x_scale = scales.column;
        const color_scale = scales.color;

        if(!this.get("preserve_domain").row) {
            y_scale.compute_and_set_domain(this.rows, this.model_id + "_row");
        } else {
            y_scale.del_domain([], this.model_id + "_row");
        }

        if(!this.get("preserve_domain").column) {
            x_scale.compute_and_set_domain(this.columns, this.model_id + "_column");
        } else {
            x_scale.del_domain([], this.model_id + "_column");
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

    identify_modes() {
        //based on the data, identify the mode in which the heatmap should
        //be plotted.
        const modes : any = {};
        const scales = this.get("scales");
        const row_scale = scales.row;
        const column_scale = scales.column;
        const data_nrow = this.colors.length;
        const data_ncol = this.colors[0].length;

        if(row_scale.type === "ordinal") {
            modes.row = "middle";
        } else {
            if(data_nrow === this.rows.length - 1) {
                modes.row = "boundaries";
            } else if(data_nrow === this.rows.length) {
                modes.row = "expand_one";
            } else if(data_nrow === this.rows.length + 1) {
                modes.row = "expand_two";
            }
        }
        if(column_scale.type === "ordinal") {
            modes.column = "middle";
        } else {
            if(data_ncol === this.columns.length - 1) {
                modes.column = "boundaries";
            } else if(data_ncol === this.columns.length) {
                modes.column = "expand_one";
            } else if(data_ncol === this.columns.length + 1) {
                modes.column = "expand_two";
            }
        }
        this.modes = modes;
    }

    static serializers = {
        ...MarkModel.serializers,
        row: serialize.array_or_json,
        column: serialize.array_or_json,
        color: serialize.array_or_json
    };

    colors: any;
    rows: any;
    columns: any;
    modes: any;
}
