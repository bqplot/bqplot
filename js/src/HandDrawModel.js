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

var widgets = require("@jupyter-widgets/base");
var _ = require("underscore");
var basemodel = require("./BaseModel");
var semver_range = "^" + require("../package.json").version;

var HandDrawModel = basemodel.BaseModel.extend({

	defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name: "HandDrawModel",
            _view_name: "HandDraw",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,

	        lines: null,
	        line_index: 0,
            min_x: null,
            max_x: null
        });
    }
}, {
    serializers: _.extend({
        lines:  { deserialize: widgets.unpack_models },
    }, basemodel.BaseModel.serializers)
});

module.exports = {
    HandDrawModel: HandDrawModel
};
