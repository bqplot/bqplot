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
var colorbrewer = require("./colorbrewer");
var utils = require("./utils");

var default_scheme = 'RdYlGn'

var cycle_colors = function(colors, count) {
    var colors_len = colors.length;
    if(colors_len > count) {
        return colors.slice(0, count);
    } else {
        var return_array = [];
        var iters = Math.floor(count / colors_len);
        for(;iters > 0; iters--) {
            return_array = return_array.concat(colors);
        }
        return return_array.concat(colors.slice(0, count % colors_len));
    }
};

var cycle_colors_from_scheme = function(scheme, num_steps) {
    scheme = (scheme in colorbrewer) ? scheme : default_scheme;
    var color_set = colorbrewer[scheme];

    // Indices of colorbrewer objects are strings
    var color_index = num_steps.toString();

    if (num_steps === 2) {
        return [color_set[3]["0"], color_set[3]["2"]];
    } else if (color_index in color_set) {
        return color_set[color_index];
    } else {
        var color_index = get_max_index(color_set).toString();
        return this.cycle_colors(color_set[color_index], num_steps);
    }
};

var get_linear_scale = function(scheme) {
    scheme = ((scheme in colorbrewer) && !(colorbrewer[scheme]["type"] === "qual")) ?
                  scheme : default_scheme;
    var color_set = colorbrewer[scheme];
    var color_index = get_max_index(color_set).toString();

    var colors = color_set[color_index];
    var scale = d3.scale.linear().range(colors);
    return scale;
};

var get_ordinal_scale = function(scheme, num_steps) {
    var scale = d3.scale.ordinal();
    scale.range(this.cycle_colors_from_scheme(scheme, num_steps));
    return scale;
};

var get_linear_scale_range = function(scheme) {
    return this.get_linear_scale(scheme).range();
};

var get_ordinal_scale_range = function(scheme, num_steps) {
    return this.get_ordinal_scale(scheme, num_steps).range();
};

// Returns the maximum number of colors available in the colorbrewer object
var get_max_index = function(color_object) {
    return d3.max(Object.keys(color_object).map(Number));
};

module.exports = {
    cycle_colors: cycle_colors,
    cycle_colors_from_scheme: cycle_colors_from_scheme,
    get_linear_scale: get_linear_scale,
    get_ordinal_scale: get_ordinal_scale,
    get_linear_scale_range: get_linear_scale_range,
    get_ordinal_scale_range: get_ordinal_scale_range,
};
