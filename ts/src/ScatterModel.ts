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

import { ScatterBaseModel} from './ScatterBaseModel';
import * as serialize from './serialize';
import * as _ from 'underscore';

export class ScatterModel extends ScatterBaseModel {

    defaults() {
        return {...ScatterBaseModel.prototype.defaults(), 
            _model_name: "ScatterModel",
            _view_name: "Scatter",
            skew: null,
            marker: "circle",
            stroke: null,
            stroke_width: 1.5,
            default_skew: 0.5,
            default_size: 64,
            names: [],
            display_names: true,
            fill: true,
            drag_color: null,
            drag_size: 5.0,
            names_unique: true,
        };
    }

    initialize(attributes, options) {
        // TODO: Normally, color, opacity and size should not require a redraw
        super.initialize(attributes, options);
        this.on("change:skew", this.update_data, this);
        this.on_some_change(["names", "names_unique"], function() {
            this.update_unique_ids();
            this.trigger("data_updated");
        }, this);
    }

    update_mark_data() {
        super.update_mark_data();
        const skew = this.get("skew") || [];

        this.mark_data.forEach(function(d, i){ d.skew = skew[i]; });
    }

    update_unique_ids() {
        let names = this.get("names");
        const show_labels = (names != null && names.length !== 0);
        names = (show_labels) ? names : this.mark_data.map(function(data, index) {
            return "Dot" + index;
        });
        let unique_ids = [];
        if(this.get("names_unique")) {
            unique_ids = names.slice(0);
        } else {
            unique_ids = _.range(this.mark_data.length);
        }

        this.mark_data.forEach(function(data, index){
            data.name = names[index];
            data.unique_id = unique_ids[index];
        });
    }

    static serializers = {
        ...ScatterBaseModel.serializers,
        skew: serialize.array_or_json,
        names: serialize.array_or_json,
    }
}
