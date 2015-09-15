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

define(["./components/d3/d3", "./LinearColorScale", "./ColorUtils"], function(d3, LinearColorScaleViewModule, ColorUtils) {
    "use strict";

    var DateColorScale = LinearColorScaleViewModule.LinearColorScale.extend({
        render: function(){
            this.scale = d3.time.scale();
            if(this.model.domain.length > 0) {
                this.scale.domain(this.model.domain);
            }
            this.offset = 0;
            if(this.model.get("colors").length === 0) {
               this.divergent = this.model.divergent = ColorUtils.is_divergent(this.model.get("scheme"));
            } else {
                this.divergent = this.model.divergent = (this.model.get("colors").length > 2);
            }
            this.set_range();

            this.listenTo(this.model, "domain_changed", this.model_domain_changed, this);
            this.model.on_some_change(["colors", "scheme"], this.colors_changed, this);
        },
    });

    return {
        DateColorScale: DateColorScale,
    };
});
