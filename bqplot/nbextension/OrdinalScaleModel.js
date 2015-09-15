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

define(["./components/d3/d3", "./ScaleModel"], function(d3, ScaleModelModule) {
    "use strict";

    var OrdinalScaleModel = ScaleModelModule.ScaleModel.extend({
        initialize: function(range) {
            OrdinalScaleModel.__super__.initialize.apply(this);
            this.type = "ordinal";
            this.min_from_data = true;
            this.max_from_data = true;
            this.on("change:domain", this.domain_changed, this);
            this.on("change:ticks", this.ticks_changed, this);
            this.on("change:reverse", this.reverse_changed, this);
        },
        domain_changed: function() {
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
        },
        reverse_changed: function() {
            if(this.domain.length > 0) {
                this.domain.reverse();
                this.trigger("domain_changed", this.domain);
            }
        },
        update_domain: function() {
            var domain = [];
            // TODO: check for hasOwnProperty
            for (var id in this.domains) {
                domain = _.union(domain, this.domains[id]);
            }
            if(this.domain.length !== domain.length ||
               (_.intersection(this.domain, domain)).length !== domain.length) {
                this.domain = domain;
                this.trigger("domain_changed", domain);
            }
        },
        compute_and_set_domain: function(data_array, id) {
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
            var domain = _.flatten(data_array);
            if(this.get("reverse")) {
                domain.reverse();
            }
            this.set_domain(domain, id);
        },
    });

    return {
        OrdinalScaleModel: OrdinalScaleModel,
    };
});
