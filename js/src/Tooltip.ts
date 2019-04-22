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

import {DOMWidgetView} from '@jupyter-widgets/base';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-selection"), require("d3-format"), require("d3-time-format"));
import * as utils from './utils';
import * as _ from 'underscore';

export class Tooltip extends DOMWidgetView {
    initialize() {
        this.d3el = d3.select(this.el);
        super.initialize.apply(this, arguments);
    }

    render() {
        this.parent = this.options.parent;
        this.update_formats();
        this.create_listeners();
        this.create_table();
    }

    create_listeners() {
        this.listenTo(this.parent, "update_tooltip", this.update_tooltip);
        this.model.on_some_change(["fields", "show_labels", "labels"], this.create_table, this);
        this.listenTo(this.model, "change:formats", this.update_formats);
    }

    update_formats() {
        const fields = this.model.get("fields");
        const formats = this.model.get("formats");
        this.tooltip_formats = fields.map(function(field, index) {
            const fmt = formats[index];
            if(fmt === undefined || fmt === "") {
                return function(d) { return d; };
            } else {
                if(utils.is_valid_time_format(fmt)) {
                    return d3.timeFormat(fmt);
                }
                else {
                    return d3.format(fmt);
                }
            }
        });
    }

    update_tooltip(data) {
        //data is a dictionary passed by the parent along with the update_
        //tooltip event. Responsibility of the mark to pass the data
        const that = this;
        this.d3el.select("table")
            .selectAll("tr")
            .select(".datavalue")
            .text((datum: any, index) => that.tooltip_formats[index](data[datum]));
    }

    create_table() {
        const fields = this.model.get("fields");
        const labels = _.clone(this.model.get("labels"));
        for (let ind = labels.length; ind < fields.length; ind++) {
            labels[ind] = fields[ind];
        }

        this.d3el.select("table").remove();
        const tooltip_table = this.d3el.append("table")
            .selectAll("tr").data(fields);

        tooltip_table.exit().remove();
        const table_rows = tooltip_table.enter().append("tr")
                            .attr("class", "datarow");
        if(this.model.get("show_labels")) {
            table_rows.append("td")
                .text((datum, index) => labels[index])
                .attr("class", "tooltiptext datafield");
        }
        table_rows.append("td")
            .attr("class", "tooltiptext datavalue");
        this.update_formats();
    }

    d3el: d3.Selection<HTMLDivElement, any, any, any>;
    parent: DOMWidgetView;
    tooltip_formats: ((x: any) => string)[];
}
