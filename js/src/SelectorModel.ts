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

import { unpack_models } from '@jupyter-widgets/base';
import { BaseModel } from './BaseModel';
import { semver_range } from './version';
import * as serialize from './serialize';

export class SelectorModel extends BaseModel {

    defaults() {
        return {...BaseModel.prototype.defaults(),
            _model_name: "SelectorModel",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            marks: []
        };
    }

    static serializers = {
        ...BaseModel.serializers,
        marks: { deserialize: unpack_models }
    }
}

export class OneDSelectorModel extends SelectorModel {

    defaults() {
        return {...SelectorModel.prototype.defaults(),
            _model_name: "OneDSelectorModel",
            scale: null
        };
    }

    static serializers = {
        ...SelectorModel.serializers,
        scale: { deserialize: unpack_models }
    }
}

export class TwoDSelectorModel extends SelectorModel {

    defaults() {
        return {...SelectorModel.prototype.defaults(),
            _model_name: "TwoDSelectorModel",
            x_scale: null,
            y_scale: null
        }
    }

    static serializers = {...SelectorModel.serializers,
        x_scale: { deserialize: unpack_models },
        y_scale: { deserialize: unpack_models },
    }
}

export class FastIntervalSelectorModel extends OneDSelectorModel {

    defaults() {
        return {...OneDSelectorModel.prototype.defaults(),
            _model_name: "FastIntervalSelectorModel",
            _view_name: "FastIntervalSelector",
            selected: null,
            color: null,
            size: null
        };
    }
    static serializers = {...OneDSelectorModel.serializers,
        selected: serialize.array_or_json
    }
}

export class IndexSelectorModel extends OneDSelectorModel {

    defaults() {
        return {...OneDSelectorModel.prototype.defaults(),
            _model_name: "IndexSelectorModel",
            _view_name: "IndexSelector",
            selected: null,
            line_width: 2,
            color: null
        }
    }
    
    static serializers = {...OneDSelectorModel.serializers,
        selected: serialize.array_or_json
    }
}

export class BrushIntervalSelectorModel extends OneDSelectorModel {

    defaults() {
        return {...OneDSelectorModel.prototype.defaults(),
            _model_name: "BrushIntervalSelectorModel",
            _view_name: "BrushIntervalSelector",
            brushing: false,
            selected: null,
            color: null,
            orientation: "horizontal"
        }
    }

    static serializers = {...OneDSelectorModel.serializers,
        selected: serialize.array_or_json
    }
}

export class BrushSelectorModel extends TwoDSelectorModel {

    defaults() {
        return {...TwoDSelectorModel.prototype.defaults(),
            _model_name: "BrushSelectorModel",
            _view_name: "BrushSelector",
            clear: false,
            brushing: false,
            selected_x: null,
            selected_y: null,
            color: null
        }
    }

    static serializers = {...TwoDSelectorModel.serializers,
        selected_x: serialize.array_or_json,
        selected_y: serialize.array_or_json
    }
}

export class MultiSelectorModel extends OneDSelectorModel {

    defaults() {
        return {...OneDSelectorModel.prototype.defaults(),
            _model_name: "MultiSelectorModel",
            _view_name: "MultiSelector",
            names: [],
            brushing: false,
            selected: {},
            _selected: {},
            show_names: true
        }
    }
}

export class LassoSelectorModel extends TwoDSelectorModel {

    defaults() {
        return {...TwoDSelectorModel.prototype.defaults(),
            _model_name: "LassoSelectorModel",
            _view_name: "LassoSelector",
           color: null
        };
    }
}
