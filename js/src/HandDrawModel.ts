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

import * as widgets from '@jupyter-widgets/base';
import { BaseModel } from './BaseModel';
import { semver_range } from './version';

export class HandDrawModel extends BaseModel {

    defaults() {
        return {...BaseModel.prototype.defaults(),
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
        };
    }

    static serializers = {
        ...widgets.DOMWidgetModel.serializers,
        lines:  { deserialize: widgets.unpack_models }
    };
};
