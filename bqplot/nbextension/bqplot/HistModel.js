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
    var MarkModel = MarkModel[1]
    var HistModel = MarkModel.extend({
        initialize: function() {
            // TODO: should not need to set this.data
            HistModel.__super__.initialize.apply(this);
            this.mark_data = [];
            // For histogram, changing the x-scale changes the y-values being
            // plotted. Hence update_data is called on set_x_domain change but
            // on set_y_domain change, update_domains is called
            this.on_some_change(["bins", "x", "set_x_domain"], this.update_data, this);
            this.on("change:set_y_domain", this.update_domains, this);
        },
        update_data: function() {
	        var x_data = this.get_typed_field("x");
            var scales = this.get("scales");
            var x_scale = scales["x"];

            // TODO: This potentially triggers domain_changed and therefore a
            // Draw, while update_data is generally followed by a Draw.

            if(this.get("set_x_domain")) {
                x_scale.compute_and_set_domain(x_data, this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            this.min_x = x_scale.domain[0];
            this.max_x = x_scale.domain[1];

            var that = this;
            x_data = x_data.filter(function(d){ return (d <= that.max_x && d >= that.min_x); });
            x_data_ind = x_data.map(function (d,i) { return {index: i, value: d}; });

            this.num_bins = this.get("bins");
	        this.x_bins =  this.create_uniform_bins(this.min_x, this.max_x, this.num_bins);
            this.x_mid = this.x_bins.map(function(d, i) { return 0.5 * (d + that.x_bins[i - 1]); }).slice(1);
            this.mark_data = d3.layout.histogram().bins(this.x_bins).value(function(d){ return d['value']; })(x_data_ind);

            this.counts = this.mark_data.map(function(d) { return d.length; });
            this.set("midpoints", this.x_mid);
            this.set("counts", this.counts);

            this.update_domains();
            this.save_changes();
            this.trigger("data_updated");
        },
        update_domains: function() {
            // For histogram, changing the x-scale domain changes a lot of
            // things including the data which is to be plotted. So the x-domain
            // change is handled by the update_data function and only the
            // y-domain change is handled by this function.
            var y_scale = this.get("scales")["y"];
            if(this.get("set_y_domain")) {
                y_scale.set_domain([0, d3.max(this.mark_data, function(d){return d.y}) * 1.05], this.id);
            }
        },
        create_uniform_bins: function(min_val, max_val, num_bins) {
            var diff = max_val - min_val;
            var step_size = (diff) / num_bins;
            var return_val = new Array();
            for(i=0; i<num_bins; i++) {
                return_val[i] = min_val+ i*step_size;
            }
            return_val[num_bins] = max_val;
            return return_val;
        },
    });
    WidgetManager.WidgetManager.register_widget_model("bqplot.HistModel", HistModel);
    return [HistModel];
});
