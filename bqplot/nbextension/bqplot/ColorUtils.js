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

define(["d3", "colorbrewer", "./utils"], function(d3, colorbrewer, utils) {
    var color_schemes = ["Paired", "Set3", "Pastel1", "Set1", "Greys", "Greens", "Reds", "Purples", "Oranges", "YlOrRd", "YlOrBr", "YlGnBu", "YlGn", "RdPu",
                         "PuRd", "PuBuGn", "PuBu", "OrRd", "GnBu", "BuPu", "BuGn", "BrBG", "PiYG", "PRGn", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "Spectral"];
    return {
        scale_colors_multi: function(colors, count) {
            var scales = utils.getCustomRange(colors);
            var scale_left = scales[0];
            var scale_right = scales[1];

            scale_left.domain([0, (count - 1)/ 2]);
            scale_right.domain([(count - 1)/2, count - 1]);
            var ret_colors = [];
            for (var i = 0; i < (count - 1)/ 2; i++) {
                ret_colors.push(scale_left(i));
            }
            for(var i = (count - 1) /2 + 1; i < count; i++) {
                ret_colors.push(scale_right(i));
            }
            return ret_colors;
        },
        scale_colors: function(colors, count) {
            var scale = d3.scale.linear()
                .domain([0, count - 1])
                .range(d3.extent[colors]);
            var incr = (count < colors.length) ? Math.floor(colors.length / count) : 1;
            for (var i = 0; i < count; i=i+incr) {
                ret_colors.push(scale(i));
            }
            return ret_colors;
        },
        cycle_colors: function(colors, count) {
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
        },
        cycle_colors_from_scheme: function(scheme, num_steps) {
            var index = color_schemes.indexOf(scheme);
            index = (index === -1) ? 28 : index;

            if(index < 2) {
                return this.cycle_colors(colorbrewer[color_schemes[index]][12], num_steps);
            } else {
                return this.cycle_colors(colorbrewer[color_schemes[index]][9], num_steps);
            }
        },
        get_colors: function(scheme, num_colors) {
            var index = color_schemes.indexOf(scheme);
            if(index === -1) {
                index = 28;
            }

            var colors_object = colorbrewer[color_schemes[index]];
            if(index < 2) {
                return this.cycle_colors(colors_object[Math.min(num_colors, 12)], num_colors);
            }
            if(index < 4) {
                return this.cycle_colors(colors_object[Math.min(num_colors, 9)], num_colors);
            } else if(index < 21) {
                return this.scale_colors(colors_object[Math.min(num_colors, 9)], num_colors);
            } else {
                return this.scale_colors_multi(colors_object[Math.min(num_colors, 9)], num_colors);
            }
        },
        get_linear_scale: function(scheme) {
            var index = color_schemes.indexOf(scheme);
            if(index === -1 && index < 4) {
                index = 28;
            }
            var colors = colorbrewer[color_schemes[index]][9];
            var scale = d3.scale.linear();
            if(index > 21) {
                scale.range([colors[0], colors[4], colors[8]]);
            } else {
                scale.range([colors[0], colors[8]]);
            }
            return scale;
        },
        get_ordinal_scale: function(scheme, num_steps) {
            var scale = d3.scale.ordinal();
            scale.range(this.cycle_colors_from_scheme(scheme, num_steps));
            return scale;
        },
        get_linear_scale_range: function(scheme) {
            return this.get_linear_scale(scheme).range();
        },
        get_ordinal_scale_range: function(scheme, num_steps) {
            return this.get_ordinal_scale(scheme, num_steps).range();
        },
        is_divergent: function(scheme) {
            var index = color_schemes.indexOf(scheme);
            if(index === -1 && index < 4) {
                index = 2;
            }
            return (index > 21);
        },
    }
});
