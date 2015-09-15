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

define(["widgets/js/widget", "./components/d3/d3"], function(Widget, d3) {
     "use strict";

    var GeoScale = Widget.WidgetView.extend({
        render: function() {
            this.set_projection();
            this.listenTo(this.model, "attribute_changed", this.reset_scale);
        },
        set_projection: function() {
            this.path = d3.geo.path().projection(this.model.projection);
            this.scale = this.model.projection;
        },
        reset_scale: function() {
            this.set_projection();
            this.trigger("domain_changed", null);
        }
    });

    var Mercator = GeoScale.extend({
    });

    var Albers = GeoScale.extend({
    });

    var AlbersUSA = GeoScale.extend({
    });

    var EquiRectangular = GeoScale.extend({
    });

    var Orthographic = GeoScale.extend({
    });

    var Gnomonic = GeoScale.extend({
    });

    var Stereographic = GeoScale.extend({
    });

    return {
        Mercator: Mercator,
        Albers: Albers,
        AlbersUSA: AlbersUSA,
        EquiRectangular: EquiRectangular,
        Orthographic: Orthographic,
        Gnomonic: Gnomonic,
        Stereographic: Stereographic,
    };
});
