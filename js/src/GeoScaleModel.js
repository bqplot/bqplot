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

var d3 = require("d3");
var _ = require("underscore");
var scalemodel = require("./ScaleModel");

var GeoScaleModel = scalemodel.ScaleModel.extend({

    defaults: function() {
        return _.extend(scalemodel.ScaleModel.prototype.defaults(), {
            _model_name: "GeoScaleModel",
            _view_name: "GeoScale"
        });
    }
});

var MercatorModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "MercatorModel",
            _view_name: "Mercator",
            scale_factor: 190.0,
            center: [0, 60],
            rotate: [0, 0]
        });
    },

    initialize: function() {
        MercatorModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "center", "rotate"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.mercator()
            .center(this.get("center"))
            .scale(this.get("scale_factor"))
            .rotate(this.get("rotate"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var AlbersModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "AlbersModel",
            _view_name: "Albers",
            scale_factor: 250.0,
            /*rotate: [96, 0],*/
            center: [0, 60],
            parallels: [29.5, 45.5],
            precision: 0.1
        });
    },

    initialize: function() {
        AlbersModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["rotate", "center", "parallels", "scale_factor", "precision"],
            this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.albers()
            .rotate(this.get("rotate"))
            .center(this.get("center"))
            .parallels(this.get("parallels"))
            .scale(this.get("scale_factor"))
            .precision(this.get("precision"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var AlbersUSAModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "AlbersUSAModel",
            _view_name: "AlbersUSA",
            scale_factor: 1200,
            translate: [600, 490]  // center of the SVG viewbox (see Map.js)
        });
    },

    initialize: function() {
        AlbersUSAModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "translate"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.albersUsa()
            .scale(this.get("scale_factor"))
            .translate(this.get("translate"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var EquiRectangularModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "EquiRectangularModel",
            _view_name: "EquiRectangular",
            scale_factor: 145.0
        });
    },

    initialize: function() {
        EquiRectangularModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "center"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.equirectangular()
            .center(this.get("center"))
            .scale(this.get("scale_factor"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var OrthographicModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "OrthographicModel",
            _view_name: "Orthographic",
            scale_factor: 145.0,
            center: [0, 60],
            rotate: [0, 0],
            clip_angle: 90.0,
            precision: 0.1
        });
    },

    initialize: function() {
        OrthographicModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "center", "clip_angle", "rotate", "precision"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.orthographic()
            .center(this.get("center"))
            .scale(this.get("scale_factor"))
            .clipAngle(this.get("clip_angle"))
            .rotate(this.get("rotate"))
            .precision(this.get("precision"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var GnomonicModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "GnomonicModel",
            _view_name: "Gnomonic",
            scale_factor: 145.0,
           center: [0, 60],
           precision: 0.1,
           clip_angle: 89.999
        });
    },

    initialize: function() {
        GnomonicModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "precision", "clip_angle"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.gnomonic()
            .clipAngle(this.get("clip_angle"))
            .scale(this.get("scale_factor"))
            .precision(this.get("precision"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

var StereographicModel = GeoScaleModel.extend({

    defaults: function() {
        return _.extend(GeoScaleModel.prototype.defaults(), {
            _model_name: "StereographicModel",
            _view_name: "StereographicModel",
            scale_factor: 245,
            center: [0, 60],
            precision: 0.1,
            rotate: [96, 0],
            clip_angle: 179.9999
        });
    },

    initialize: function() {
        StereographicModel.__super__.initialize.apply(this, arguments);
        this.on_some_change(["scale_factor", "center", "clip_angle", "rotate", "precision"], this.create_projection, this);
        this.create_projection();
    },

    create_projection: function() {
        this.projection = d3.geo.stereographic()
            .scale(this.get("scale_factor"))
            .rotate(this.get("rotate"))
            .clipAngle(this.get("clip_angle"))
            .center(this.get("center"))
            .precision(this.get("precision"));
        this.attribute_changed();
    },

    attribute_changed: function() {
        this.trigger("attribute_changed");
    }
});

module.exports = {
    GeoScaleModel: GeoScaleModel,
    MercatorModel: MercatorModel,
    AlbersModel: AlbersModel,
    AlbersUSAModel: AlbersUSAModel,
    EquiRectangularModel: EquiRectangularModel,
    OrthographicModel: OrthographicModel,
    GnomonicModel: GnomonicModel,
    StereographicModel: StereographicModel
};
