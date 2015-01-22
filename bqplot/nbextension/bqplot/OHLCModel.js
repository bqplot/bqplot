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
            this.px = { op: 0, hi: 1, lo: 2, cl: 3 };
	    },
        update_bounding_box: function(model, value) {
            // TODO: Actually add some padding.
            var pad = 0;
            this.x_padding = this.y_padding = pad;
            this.trigger("mark_padding_updated");
        },
        update_data: function() {
            var x_data = this.get_typed_field("x");
            var y_data = this.get_typed_field("y");

            if(x_data.length > y_data.length) {
                x_data = x_data.slice(0, y_data.length);
            } else if(x_data.length < y_data.length) {
                y_data = y_data.slice(0, x_data.length);
            }
            this.xy_data = _.zip(x_data, y_data);

            this.update_domains();
            this.trigger("data_updated");
        },
        update_domains: function() {
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];
            var that = this;

            if(!this.get("preserve_domain")["x"]) {
                x_scale.compute_and_set_domain(this.xy_data.map(function(xy) {
                    return xy[0];
                }), this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            this.min_x = x_scale.domain[0];
            this.max_x = x_scale.domain[1];

            if(!this.get("preserve_domain")["y"]) {
                // Remember that elem contains OHLC data here so we cannot use
                // compute_and_set_domain
                var min = d3.min(this.xy_data.map(function(d) {
                    return d[1][that.px.lo];
                }));
                var max = d3.max(this.xy_data.map(function(d) {
                    return d[1][that.px.hi];
                }));
                y_scale.set_domain([min,max], this.id);
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.OHLCModel", OHLCModel);
    return [OHLCModel];
});

