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

define(function() {
    function PerfCounter(name)
    {
        this.name = name;
        this.startTime = this.endTime = 0;
    }

    PerfCounter.prototype.start = function () {
        this.startTime = performance.now();
    };

    PerfCounter.prototype.stop = function () {
        this.endTime = performance.now();
        this.log();
    };

    PerfCounter.prototype.log = function () {
        if (this.startTime && this.endTime) {
            console.log(this.name, " took ", (this.endTime - this.startTime), " ms");
        }
    };

    // Map to hold all the performance counters
    var map = {}

    // This function object is a factory for the performance counters
    return function (name) {
            if (map.hasOwnProperty(name)) {
                return map[name]
            }

            // else create a new one
            return map[name] = new PerfCounter(name);
        };
});
