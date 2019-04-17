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

import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-geo"));
import { ScaleModel } from './ScaleModel';

export class GeoScaleModel extends ScaleModel {

    defaults() {
        return {...ScaleModel.prototype.defaults(),
            _model_name: "GeoScaleModel",
            _view_name: "GeoScale"
        };
    }

    compute_and_set_domain(data_array, id) {
    }
    
    update_domain() {
    }

    projection: any;
}

export class MercatorModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "MercatorModel",
            _view_name: "Mercator",
            scale_factor: 190.0,
            center: [0, 60],
            rotate: [0, 0]
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "center", "rotate"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoMercator()
            .center(this.get("center"))
            .scale(this.get("scale_factor"))
            .rotate(this.get("rotate"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class AlbersModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "AlbersModel",
            _view_name: "Albers",
            scale_factor: 250.0,
            /*rotate: [96, 0],*/
            center: [0, 60],
            parallels: [29.5, 45.5],
            precision: 0.1
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["rotate", "center", "parallels", "scale_factor", "precision"],
            this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoAlbers()
            .rotate(this.get("rotate"))
            .center(this.get("center"))
            .parallels(this.get("parallels"))
            .scale(this.get("scale_factor"))
            .precision(this.get("precision"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class AlbersUSAModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "AlbersUSAModel",
            _view_name: "AlbersUSA",
            scale_factor: 1200,
            translate: [600, 490]  // center of the SVG viewbox (see Map.js)
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "translate"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoAlbersUsa()
            .scale(this.get("scale_factor"))
            .translate(this.get("translate"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class EquiRectangularModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "EquiRectangularModel",
            _view_name: "EquiRectangular",
            scale_factor: 145.0
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "center"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoEquirectangular()
            .center(this.get("center"))
            .scale(this.get("scale_factor"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class OrthographicModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "OrthographicModel",
            _view_name: "Orthographic",
            scale_factor: 145.0,
            center: [0, 60],
            rotate: [0, 0],
            clip_angle: 90.0,
            precision: 0.1
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "center", "clip_angle", "rotate", "precision"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoOrthographic()
            .center(this.get("center"))
            .scale(this.get("scale_factor"))
            .clipAngle(this.get("clip_angle"))
            .rotate(this.get("rotate"))
            .precision(this.get("precision"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class GnomonicModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "GnomonicModel",
            _view_name: "Gnomonic",
            scale_factor: 145.0,
           center: [0, 60],
           precision: 0.1,
           clip_angle: 89.999
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "precision", "clip_angle"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoGnomonic()
            .clipAngle(this.get("clip_angle"))
            .scale(this.get("scale_factor"))
            .precision(this.get("precision"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

export class StereographicModel extends GeoScaleModel {

    defaults() {
        return {...GeoScaleModel.prototype.defaults(),
            _model_name: "StereographicModel",
            _view_name: "StereographicModel",
            scale_factor: 245,
            center: [0, 60],
            precision: 0.1,
            rotate: [96, 0],
            clip_angle: 179.9999
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["scale_factor", "center", "clip_angle", "rotate", "precision"], this.create_projection, this);
        this.create_projection();
    }

    create_projection() {
        this.projection = d3.geoStereographic()
            .scale(this.get("scale_factor"))
            .rotate(this.get("rotate"))
            .clipAngle(this.get("clip_angle"))
            .center(this.get("center"))
            .precision(this.get("precision"));
        this.attribute_changed();
    }

    attribute_changed() {
        this.trigger("attribute_changed");
    }
}

