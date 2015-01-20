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
            this.on("change:marker", this.update_bounding_box, this);
	    },
        update_bounding_box: function(model, value) {

            //if(this.pad === undefined) this.pad = 0;
            var pad = 0;

        	this.x_padding = this.y_padding = pad;
	        this.trigger("mark_padding_updated");
        },
        update_data: function() {
            var that = this;

            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];

            this.x_data = this.get_typed_field("x");
            this.y_data = this.get_typed_field("y");

            if(this.x_data.length > this.y_data.length) {
                this.x_data = this.x_data.slice(0, this.y_data.length);
            }

            this.update_domains();
            this.min_x = x_scale.domain[0];
            this.max_x = x_scale.domain[1];
            this.trigger("data_updated");
        },
        update_domains: function() {
            var px = {
                op: 0,
                hi: 1,
                lo: 2,
                cl: 3
            };
            var scales = this.get("scales");
            var x_scale = scales["x"];
            var y_scale = scales["y"];
            var that = this;

            if(this.x_data.length == 0) {
                // Not sure what else to do here
                return;
            }

            if(!this.get("preserve_domain")["x"]) {
                x_scale.compute_and_set_domain(this.x_data, this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            if(!this.get("preserve_domain")["y"]) {
                // Remember that elem contains OHLC data here so we cannot use
                // compute_and_set_domain
                var min = d3.min(this.y_data.map(function(d) {
                    return d[px.lo];
                }));
                var max = d3.max(this.y_data.map(function(d) {
                    return d[px.hi];
                }));
                y_scale.set_domain([min,max], this.id);
            } else {
                y_scale.del_domain([], this.id);
            }
            this.update_bounding_box();
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.OHLCModel", OHLCModel);
    return [OHLCModel];
});

