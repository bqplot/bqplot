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

import * as d3 from 'd3';
import {ScatterBaseModel} from './ScatterBaseModel';
import * as serialize from './serialize';

export class LabelModel extends ScatterBaseModel {

    defaults() {
        return {...ScatterBaseModel.prototype.defaults(),
            _model_name: "LabelModel",
            _view_name: "Label",

            x_offset: 0,
            y_offset: 0,
            colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
            rotate_angle: 0.0,
            text: null,
            default_size: 16.0,
            drag_size: 1.0,
            font_unit: "px",
            font_weight: "bold",
            align: "start",
        };
    }

    initialize(attributes, options) {
        // TODO: Normally, color, opacity and size should not require a redraw
        super.initialize(attributes, options);
        this.on("change:text", this.update_data, this);
    }

    update_mark_data() {
        super.update_mark_data();
        const text = this.get("text");

        this.mark_data.forEach(function(d, i){ d.text = text[i]; });
    }

    update_unique_ids() {
        this.mark_data.forEach(function(data, index){
                                   data.unique_id = "Label" + index;
        });
    }

    static serializers = {
        ...ScatterBaseModel.serializers,
        text: serialize.array_or_json,
    }
}
