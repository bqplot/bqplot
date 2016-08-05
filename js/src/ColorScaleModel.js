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
var linearscalemodel = require("./LinearScaleModel");

var ColorScaleModel = linearscalemodel.LinearScaleModel.extend({

    initialize: function() {
        ColorScaleModel.__super__.initialize.apply(this, arguments);
    },

    set_init_state: function() {
        this.type = "color_linear";
        this.divergent = false;
    },

    set_listeners: function() {
        ColorScaleModel.__super__.set_listeners.apply(this, arguments);
        this.on("change:mid", this.mid_changed, this);
        this.mid_changed();
    },

    mid_changed: function() {
        this.mid = this.get("mid");
        this.update_domain();
    },

    update_domain: function() {
        var that = this;
        var max_index = (this.divergent) ? 2 : 1;
        var min = (!this.min_from_data) ?
            this.min : d3.min(_.map(this.domains, function(d) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
        var max = (!this.max_from_data) ?
            this.max : d3.max(_.map(this.domains, function(d) {
                return d.length > max_index ?
                    d[max_index] : (d.length) > 1 ? d[1] : that.global_min;
            }));
        var prev_domain = this.domain;
        if(min != prev_domain[0] || max != prev_domain[max_index]) {
            if(this.divergent) {
                var mid = (this.mid === undefined || this.mid === null) ?
                    (min + max) / 2 : this.mid;
                this.domain = (this.reverse) ?
                    [max, mid, min] : [min, mid, max];
            } else {
                this.domain = (this.reverse) ?
                    [max, min] : [min, max];
            }
            this.trigger("domain_changed", this.domain);
        }
    }
});

module.exports = {
    ColorScaleModel: ColorScaleModel
};
