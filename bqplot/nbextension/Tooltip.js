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

define(["widgets/js/widget", "./components/d3/d3", "base/js/utils", "./components/require-less/less!./bqplot"], function(Widget, d3, utils) {
    "use strict";

    var Tooltip = Widget.DOMWidgetView.extend({
        render: function() {
            // var base_creation_promise = Tooltip.__super__.render.apply(this);
            this.setElement(document.createElement("div"));
            this.d3_el = d3.select(this.el);
            this.parent = this.options.parent;
            this.update_formats();
            this.create_listeners();
            this.create_table();
        },
        create_listeners: function() {
            this.listenTo(this.parent, "update_tooltip", this.update_tooltip);
            this.model.on_some_change(["fields", "show_labels", "labels"], this.create_table, this);
            this.listenTo(this.model, "change:formats", this.update_formats);
        },
        update_formats: function() {
            var fields = this.model.get("fields");
            var formats = this.model.get("formats");
            this.tooltip_formats = fields.map(function(field, index) {
                var fmt = formats[index];
                if(fmt === undefined || fmt === "") {return function(d) { return d; }; }
                else return d3.format(fmt);
            });
        },
        update_tooltip: function(data) {
            //data is a dictionary passed by the parent along with the update_
            //tooltip event. Responsibility of the mark to pass the data
            var self = this;
            this.d3_el.select("table")
                .selectAll("tr")
                .select(".datavalue")
                .text(function(datum, index) { return self.tooltip_formats[index](data[datum]);});
        },
        create_table: function() {
            var fields = this.model.get("fields");
            var labels = this.model.get("labels");
            var ind = labels.length;
            for (; ind < fields.length; ind++) {
                labels[ind] = fields[ind];
            }
            var self = this;

            this.d3_el.select("table").remove();
            var tooltip_table = this.d3_el.append("table")
                .selectAll("tr").data(fields);

            tooltip_table.exit().remove();
            var table_rows = tooltip_table.enter().append("tr")
                                .attr("class", "datarow");
            if(this.model.get("show_labels")) {
                table_rows.append("td")
                    .text(function(datum, index) { return labels[index];})
                    .attr("class", "tooltiptext datafield");
            }
            table_rows.append("td")
                .attr("class", "tooltiptext datavalue");
            this.update_formats();
        },
        remove: function() {
            this.model.off(null, null, this);
            this.d3_el.remove();
            Tooltip.__super__.remove.apply(this);
        },
    });
    return {
        Tooltip: Tooltip,
    };
});
