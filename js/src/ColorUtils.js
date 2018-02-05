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

var scale_colors_multi = function(colors, count) {
    var scales = utils.getCustomRange(colors);
    var scale_left = scales[0];
    var scale_right = scales[1];

    scale_left.domain([0, (count - 1)/ 2]);
    scale_right.domain([(count - 1)/2, count - 1]);
    var ret_colors = [];
    var i;
    for (i = 0; i < (count - 1)/ 2; i++) {
        ret_colors.push(scale_left(i));
    }
    for(i = (count - 1) /2 + 1; i < count; i++) {
        ret_colors.push(scale_right(i));
    }
    return ret_colors;
};

var scale_colors = function(colors, count) {
    var scale = d3.scale.linear()
        .domain([0, count - 1])
        .range(d3.extent[colors]);
    var incr = (count < colors.length) ? Math.floor(colors.length / count) : 1;
    var ret_colors = [];
    for (var i = 0; i < count; i=i+incr) {
        ret_colors.push(scale(i));
    }
    return ret_colors;
};

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
    var num_steps_str = "" + num_steps + "";

    if (num_steps === 2) {
        return [color_set[3]["0"], color_set[3]["2"]];
    } else if (num_steps_str in color_set) {
        return color_set[num_steps_str];
    } else {
        var max_num_str = "" + get_max_index(color_set) + "";
        return this.cycle_colors(color_set[max_num_str], num_steps);
    }
};

var get_colors = function(scheme, num_colors) {
    scheme = (scheme in colorbrewer) ? scheme : default_scheme;
    var color_set = colorbrewer[scheme];

    var color_index = Math.min(num_colors, get_max_index(color_set)).toString();
    var colors = color_set[color_index];

    var scheme_type = color_set["type"];
    if(scheme_type == "qual") {
        return this.cycle_colors(colors, num_colors);
    }
    else if (scheme_type === "seq") {
        return this.scale_colors(colors, num_colors);
    } else {
        return this.scale_colors_multi(colors, num_colors);
    }
};

var get_linear_scale = function(scheme) {
    scheme = ((scheme in colorbrewer) && !(colorbrewer[scheme]["type"] === "qual")) ?
                  scheme : default_scheme;
    var color_set = colorbrewer[scheme];
    var max_num = get_max_index(color_set);
    var max_num_str = "" + max_num + "";

    var colors = color_set[max_num_str];
    var scale = d3.scale.linear();
    if(color_set["type"] === "div") {
        var mid_num = Math.floor(max_num / 2);
        scale.range([colors[0], colors[mid_num], colors[max_num-1]]);
    } else {
        scale.range(colors); //[colors[0], colors[max_num-1]]);
    }
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

var is_divergent = function(scheme) {
    scheme = (scheme in colorbrewer) ? scheme : default_scheme;
    var color_set = colorbrewer[scheme];
    return (color_set["type"] == "div");
};

// Returns the maximum number of colors available in the colorbrewer object
var get_max_index = function(color_object) {
    return d3.max(Object.keys(color_object).map(Number));
};

var get_max_number = function(scheme) {
    scheme = ((scheme in colorbrewer) && !(colorbrewer[scheme]["type"] === "qual")) ?
                  scheme : default_scheme;
    var color_set = colorbrewer[scheme];
    return get_max_index(color_set);
};

module.exports = {
    scale_colors_multi: scale_colors_multi,
    scale_colors: scale_colors,
    cycle_colors: cycle_colors,
    cycle_colors_from_scheme: cycle_colors_from_scheme,
    get_colors: get_colors,
    get_linear_scale: get_linear_scale,
    get_ordinal_scale: get_ordinal_scale,
    get_linear_scale_range: get_linear_scale_range,
    get_ordinal_scale_range: get_ordinal_scale_range,
    is_divergent: is_divergent
};
