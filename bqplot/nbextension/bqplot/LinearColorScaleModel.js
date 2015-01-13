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

define(["widgets/js/manager", "d3", "./LinearScaleModel"], function(WidgetManager, d3, LinearScaleModel) {
    var BaseScaleModel = LinearScaleModel[0];
    var LinearColorScaleModel = BaseScaleModel.extend({
        initialize: function(range) {
            LinearColorScaleModel.__super__.initialize.apply(this);
            this.type = "color_linear";
            this.scheme = "RdYlGn";
            this.divergent = false;
            this.on("change:mid", this.mid_changed, this);
        },
        mid_changed: function() {
            this.mid = this.get("mid");
            this.update_domain();
        },
        update_domain: function() {
            var that = this;
            var max_index = (this.divergent) ? 2 : 1;
            var min = (!this.min_from_data) ? this.min : d3.min(_.map(this.domains, function(d) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
            var max = (!this.max_from_data) ? this.max : d3.max(_.map(this.domains, function(d) {
                return d.length > max_index ? d[max_index] : (d.length) > 1 ? d[1] : that.global_min;
            }));
            var prev_domain = this.domain;
            if(min != prev_domain[0] || max != prev_domain[max_index]) {
                if(this.divergent) {
                    var mid = (this.mid === undefined) ? (min + max) / 2 : this.mid;
                    this.domain = (this.reverse) ? [max, mid, min] : [min, mid, max];
                } else {
                    this.domain = (this.reverse) ? [max, min] : [min, max];
                }
                this.trigger("domain_changed", [min, max]);
            }
        },
        compute_and_set_domain: function(data_array, id) {
            if(!this.min_from_data && !this.max_from_data) {
                return;
            }
            if(data_array.length === 0) {
               this.set_domain([0, 1], id);
               return;
            }
            var data = data_array[0] instanceof Array ? data_array : [data_array];
            var min = (!this.min_from_data) ? this.min : d3.min(data.map(function(d) {
                return d3.min(d);
            }));
            var max = (!this.max_from_data) ? this.max : d3.max(data.map(function(d) {
                return d3.max(d);
            }));
            this.set_domain([min, max], id);
        },
    });
    WidgetManager.WidgetManager.register_widget_model("LinearColorScaleModel", LinearColorScaleModel);
    return [LinearColorScaleModel];
});
