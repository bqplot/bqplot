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

define(["./d3", "widgets/js/widget"], function(d3, Widget) {
    "use strict";

    var GeoScaleModel = Widget.WidgetModel.extend({
        initialize: function(range) {
        },
    });

    var MercatorModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale', 'center'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.mercator()
                .center(this.get("center"))
                .scale(this.get("scale"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    return {
        GeoScaleModel: GeoScaleModel,
        MercatorModel: MercatorModel,
    };
});
