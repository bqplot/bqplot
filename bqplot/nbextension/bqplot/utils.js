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

define(["d3"], function(d3) {
    return {
        getCustomRange: function(array) {
            var first = array[0];
            var end = array[array.length - 1];
            var pivot;
            if(array[0] > array[1]) {
                pivot = d3.min(array);
            } else {
                pivot = d3.max(array);
            }
            return [d3.scale.linear().range([first, pivot]), d3.scale.linear().range([pivot, end])];
        },
        deep_2d_copy: function(array) {
            // FIXME: Nooooo!
            return array.map(function(d) {
                return d.slice(0);
            });
        }
    }
});
