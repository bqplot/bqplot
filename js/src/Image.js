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

define(["d3", "topojson", "./Figure", "jupyter-js-widgets", "./Mark", "underscore"],
       function(d3, topojson, FigureViewModule, widgets, Mark, _) {
    "use strict";

    var Image = Mark.Mark.extend({

        render: function() {
            var base_render_promise = Image.__super__.render.apply(this);
            this.map = this.el.append("svg")
                .attr("viewBox", "0 0 1200 980");
            this.width = this.parent.plotarea_width;
            this.height = this.parent.plotarea_height;
            this.map_id = widgets.uuid();
            this.display_el_classes = ["event_layer"];
            var that = this;
            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.draw();
            });
        },

        set_ranges: function() {
        },

        draw: function() {
            this.set_ranges();
        },

    });

    return {
        Image: Image,
    };
});
