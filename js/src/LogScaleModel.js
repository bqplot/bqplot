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
var linearscalemodel = require("./LinearScaleModel");

var LogScaleModel = linearscalemodel.LinearScaleModel.extend({

    initialize: function() {
        LogScaleModel.__super__.initialize.apply(this, arguments);
        this.type = "log";
        this.global_min = Number.MIN_VALUE;
        this.global_max = Number.POSITIVE_INFINITY;
        this.on_some_change(["min", "max"], this.min_max_changed, this);
        this.on("change:reverse", this.reverse_changed, this);
        this.min_max_changed();
        this.reverse_changed();
    }
});

module.exports = {
    LogScaleModel: LogScaleModel
};
