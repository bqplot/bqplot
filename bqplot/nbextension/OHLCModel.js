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

define(["widgets/js/manager", "d3", "./MarkModel"], function(WidgetManager, d3, MarkModel) {
        var MarkModel = MarkModel[1];
        var OHLCModel = MarkModel.extend({
        initialize: function() {
            OHLCModel.__super__.initialize.apply(this);
            this.on_some_change(["x", "y"], this.update_data, this);
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.px = { open: 0, high: 1, low: 2, close: 3 };
        },
        update_data: function() {
            var x_data = this.get_typed_field("x");
            var y_data = this.get_typed_field("y");

            if(x_data.length > y_data.length) {
                x_data = x_data.slice(0, y_data.length);
            } else if(x_data.length < y_data.length) {
                y_data = y_data.slice(0, x_data.length);
            }

            // Verify that our OHLC data is valid
            for(var i = 0; i < y_data.length; i++) {
                if(y_data[i].length !== 4
                || y_data[i][this.px.high] < y_data[i][this.px.open]
                || y_data[i][this.px.high] < y_data[i][this.px.close]
                || y_data[i][this.px.low] > y_data[i][this.px.open]
                || y_data[i][this.px.low] > y_data[i][this.px.close])
                {
                    // Truncate and notify console of error in data
                    y_data = [];
                    x_data = [];
                    if(console) {
                        console.error("Invalid OHLC data at index " + i);
                    }
                }
            }
            this.mark_data = _.zip(x_data, y_data);

            this.update_domains();
            this.trigger("data_updated");
        },
        update_domains: function() {
            var that            = this;
            var scales          = this.get("scales");
            var x_scale         = scales["x"];
            var y_scale         = scales["y"];
            var min_x_dist      = Number.POSITIVE_INFINITY;
            var max_y_height    = 0;
            var dist = height   = 0;

            /*
             * Compute the minimum x distance between the data points. We will
             * use this to pad either side of the x domain.
             * Also compute the maximum height of all of the marks (i.e. maximum
             * distance from high to low) and use that to pad the y domain.
             */
            for(var i = 0; i < this.mark_data.length; i++) {
                if(i > 0) {
                    dist = this.mark_data[i][0] - this.mark_data[i-1][0];
                    if(dist < min_x_dist) min_x_dist = dist;
                }
                height = this.mark_data[i][this.px.high] -
                            this.mark_data[i][this.px.low];
                if(height > max_y_height) max_y_height = height;
            }
            if(min_x_dist === Number.POSITIVE_INFINITY) {
                min_x_dist = 0;
            }

            if(!this.get("preserve_domain")["x"]) {
                var min = d3.min(this.mark_data.map(function(d) {
                    return d[0];
                }));
                var max = d3.max(this.mark_data.map(function(d) {
                    return d[0];
                }));
                if(max instanceof Date) max = max.getTime();
                x_scale.set_domain([min - min_x_dist/2, max + min_x_dist/2], this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["y"]) {
                // Remember that elem contains OHLC data here so we cannot use
                // compute_and_set_domain
                var min = d3.min(this.mark_data.map(function(d) {
                    return d[1][that.px.low];
                }));
                var max = d3.max(this.mark_data.map(function(d) {
                    return d[1][that.px.high];
                }));
                if(max instanceof  Date) max = max.getTime();
                y_scale.set_domain([min - max_y_height, max + max_y_height], this.id);
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.OHLCModel", OHLCModel);
    return [OHLCModel];
});

