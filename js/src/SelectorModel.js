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

define(["jupyter-js-widgets", "./BaseModel", "underscore"],
       function(widgets, BaseModel, _) {
    "use strict";

    var SelectorModel = BaseModel.BaseModel.extend({

        defaults: _.extend({}, BaseModel.BaseModel.prototype.defaults, {
            _model_name: "SelectorModel",
            _model_module: "bqplot",
            _view_module: "bqplot",
            marks: [],
        }),

    }, {
        serializers: _.extend({
            marks: { deserialize: widgets.unpack_models },
        }, BaseModel.serializers),
    });

    var OneDSelectorModel = SelectorModel.extend({

        defaults: _.extend({}, SelectorModel.prototype.defaults, {
            _model_name: "OneDSelectorModel",
            scale: null
        }),
    }, {
        serializers: _.extend({
            scale: { deserialize: widgets.unpack_models },
        }, SelectorModel.serializers),
    });

    var TwoDSelectorModel = SelectorModel.extend({

        defaults: _.extend({}, SelectorModel.prototype.defaults, {
            _model_name: "TwoDSelectorModel",
            x_scale: null,
            y_scale: null,
        }),
    }, {
        serializers: _.extend({
            x_scale: { deserialize: widgets.unpack_models },
            y_scale: { deserialize: widgets.unpack_models },
        }, BaseModel.BaseModel.serializers),
    });

    var FastIntervalSelectorModel = OneDSelectorModel.extend({

        defaults: _.extend({}, OneDSelectorModel.prototype.defaults, {
            _model_name: "FastIntervalSelectorModel",
            _view_name: "FastIntervalSelector",
            selected: [],
            color: null,
            size: null
        }),
    });

    var IndexSelectorModel = OneDSelectorModel.extend({

        defaults: _.extend({}, OneDSelectorModel.prototype.defaults, {
            _model_name: "IndexSelectorModel",
            _view_name: "IndexSelector",
            selected: [],
            line_width: 2,
            color: null
        }),
    });

    var BrushIntervalSelectorModel = OneDSelectorModel.extend({

        defaults: _.extend({}, OneDSelectorModel.prototype.defaults, {
            _model_name: "BrushIntervalSelectorModel",
            _view_name: "BrushIntervalSelector",
            brushing: false,
            selected: [],
            color: null,
        }),
    });

    var BrushSelectorModel = TwoDSelectorModel.extend({

        defaults: _.extend({}, TwoDSelectorModel.prototype.defaults, {
            _model_name: "BrushSelectorModel",
            _view_name: "BrushSelector",
            clear: false,
            brushing: false,
            selected: [],
            color: null,
        }),
    });

    var MultiSelectorModel = OneDSelectorModel.extend({

        defaults: _.extend({}, OneDSelectorModel.prototype.defaults, {
            _model_name: "MultiSelectorModel",
            _view_name: "MultiSelector",
            names: [],
            brushing: false,
            selected: {},
            _selected: {},
            show_names: true
        }),
    });

    var LassoSelectorModel = TwoDSelectorModel.extend({

        defaults: _.extend({}, OneDSelectorModel.prototype.defaults, {
            _model_name: "LassoSelectorModel",
            _view_name: "LassoSelector",
            color: null,
        }),
    });

    return {
        SelectorModel: SelectorModel,
        OneDSelectorModel: OneDSelectorModel,
        TwoDSelectorModel: TwoDSelectorModel,
        FastIntervalSelectorModel: FastIntervalSelectorModel,
        IndexSelectorModel: IndexSelectorModel,
        BrushIntervalSelectorModel: BrushIntervalSelectorModel,
        BrushSelectorModel: BrushSelectorModel,
        MultiSelectorModel: MultiSelectorModel,
        LassoSelectorModel: LassoSelectorModel
    };
});
