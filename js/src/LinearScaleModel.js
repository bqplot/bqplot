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

var d3 = require("d3");
var _ = require("underscore");
var scalemodel = require("./ScaleModel");

var LinearScaleModel = scalemodel.ScaleModel.extend({

    defaults: function() {
        return _.extend(scalemodel.ScaleModel.prototype.defaults(), {
            _model_name: "LinearScaleModel",
            _view_name: "LinearScale",
            min: null,
            max: null,
            min_range: 0.6,
            mid_range: 0.8
        });
    },

    initialize: function() {
        LinearScaleModel.__super__.initialize.apply(this, arguments);
    },

    set_init_state: function() {
        this.type = "linear";
        this.global_min = Number.NEGATIVE_INFINITY;
        this.global_max = Number.POSITIVE_INFINITY;
    },

    set_listeners: function() {
        this.on("change:reverse", this.reverse_changed, this);
        this.reverse_changed();
        this.on_some_change(["min", "max"], this.min_max_changed, this);
        this.min_max_changed();
        this.on_some_change(["min_range", "mid_range", "stabilized"], this.update_domain, this);
    },

    min_max_changed: function() {
        this.min = this.get("min");
        this.max = this.get("max");
        this.min_from_data = (this.min === null);
        this.max_from_data = (this.max === null);
        this.update_domain();
    },

    reverse_changed: function(model, value, options) {
        var prev_reverse = (model === undefined) ? false : model.previous("reverse");
        this.reverse = this.get("reverse");

        // the domain should be reversed only if the previous value of reverse
        // is different from the current value. During init, domain should be
        // reversed only if reverse is set to True.
        var reverse_domain = (prev_reverse + this.reverse) % 2;
        if(this.domain.length > 0 && reverse_domain === 1) {
            this.domain.reverse();
            this.trigger("domain_changed", this.domain);
        }
    },

    update_domain: function() {
        var that = this;
        var min = (!this.min_from_data) ?
            this.min : d3.min(_.map(this.domains, function(d) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
        var max = (!this.max_from_data) ?
            this.max : d3.max(_.map(this.domains, function(d) {
                return d.length > 1 ? d[1] : that.global_min;
            }));
        var mid = (min + max) * 0.5,
            new_width = (max - min) * 0.5 / this.get("mid_range");
            prev_domain = this.domain,
            min_index = (this.reverse) ? 1 : 0,
            prev_min = prev_domain[min_index],
            prev_max = prev_domain[1 - min_index],
            prev_mid = (prev_max + prev_min) * 0.5,
            min_width = (prev_max - prev_min) * 0.5 * this.get("min_range");

        var stabilized = this.get("stabilized");

        // If the scale is stabilized, only update if the new min/max is without
        // a certain range, else update as soon as the new min/max is different.
        var update_domain = stabilized ?
            (!(min >= prev_min) || !(min <= prev_mid-min_width) ||
             !(max <= prev_max) || !(max >= prev_mid+min_width)) :
            (min !== prev_min || max !== prev_max);

        if (update_domain) {
            var new_min = stabilized ? mid - new_width : min,
                new_max = stabilized ? mid + new_width : max;
            this.domain = (this.reverse) ? [new_max, new_min] : [new_min, new_max];
            this.trigger("domain_changed", this.domain);
        }
    },

    compute_and_set_domain: function(data_array, id) {
        // Takes an array and calculates the domain for the particular
        // view. If you have the domain already calculated on your side,
        // call set_domain function.
        if(data_array.length === 0) {
           this.set_domain([], id);
           return;
        }
        var data = data_array[0] instanceof Array ?
            data_array : [data_array];
        var min = d3.min(data.map(function(d) { return d3.min(d); }));
        var max = d3.max(data.map(function(d) { return d3.max(d); }));
        this.set_domain([min, max], id);
    }
});

module.exports = {
    LinearScaleModel: LinearScaleModel,
};
