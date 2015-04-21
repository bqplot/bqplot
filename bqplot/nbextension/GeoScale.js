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

define(["widgets/js/widget", "./d3"], function(Widget, d3) {
     "use strict";

    var GeoScale = Widget.WidgetView.extend({
        render: function() {
            this.set_projection();
            this.listenTo(this.model, "attribute_changed", this.scale_changed);
        },
        set_projection: function() {
            this.scale = d3.geo.path().projection(this.model.projection);
        }
    });

    var Mercator = GeoScale.extend({
        scale_changed: function() {
            this.set_projection();
            this.trigger("domain_changed", null);
        }
    });

    /*var Albers = GeoScale.extend({
        render: function() {
            this.create_projection();
            this.set_projection();
            this.model.on_some_change(['rotate', 'center', 'parallels', 'scale', 'precision'], this.scale_changed, this);
        },
        create_projection: function() {
            this.projection = d3.geo.albers()
                .rotate(this.model.get("rotate"))
                .center(this.model.get("center"))
                .parallels(this.model.get("parallels"))
                .scale(this.model.get("scale"))
                .precision(this.model.get("precision"));
        },
        scale_changed: function() {
            this.create_projection();
            this.set_projection();
            this.trigger("domain_changed", null);
        }
    });

    var AlbersUSA = GeoScale.extend({
        render: function() {
            this.create_projection();
            this.set_projection();
            this.model.on_some_change(['scale'], this.scale_changed, this);
        },
        create_projection: function() {
            this.projection = d3.geo.albersUsa()
                .scale(this.model.get("scale"));
        },
        scale_changed: function() {
            this.create_projection();
            this.set_projection();
            this.trigger("domain_changed", null);
        }
    });

    var EquiRectangular = GeoScale.extend({
        render: function() {
            this.create_projection();
            this.set_projection();
            this.model.on_some_change(['scale', 'center'], this.scale_changed, this);
        },
        create_projection: function() {
            this.projection = d3.geo.equirectangular()
                .scale(this.model.get("scale"))
                .center(this.model.get("center"));
        },
        scale_changed: function() {
            this.create_projection();
            this.set_projection();
            this.trigger("domain_changed", null);
        }
    });

    var Gnomonic = GeoScale.extend({
        render: function() {
            var projection = d3.geo.gnomonic()
                .clipAngle(90 - 1e-3)
                .scale(150)
                //.translate([width / 2, height / 2])
                .precision(0.1);
            this.set_projection(projection);
        },
    });

    var Stereographic = GeoScale.extend({
        render: function() {
            var projection = d3.geo.stereographic()
                .scale(245)
                //.translate([width / 2, height / 2])
                .rotate([-20, 0])
                .clipAngle(180 - 1e-4)
                //.clipExtent([[0, 0], [width, height]])
                .precision(0.1);
            this.set_projection(projection);
        },
    });*/

    return {
        Mercator: Mercator,
        /*Albers: Albers,
        AlbersUSA: AlbersUSA,
        EquiRectangular: EquiRectangular,
        Gnomonic: Gnomonic,
        Stereographic: Stereographic,*/
    };
});
