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
var linearscalemodel = require("./LinearScaleModel");

var LogScaleModel = linearscalemodel.LinearScaleModel.extend({

    defaults: function() {
        return _.extend(linearscalemodel.LinearScaleModel.prototype.defaults(), {
            _model_name: "LogScaleModel",
            _view_name: "LogScale",
            domain: []
        });
    },

    initialize: function() {
        LogScaleModel.__super__.initialize.apply(this, arguments);
    },

    set_init_state: function() {
        this.type = "log";
        this.global_min = Number.MIN_VALUE;
        this.global_max = Number.POSITIVE_INFINITY;
    }

});

module.exports = {
    LogScaleModel: LogScaleModel
};
