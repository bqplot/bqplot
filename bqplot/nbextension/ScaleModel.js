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

define(["./d3", "./MarkModel"], function(d3, MarkModelModule) {
    "use strict";

    var ScaleModel = MarkModelModule.MarkModel.extend({
        initialize: function(range) {
            this.type = "base";
            this.domains = {};
            this.domain = [];
        },
        set_domain: function(domain, id) {
            // Call function only if you have computed the domain yourself. If
            // you want the scale to compute the domain based on the data for
            // your scale view, then call compute_and_set_domain
            this.domains[id] = domain;
            this.update_domain();
        },
        del_domain: function(domain, id) {
            if(this.domains[id] !== undefined) {
                delete this.domains[id];
                this.update_domain();
            }
        },
    });

    return {
        ScaleModel: ScaleModel,
    };
});
