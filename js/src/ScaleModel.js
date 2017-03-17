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

var d3 = require("d3");
var _ = require("underscore");
var basemodel = require("./BaseModel");
var semver_range = "^" + require("../package.json").version;

var ScaleModel = basemodel.BaseModel.extend({

    defaults: function() {
        return _.extend(basemodel.BaseModel.prototype.defaults(), {
            _model_name: "ScaleModel",
             _view_name: "Scale",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            reverse: false,
            allow_padding: true
        });
    },

    initialize: function() {
        ScaleModel.__super__.initialize.apply(this, arguments);
        this.domains = {};
        this.domain = [];
        this.set_init_state();
        this.set_listeners();
    },

    set_init_state: function() {
        this.type = "base";
    },

    set_listeners: function() {
        // Function to be implementd by inherited classes.
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
    }
});

module.exports = {
    ScaleModel: ScaleModel
};
