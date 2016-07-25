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
var markmodel = require("./MarkModel");

var LabelModel = markmodel.MarkModel.extend({

    defaults: _.extend({}, markmodel.MarkModel.prototype.defaults, {
        _model_name: "LabelModel",
        _view_name: "Label",

        x: 0.0,
        y: 0.0,
        x_offset: 0,
        y_offset: 0,
        scales_metadata: {
            x: { orientation: "horizontal", dimension: "x" },
            y: { orientation: "vertical", dimension: "y" },
            color: { dimension: "color" }
        },
        color: null,
        rotate_angle: 0.0,
        text: "",
        font_size: "14px",
        font_weight: "bold",
        align: "start"
    })
});

module.exports = {
    LabelModel: LabelModel
};
