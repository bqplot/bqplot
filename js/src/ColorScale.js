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

var _ = require("underscore");
var scale = require("./Scale");

var ColorScale = scale.Scale.extend({

    render: function(){
        this.create_d3_scale()
        if(this.model.domain.length > 0) {
            this.scale.domain(this.model.domain);
        }
        this.offset = 0;
        this.create_event_listeners();
        this.set_range();
    },

    create_d3_scale: function(){
        this.scale = d3.scale.linear();
    },

    create_event_listeners: function() {
        ColorScale.__super__.create_event_listeners.apply(this);
        this.listenTo(this.model, "colors_changed", this.set_range, this);
    },

    set_range: function() {
        this.scale.range(this.model.color_range);
        this.trigger("color_scale_range_changed");
    },
});

module.exports = {
    ColorScale: ColorScale,
};
