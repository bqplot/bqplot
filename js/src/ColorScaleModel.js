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
var colorutils = require("./ColorUtils");

var ColorScaleModel = linearscalemodel.LinearScaleModel.extend({

    // initialize: function() {
    //     ColorScaleModel.__super__.initialize.apply(this, arguments);
    // },

    set_init_state: function() {
        this.type = "color_linear";
        this.color_range = [];
        this.divergent = false;
    },

    set_listeners: function() {
        ColorScaleModel.__super__.set_listeners.apply(this, arguments);
        this.on_some_change(["colors", "scheme"], this.colors_changed, this);
        this.on("change:mid", this.mid_changed, this);
        this.colors_changed();
        this.mid_changed();
    },

    mid_changed: function() {
        this.mid = this.get("mid");
        // this.update_domain();
    },

    update_domain: function() {
        // Compute domain min and max
        var that = this;
        var min = (!this.min_from_data) ?
            this.min : d3.min(_.map(this.domains, function(d) {
                return d.length > 0 ? d[0] : that.global_max;
            }));
        var max = (!this.max_from_data) ?
            this.max : d3.max(_.map(this.domains, function(d) {
                return d.length > 0 ? d[d.length-1] : that.global_min;
            }));

        // Mid = this.get("mid") or min+max/2 if scheme.is_divergent

        // If the min/max has changed, or the number of colors has changed,
        // update the domain
        var prev_domain = this.domain;
        var prev_length = prev_domain.length;
        var n_colors = this.color_range.length;
        if(min != prev_domain[0] || max != prev_domain[prev_length-1] ||
           n_colors != prev_length) {
            // Domain ranges from min to max, with the same number of
            // elements as the color range
            var scale = d3.scale.linear()
                .domain([0, n_colors - 1])
                .range([min, max]);

            this.domain = [];
            for (i = 0; i < n_colors; i++) {
                var j = this.reverse ? n_colors-1-i : i;
                this.domain.push(scale(j));
            }
            this.trigger("domain_changed", this.domain);
        }
    },

    colors_changed: function() {
        var colors = this.get("colors");
        this.color_range = colors.length > 0 ? colors : 
            colorutils.get_linear_scale_range(this.get("scheme"));
        // If the number of colors has changed, the domain must be updated
        this.update_domain();
        // Update the range of the views. For a color scale the range doesn't depend
        // on the view, so ideally we could get rid of this
        this.trigger("colors_changed");
    }
});

module.exports = {
    ColorScaleModel: ColorScaleModel
};
