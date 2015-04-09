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

define(["widgets/js/widget", "./BaseModel", "base/js/utils"], function(Widget, BaseModel, utils) {
    "use strict";

    var MapModel = BaseModel.BaseModel.extend({
        initialize: function() {
            MapModel.__super__.initialize.apply(this);
            this.on("change:color", this.update_data, this);
        },
        update_data: function() {
            this.dirty = true;
            var that = this;
            var data = utils.load_class.apply(this, this.get('map_data'));
            data.then(function(mapdata) {
                that.geodata = mapdata[0];
                that.subunits = mapdata[1];
                that.update_domains();
                that.dirty = false;
                that.trigger("data_updated");
            });
        },
        update_domains: function() {
            var scales = this.get("scales");
            var color_scale = scales["color"];
            var color_data = this.get("color");
            if(color_scale !== null && color_scale !== undefined) {
                if(!this.get("preserve_domain")["color"]) {
                    color_scale.compute_and_set_domain(
                        Object.keys(color_data).map(function (d) {
                            return color_data[d];
                        }), this.id);
                } else {
                    color_scale.del_domain([], this.id);
                }
            }
        },
    }, {
        serializers: _.extend({
            scales:  {deserialize: Widget.unpack_models},
            tooltip_widget:  {deserialize: Widget.unpack_models},
        }, BaseModel.BaseModel.serializers),
    });

    return {
        MapModel: MapModel,
    };
});
