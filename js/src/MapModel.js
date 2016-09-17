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
var markmodel = require("./MarkModel");

var MapModel = markmodel.MarkModel.extend({

    defaults: _.extend({}, markmodel.MarkModel.prototype.defaults, {
        _model_name: "MapModel",
        _view_name: "Map",

        color: {},
        hover_highlight: true,
        hovered_styles: {
            hovered_fill: "Orange",
            hovered_stroke: null,
            hovered_stroke_width: 2.0
        },

        stroke_color: null,
        default_color: null,
        scales_metadata: {
            color: { dimension: "color" },
            projection: { dimension: "geo" }
        },
        selected: [],
        selected_styles: {
            selected_fill: "Red",
            selected_stroke: null,
            selected_stroke_width: 2.0
        },
        map_data: undefined
    }),

    initialize: function() {
        MapModel.__super__.initialize.apply(this, arguments);
        this.on("change:map_data", this.update_data, this);
        this.on("change:color", this.color_data_updated, this);
        this.update_data();
        this.update_domains();
    },

    update_data: function() {
        this.dirty = true;
        var mapdata = this.get("map_data");
        this.geodata = mapdata[0];
        this.subunits = mapdata[1];
        this.color_data_updated();
        this.dirty = false;
        this.trigger("data_updated");
    },

    color_data_updated: function() {
        var that = this;
        this.update_domains();
        this.geodata.objects.subunits.geometries.map(function (d) {
            if (!d.properties) {
                d.properties = {'color': that.color_data[d.id]};
            } else {
                d.properties.color = that.color_data[d.id];
            }
        });
    },

    update_domains: function() {
        var scales = this.get("scales");
        var that = this;
        var color_scale = scales.color;
        this.color_data = this.get("color");
        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(
                    Object.keys(this.color_data).map(function (d) {
                        return that.color_data[d];
                    }), this.id + "_color");
            } else {
                color_scale.del_domain([], this.id + "_color");
            }
        }
    },

    get_subunit_name: function(id) {
        for(var i = 0; i< this.subunits.length; i++) {
            if(id == this.subunits[i].id){
                name = this.subunits[i].Name;
            }
        }
        return name;
    },

    get_data_dict: function(data, index) {
        return {
            id: data.id,
            name: this.get_subunit_name(data.id),
            color: data.properties.color
        };
    }
});

module.exports = {
    MapModel: MapModel
};
