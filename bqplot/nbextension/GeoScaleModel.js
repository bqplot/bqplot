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
    });

    var MercatorModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale', 'center', 'rotate'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.mercator()
                .center(this.get("center"))
                .scale(this.get("scale"))
                .rotate(this.get("rotate"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var AlbersModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['rotate', 'center', 'parallels', 'scale', 'precision'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.albers()
                .rotate(this.get("rotate"))
                .center(this.get("center"))
                .parallels(this.get("parallels"))
                .scale(this.get("scale"))
                .precision(this.get("precision"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var AlbersUSAModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.albersUsa()
                .scale(this.get("scale"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var EquiRectangularModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale', 'center'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.equirectangular()
                .center(this.get("center"))
                .scale(this.get("scale"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var OrthographicModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale', 'center', 'clip_angle', 'rotate', 'precision'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.orthographic()
                .center(this.get("center"))
                .scale(this.get("scale"))
                .clipAngle(this.get("clip_angle"))
                .rotate(this.get("rotate"))
                .precision(this.get("precision"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var GnomonicModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['scale', 'precision', 'clip_angle'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.gnomonic()
                .clipAngle(this.get("clip_angle"))
                .scale(this.get("scale"))
                .precision(this.get("precision"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    var StereographicModel = GeoScaleModel.extend({
        initialize: function(range) {
            this.on_some_change(['rotate', 'scale', 'center', 'precision', 'clip_angle'], this.create_projection, this);
        },
        create_projection: function() {
            this.projection = d3.geo.stereographic()
                .scale(this.get("scale"))
                .rotate(this.get("rotate"))
                .clipAngle(this.get("clip_angle"))
                .center(this.get("center"))
                .precision(this.get("precision"));
            this.scale_changed();
        },
        scale_changed: function() {
            this.trigger("attribute_changed");
        }
    });

    return {
        GeoScaleModel: GeoScaleModel,
        MercatorModel: MercatorModel,
        AlbersModel: AlbersModel,
        AlbersUSAModel: AlbersUSAModel,
        EquiRectangularModel: EquiRectangularModel,
        OrthographicModel: OrthographicModel,
        GnomonicModel: GnomonicModel,
        StereographicModel: StereographicModel,
    };
});
