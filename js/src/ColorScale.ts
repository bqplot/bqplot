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
// var d3 =Object.assign({}, require("d3-scale"));
import { Scale } from './Scale';
import { ColorScaleModel } from './ColorScaleModel';

export class ColorScale extends Scale {

    render(){
        this.create_d3_scale();
        this.update_extrapolation();
        if(this.model.domain.length > 0) {
            this.scale.domain(this.model.domain);
        }
        this.offset = 0;
        this.create_event_listeners();
        this.set_range();
    }

    create_d3_scale(){
        this.scale = d3.scaleLinear();
    }

    create_event_listeners() {
        super.create_event_listeners();
        this.listenTo(this.model, "colors_changed", this.set_range);
        this.model.on("change:extrapolation", function() {
            this.update_extrapolation();
            this.trigger("color_scale_range_changed"); }, this);
    }

    update_extrapolation() {
        this.scale.clamp((this.model.get("extrapolation") === "constant"));
    }

    set_range() {
        this.scale.range(this.model.color_range);
        this.trigger("color_scale_range_changed");
    }

    // Overriding super class
    model: ColorScaleModel;
}

