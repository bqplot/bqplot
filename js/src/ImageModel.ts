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
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class ImageModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "ImageModel",
            _view_name: "Image",
            x: [0.0, 1.0],
            y: [0.0, 1.0],
            scales_metadata: {
                'x': {'orientation': 'horizontal', 'dimension': 'x'},
                'y': {'orientation': 'vertical', 'dimension': 'y'},
            },
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on_some_change(['x', 'y'], this.update_data, this);
        this.on_some_change(["preserve_domain"], this.update_domains, this);
        this.update_data();
    }

    update_data() {
        this.mark_data = {
            x: this.get("x"), y: this.get("y")
        };
        this.update_domains();
        this.trigger("data_updated");
    }

    update_domains() {
        if(!this.mark_data) {
            return;
        }
        const scales = this.get("scales");
        const x_scale = scales.x;
        const y_scale = scales.y;

        if(x_scale) {
            if(!this.get("preserve_domain").x) {
                x_scale.compute_and_set_domain(this.mark_data['x'], this.model_id + "_x");
            } else {
                x_scale.del_domain([], this.model_id + "_x");
            }
        }
        if(y_scale) {
            if(!this.get("preserve_domain").y) {
                y_scale.compute_and_set_domain(this.mark_data['y'], this.model_id + "_y");
            } else {
                y_scale.del_domain([], this.model_id + "_y");
            }
        }
    }

    static serializers = {
        ...MarkModel.serializers,
        image: { deserialize: widgets.unpack_models },
        x: serialize.array_or_json,
        y: serialize.array_or_json
    };
}
