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

import { BaseModel } from './BaseModel';
import { semver_range } from './version';

export abstract class ScaleModel extends BaseModel {

    defaults() {
        return {...BaseModel.prototype.defaults(),
            _model_name: "ScaleModel",
             _view_name: "Scale",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            reverse: false,
            allow_padding: true
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.domains = {};
        this.domain = [];
        this.set_init_state();
        this.set_listeners();
    }

    set_init_state() {
        this.type = "base";
    }

    set_listeners() {
        // Function to be implementd by inherited classes.
    }

    set_domain(domain, id) {
        // Call function only if you have computed the domain yourself. If
        // you want the scale to compute the domain based on the data for
        // your scale view, then call compute_and_set_domain
        this.domains[id] = domain;
        this.update_domain();
    }

    del_domain(domain, id) {
        if(this.domains[id] !== undefined) {
            delete this.domains[id];
            this.update_domain();
        }
    }

    get_domain_slice_in_order() {
        if(this.reverse)
            return this.domain.slice().reverse();
        else
            return this.domain.slice();
    }

    abstract compute_and_set_domain(data_array, id);
    abstract update_domain();

    domains: any;
    domain: Array<number>;
    reverse: boolean;
    type: string;
}
