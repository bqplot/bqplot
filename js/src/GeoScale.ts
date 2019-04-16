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

var d3 = Object.assign({}, require("d3-geo"));
import * as widgets from '@jupyter-widgets/base';

export const GeoScale = widgets.WidgetView.extend({

    render: function() {
        this.set_projection();
        this.listenTo(this.model, "attribute_changed", this.reset_scale);
    },

    set_projection: function() {
        this.path = d3.geoPath().projection(this.model.projection);
        this.scale = this.model.projection;
    },

    reset_scale: function() {
        this.set_projection();
        this.trigger("domain_changed", null);
    }
});

export const Mercator = GeoScale.extend({
});

export const Albers = GeoScale.extend({
});

export const AlbersUSA = GeoScale.extend({
});

export const EquiRectangular = GeoScale.extend({
});

export const Orthographic = GeoScale.extend({
});

export const Gnomonic = GeoScale.extend({
});

export const Stereographic = GeoScale.extend({
});

