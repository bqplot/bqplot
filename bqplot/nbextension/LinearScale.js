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

define(["./d3", "./Scale"], function(d3, ScaleViewModule) {
    "use strict";

    var LinearScale = ScaleViewModule.Scale.extend({
        render: function(){
            this.scale = d3.scale.linear();
            if(this.model.domain.length > 0)
                this.scale.domain(this.model.domain);
            this.offset = 0;
            this.create_event_listeners();
        },
        expand_domain: function(old_range, new_range) {
            // If you have a current range and then a new range and want to
            // expand the domain to expand to the new range but keep it
            // consistent with the previous one, this is the function you use.

            // The following code is required to make a copy of the actual
            // state of the scale. Referring to the model domain and then
            // setting the range to be the old range in case it is not.
            var unpadded_scale = this.scale.copy();

            // To handle the case for a clamped scale for which we have to
            // expand the domain, the copy should be unclamped.
            unpadded_scale.clamp(false);
            unpadded_scale.domain(this.model.domain);
            unpadded_scale.range(old_range);
            this.scale.domain(new_range.map(function(limit) {
                return unpadded_scale.invert(limit);
            }));
        },
        invert: function(pixel) {
            return this.scale.invert(pixel);
        },
        invert_range: function(pixels) {
            //Pixels is a non-decreasing array of pixel values
            var self = this;
            return pixels.map(function(pix) { return self.invert(pix); });
        },
    });

    return {
        LinearScale: LinearScale,
    };
});
