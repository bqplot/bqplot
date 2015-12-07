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

define(["nbextensions/widgets/widgets/js/widget", "./BaseModel", "underscore"], function(Widget, BaseModel, _) {
    "use strict";

    var FigureModel = BaseModel.BaseModel.extend({
        save_png: function() {
            // TODO: Any view of this Figure model will pick up this event
            // and render a png. Remove this eventually.
            this.trigger("save_png");
        }
    }, {
        serializers: _.extend({
            marks: {deserialize: Widget.unpack_models},
            axes:  {deserialize: Widget.unpack_models},
            interaction: {deserialize: Widget.unpack_models},
            scale_x:  {deserialize: Widget.unpack_models},
            scale_y:  {deserialize: Widget.unpack_models},
        }, BaseModel.BaseModel.prototype.serializers),
    });

    return {
        FigureModel: FigureModel,
    };
});
