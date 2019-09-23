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
import * as topojson from 'topojson';

export class MapModel extends MarkModel {

    defaults() {
        return {...MarkModel.prototype.defaults(),
            _model_name: "MapModel",
            _view_name: "Map",

            color: {},
            hover_highlight: true,
            hovered_styles: {
                hovered_fill: "Orange",
                hovered_stroke: null,
                hovered_stroke_width: 2.0
            },

            stroke_color: null,
            default_color: null,
            scales_metadata: {
                color: { dimension: "color" },
                projection: { dimension: "geo" }
            },
            selected_styles: {
                selected_fill: "Red",
                selected_stroke: null,
                selected_stroke_width: 2.0
            },
            map_data: undefined
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on("change:map_data", this.update_data, this);
        this.on("change:color", this.color_data_updated, this);
        this.update_data();
        this.update_domains();
    }

    update_data() {
        this.dirty = true;
        const data = this.get("map_data");
        if (data.type == 'Topology') {
            this.geodata = topojson.feature(data, data.objects.subunits).features;
        } else {
            this.geodata = data.features;
        }
        this.color_data_updated();
        this.dirty = false;
        this.trigger("data_updated");
    }

    update_properties(d) {
        if (!d.properties) {
            d.properties = {"color": this.color_data[d.id]};
        } else {
            d.properties.color = this.color_data[d.id];
        }
    }

    color_data_updated() {
        this.update_domains();
        this.geodata.map((d) => {
            return this.update_properties(d)
        });
    }

    update_domains() {
        const scales = this.get("scales");
        const color_scale = scales.color;
        this.color_data = this.get("color");
        if(color_scale !== null && color_scale !== undefined) {
            if(!this.get("preserve_domain").color) {
                color_scale.compute_and_set_domain(
                    Object.keys(this.color_data).map((d) => {
                        return this.color_data[d];
                    }), this.model_id + "_color");
            } else {
                color_scale.del_domain([], this.model_id + "_color");
            }
        }
    }

    get_data_dict(data, index) {
        return {...data.properties, 'id': data.id};
    }

    geodata: any;
    color_data: any;
};
