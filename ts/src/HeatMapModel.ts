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

import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class HeatMapModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "HeatMapModel",
            _view_name: "HeatMap",
            x: [],
            y: [],
            color: null,
            scales_metadata: {
                x: { orientation: "horizontal", dimension: "x" },
                y: { orientation: "vertical", dimension: "y" },
                color: { dimension: "color" }
            },
            null_color: "black"
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(["x", "y", "color"], this.update_data, this);
        // FIXME: replace this with on("change:preserve_domain"). It is not done here because
        // on_some_change depends on the GLOBAL backbone on("change") handler which
        // is called AFTER the specific handlers on("change:foobar") and we make that
        // assumption.
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
        this.update_domains();
    }

    update_data() {
        this.dirty = true;
        // Handling data updates
        this.mark_data = {
            x: this.get("x"),
            y: this.get("y"),
            color: this.get("color")
        }
        this.update_domains();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_domains() {
        if (!this.mark_data) { return; }

        const scales = this.get("scales");
        const x_scale = scales.x, y_scale = scales.y;
        const color_scale = scales.color;
        const flat_colors = [].concat.apply([], this.mark_data.color.map((x) => Array.prototype.slice.call(x, 0)));

        if(!this.get("preserve_domain").x) {
            x_scale.compute_and_set_domain(this.mark_data.x, this.model_id + "_x");
        } else {
            x_scale.del_domain([], this.model_id + "_x");
        }

        if(!this.get("preserve_domain").y) {
            y_scale.compute_and_set_domain(this.mark_data.y, this.model_id + "_y");
        } else {
            y_scale.del_domain([], this.model_id + "_y");
        }
        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(flat_colors, this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
    }

    get_data_dict(data, index) {
        return data;
    }

    static serializers = {
        ...MarkModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        color: serialize.array_or_json
    };
}
