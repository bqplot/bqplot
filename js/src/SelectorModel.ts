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
import * as basemodel from './BaseModel';
import { semver_range } from './version';
import * as serialize from './serialize';
import _ from 'underscore';

export const SelectorModel = basemodel.BaseModel.extend({

    defaults: function() {
        return _.extend(basemodel.BaseModel.prototype.defaults(), {
            _model_name: "SelectorModel",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            marks: []
        });
    }
}, {
    serializers: _.extend({
        marks: { deserialize: widgets.unpack_models },
    }, basemodel.BaseModel.serializers)
});

export const OneDSelectorModel = SelectorModel.extend({

    defaults: function() {
        return _.extend(SelectorModel.prototype.defaults(), {
            _model_name: "OneDSelectorModel",
            scale: null
        });
    }
}, {
    serializers: _.extend({
        scale: { deserialize: widgets.unpack_models },
    }, SelectorModel.serializers),
});

export const TwoDSelectorModel = SelectorModel.extend({

    defaults: function() {
        return _.extend(SelectorModel.prototype.defaults(), {
            _model_name: "TwoDSelectorModel",
            x_scale: null,
            y_scale: null
        });
    }
}, {
    serializers: _.extend({
        x_scale: { deserialize: widgets.unpack_models },
        y_scale: { deserialize: widgets.unpack_models },
    }, SelectorModel.serializers)
});

export const FastIntervalSelectorModel = OneDSelectorModel.extend({

    defaults: function() {
        return _.extend(OneDSelectorModel.prototype.defaults(), {
            _model_name: "FastIntervalSelectorModel",
            _view_name: "FastIntervalSelector",
            selected: null,
            color: null,
            size: null
        });
    },
}, {
    serializers: _.extend({
        selected: serialize.array_or_json,
    }, OneDSelectorModel.serializers)
});

export const IndexSelectorModel = OneDSelectorModel.extend({

    defaults: function() {
        return _.extend(OneDSelectorModel.prototype.defaults(), {
            _model_name: "IndexSelectorModel",
            _view_name: "IndexSelector",
            selected: null,
            line_width: 2,
            color: null
        });
    },
}, {
    serializers: _.extend({
        selected: serialize.array_or_json,
    }, OneDSelectorModel.serializers)
});

export const BrushIntervalSelectorModel = OneDSelectorModel.extend({

    defaults: function() {
        return _.extend(OneDSelectorModel.prototype.defaults(), {
            _model_name: "BrushIntervalSelectorModel",
            _view_name: "BrushIntervalSelector",
            brushing: false,
            selected: null,
            color: null,
            orientation: "horizontal"
        });
    }
}, {
    serializers: _.extend({
        selected: serialize.array_or_json,
    }, OneDSelectorModel.serializers)
});

export const BrushSelectorModel = TwoDSelectorModel.extend({

    defaults: function() {
        return _.extend(TwoDSelectorModel.prototype.defaults(), {
            _model_name: "BrushSelectorModel",
            _view_name: "BrushSelector",
            clear: false,
            brushing: false,
            selected_x: null,
            selected_y: null,
            color: null
        });
    }
}, {
    serializers: _.extend({
        selected_x: serialize.array_or_json,
        selected_y: serialize.array_or_json,
    }, TwoDSelectorModel.serializers)
});

export const MultiSelectorModel = OneDSelectorModel.extend({

    defaults: function() {
        return _.extend(OneDSelectorModel.prototype.defaults(), {
            _model_name: "MultiSelectorModel",
            _view_name: "MultiSelector",
            names: [],
            brushing: false,
            selected: {},
            _selected: {},
            show_names: true
        });
    }
});

export const LassoSelectorModel = TwoDSelectorModel.extend({

    defaults: function() {
        return _.extend(OneDSelectorModel.prototype.defaults(), {
            _model_name: "LassoSelectorModel",
            _view_name: "LassoSelector",
           color: null
       });
    }
});

