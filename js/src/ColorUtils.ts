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
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"));
import colorbrewer from './colorbrewer';

const default_scheme = 'RdYlGn'
//
// Returns the maximum number of colors available in the colorbrewer object
function get_max_index(color_object) {
    return d3.max(Object.keys(color_object).map(Number));
}

export function cycle_colors(colors, count) {
    const colors_len = colors.length;
    if(colors_len > count) {
        return colors.slice(0, count);
    } else {
        let return_array = [];
        let iters = Math.floor(count / colors_len);
        for(;iters > 0; iters--) {
            return_array = return_array.concat(colors);
        }
        return return_array.concat(colors.slice(0, count % colors_len));
    }
}

export function cycle_colors_from_scheme(scheme, num_steps) {
    scheme = (scheme in colorbrewer) ? scheme : default_scheme;
    const color_set = colorbrewer[scheme];

    // Indices of colorbrewer objects are strings
    let color_index = num_steps.toString();

    if (num_steps === 2) {
        return [color_set[3]["0"], color_set[3]["2"]];
    } else if (color_index in color_set) {
        return color_set[color_index];
    } else {
        color_index = get_max_index(color_set).toString();
        return this.cycle_colors(color_set[color_index], num_steps);
    }
}

export function get_linear_scale(scheme) {
    scheme = ((scheme in colorbrewer) && !(colorbrewer[scheme]["type"] === "qual")) ?
                  scheme : default_scheme;
    const color_set = colorbrewer[scheme];
    const color_index = get_max_index(color_set).toString();

    const colors = color_set[color_index];
    const scale = d3.scaleLinear().range(colors);
    return scale;
}

export function get_ordinal_scale(scheme, num_steps) {
    const scale = d3.scaleOrdinal();
    scale.range(this.cycle_colors_from_scheme(scheme, num_steps));
    return scale;
}

export function get_linear_scale_range(scheme) {
    return this.get_linear_scale(scheme).range();
}

export function get_ordinal_scale_range(scheme, num_steps) {
    return this.get_ordinal_scale(scheme, num_steps).range();
}



