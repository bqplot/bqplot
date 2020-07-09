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
import * as colurutils from './ColorUtils';

export class OrdinalColorScale extends Scale {

    render(){
        this.scale = d3.scaleOrdinal();
        this.scale.domain(this.model.domain);
        this.create_event_listeners();
        this.listenTo(this.model, "domain_changed", this.model_domain_changed);
        this.model.on_some_change(["colors", "scheme"], this.colors_changed, this);
        this.set_range();
    }

    set_range() {
        if (this.model.get("colors").length > 0) {
            this.scale.range(colurutils.cycle_colors(this.model.get("colors"), this.scale.domain().length));
        } else {
            this.scale.range(colurutils.get_ordinal_scale_range(this.model.get("scheme"), this.scale.domain().length));
        }
        this.trigger("color_scale_range_changed");
    }

    model_domain_changed() {
        super.model_domain_changed();
        this.set_range();
    }

    colors_changed() {
        this.set_range();
    }
}
