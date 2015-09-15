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

define(["./components/d3/d3", "./Scale"], function(d3, ScaleViewModule) {
    "use strict";

    var OrdinalScale = ScaleViewModule.Scale.extend({
        render: function(){
            this.scale = d3.scale.ordinal();
            //forcefully setting the domain
            this.model.domain_changed();
            this.scale.domain(this.model.domain);
            this.offset = 0;
            this.create_event_listeners();
        },
        set_range: function(range, padding) {
           padding = (padding === undefined) ? 0 : padding;
           this.scale.rangeBands(range, padding, padding / 2.0);
           this.offset = this.scale.rangeBand() / 2.0;
        },
        expand_domain: function(old_range, new_range) {
            // If you have a current range and then a new range and want to
            // expand the domain to expand to the new range but keep it
            // consistent with the previous one, this is the function you use.

            // I am trying to expand the ordinal scale by setting an
            // appropriate value for the outer padding of the ordinal scale so
            // that the starting point of each of the bins match. once that
            // happens, the labels are placed at the center of the bins

            var unpadded_scale = this.scale.copy();
            unpadded_scale.rangeBands(old_range);
            var outer_padding = (unpadded_scale.range().length > 0) ?
                Math.abs((new_range[1] - old_range[1]) / unpadded_scale.rangeBand()) : 0;
            this.scale.rangeBands(new_range, 0.0, outer_padding);
        },
        invert: function(pixel) {
            // returns the element in the domain which is closest to pixel
            // value passed. If the pixel is outside the range of the scale,
            var self = this;
            var domain = this.scale.domain();
            var pixel_vals = domain.map(function(d) { return self.scale(d) + self.scale.rangeBand() / 2; });
            var abs_diff = pixel_vals.map(function(d) { return Math.abs(pixel - d); });
            return domain[abs_diff.indexOf(d3.min(abs_diff))];
        },
        invert_range: function(pixels) {
            //return all the indices between a range
            //pixels should be a non-decreasing two element array
            var self = this;
            var domain = this.scale.domain();
            var pixel_vals = domain.map(function(d) { return self.scale(d) + self.scale.rangeBand() / 2; });
            var indices = _.range(pixel_vals.length);
            var filtered_ind = indices.filter(function(ind) { return (pixel_vals[ind] >= pixels[0] &&
                                                                      pixel_vals[ind] <= pixels[1]);});
            return filtered_ind.map(function(ind) { return domain[ind]; });
        },
    });

    return {
        OrdinalScale: OrdinalScale,
    };
});
