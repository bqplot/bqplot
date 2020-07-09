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

import { ScaleModel } from './ScaleModel';
import * as _ from 'underscore';

export class OrdinalScaleModel extends ScaleModel {

    defaults() {
        return {...ScaleModel.prototype.defaults(),
            _model_name: "OrdinalScaleModel",
            _view_name: "OrdinalScale",
            domain: [],
        };
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
    }

    set_init_state() {
        this.type = "ordinal";
        this.min_from_data = true;
        this.max_from_data = true;
    }

    set_listeners() {
        this.on("change:domain", this.domain_changed, this);
        this.domain_changed();
        this.on("change:reverse", this.reverse_changed, this);
        this.reverse_changed();
    }

    domain_changed() {
        this.ord_domain = this.get("domain");
        if(this.ord_domain !== null && this.ord_domain.length !== 0) {
            this.max_from_data = false;
            this.min_from_data = false;
            this.domain = this.ord_domain.map(function(d) { return d; });
            this.trigger("domain_changed");
        } else {
            this.max_from_data = true;
            this.min_from_data = true;
            this.domain = [];
            this.update_domain();
        }
    }

    reverse_changed(model?) {
        const prev_reverse = (model === undefined) ? false : model.previous("reverse");
        this.reverse = this.get("reverse");

        // the domain should be reversed only if the previous value of reverse
        // is different from the current value. During init, domain should be
        // reversed only if reverse is set to True.
        const reverse_domain = (prev_reverse + this.reverse) % 2;
        if(this.domain.length > 0 && reverse_domain === 1) {
            this.domain.reverse();
            this.trigger("domain_changed", this.domain);
        }
    }

    update_domain() {
        let domain = [];
        // TODO: check for hasOwnProperty
        for (let id in this.domains) {
            domain = _.union(domain, this.domains[id]);
        }
        if(this.domain.length !== domain.length ||
           (_.intersection(this.domain, domain)).length !== domain.length) {
            this.domain = domain;
            this.trigger("domain_changed", domain);
        }
    }

    compute_and_set_domain(data_array, id) {
        // Takes an array and calculates the domain for the particular
        // view. If you have the domain already calculated on your side,
        // call set_domain function.
        if(!this.min_from_data && !this.max_from_data) {
            return;
        }
        if(data_array.length === 0) {
           this.set_domain([], id);
           return;
        }
        const domain = _.flatten(data_array);
        if(this.get("reverse")) {
            domain.reverse();
        }
        this.set_domain(domain, id);
    }

    min_from_data: boolean;
    max_from_data: boolean;
    ord_domain: any;
}
