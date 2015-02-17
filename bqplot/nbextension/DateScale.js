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

define(["./d3", "./LinearScale"], function(d3, LinearScaleViewModule) {
    "use strict";

    var DateScale = LinearScaleViewModule.LinearScale.extend({
        render: function() {
            this.scale = d3.time.scale();
            if(this.model.domain.length > 0) {
                this.scale.domain(this.model.domain);
            }
            this.offset = 0;
            this.create_event_listeners();
            this.format_date = this.model.format_date;
        },
    });

    return {
        DateScale: DateScale,
    };
});
