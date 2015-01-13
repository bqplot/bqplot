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

define(["widgets/js/manager", "d3", "./DateScaleModel"], function(WidgetManager, d3, DateScaleModel) {
    var BaseScaleModel = DateScaleModel[0];
    var DateColorScaleModel = BaseScaleModel.extend({
        initialize: function(range) {
            DateColorScaleModel.__super__.initialize.apply(this);
            this.type = "date_color_linear";
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

            var min = (!this.min_from_data) ? this.min : d3.min(
                _.map(this.domains, function(d) {
                    return d.length > 0 ? d[0] : that.global_max;
                })
            );

            var max = (!this.max_from_data) ? this.max : d3.max(
                _.map(this.domains, function(d) {
                    return d.length > max_index ? d[max_index] : d.length > 1 ? d[1] : that.global_min;
                })
            );
            var prev_domain = this.domain;
            if(min != prev_domain[0] || max != prev_domain[max_index]) {
                if(this.divergent) {
                    var mean = new Date();
                    mean.setTime(min.getTime() + Math.abs(max - min) / 2);
                    this.domain = (this.reverse) ? [max, mean, min] : [min, mean, max];
                } else {
                    this.domain = (this.reverse) ? [max, min] : [min, max];
                }
                this.trigger("domain_changed", this.domain);
            }
        },
        compute_and_set_domain: function(data_array, id) {
            if(!this.min_from_data && !this.max_from_data) {
                return;
            }
            if(data_array.length == 0) {
               this.set_domain([], id);
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
    WidgetManager.WidgetManager.register_widget_model("DateColorScaleModel", DateColorScaleModel);
    return [DateColorScaleModel];
});
