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

define(["widgets/js/widget", "./d3"], function(Widget, d3) {
    "use strict";

    var Interaction = Widget.WidgetView.extend({
        render: function() {
            this.parent = this.options.parent;

            // Opaque interation layer
            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "rect"))
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.parent.width -
                               this.parent.margin.left -
                               this.parent.margin.right)
                .attr("height", this.parent.height -
                                this.parent.margin.top -
                                this.parent.margin.bottom)
                .attr("pointer-events", "all")
                .attr("visibility", "hidden");
            this.parent.on("margin_updated", this.relayout, this);
        },
        relayout: function() {
            // Called when the figure margins are updated.
            this.el
                .attr("width", this.parent.width -
                               this.parent.margin.left -
                               this.parent.margin.right)
                .attr("height", this.parent.height -
                                this.parent.margin.top -
                                this.parent.margin.bottom);
        },
        remove: function() {
            _.each(this.mark_views, function(mark) { mark.invert_range(); });
            this.el.remove();
            Interaction.__super__.remove.apply(this);
        }
    });

    return {
        Interaction: Interaction,
    };
});
