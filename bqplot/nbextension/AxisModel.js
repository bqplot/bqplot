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

define(["d3", "./MarkModel"], function(d3, MarkModelModule) {
    "use strict";

    var AxisModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            this.on("change:side", this.validate_orientation, this);
            this.on("change:orientation", this.validate_side, this);
        },
        validate_side: function() {
            var orientation = this.get("orientation"),
                side = this.get("side");
            if(orientation === "vertical") {
                if (side !== "left" && side !== "right") {
                    this.set("side", "left");
                }
            } else {
                if (side !== "bottom" && side !== "top") {
                    this.set("side", "bottom");
                }
            }
            this.save_changes();
        },
        validate_orientation: function() {
            var orientation = this.get("orientation"),
                side = this.get("side");
            if(side === "left" || side === "right") {
                this.set("orientation", "vertical");
            } else {
                this.set("orientation", "horizontal");
            }
            this.save_changes();
        }
    });

    return {
        AxisModel: AxisModel,
    };
});
