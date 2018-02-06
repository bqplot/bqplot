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
var colorscale = require("./ColorScaleModel");

var DateColorScaleModel = colorscale.ColorScaleModel.extend({

    defaults: function() {
        return _.extend(colorscale.ColorScaleModel.prototype.defaults(), {
            _model_name: "DateColorScaleModel",
            _view_name: "DateColorScale"
        });
    },

    set_init_state: function() {
        this.type = "date_color_linear";
        this.color_range = [];
        this.mid = null;
        this.global_min = (new Date()).setTime(0);
        this.global_max = new Date();
    },

    min_max_changed: function() {
        this.min = this.get_date_elem("min");
        this.max = this.get_date_elem("max");
        this.min_from_data = (this.min === null);
        this.max_from_data = (this.max === null);
        this.update_domain();
    }
});

module.exports = {
    DateColorScaleModel: DateColorScaleModel
};
