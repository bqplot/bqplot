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

define(["widgets/js/manager", "d3", "./Mark"], function(WidgetManager, d3, mark) {
    var Mark = mark[0];
    var Label = Mark.extend({
        render: function() {
            var base_render_promise = Label.__super__.render.apply(this);
            var self = this;

            //TODO: create_listeners is put inside the promise success handler
            //because some of the functions depend on child scales being
            //created. Make sure none of the event handler functions make that
            //assumption.
            this.rotate_angle = this.model.get("rotate");
            this.x_offset = this.model.get("x_offset");
            this.y_offset = this.model.get("y_offset");
            this.x = this.model.get("x");
            this.y = this.model.get("y");
            this.color = this.model.get("color");

            return base_render_promise.then(function() {
                self.create_listeners();
                self.draw();
            }, null);
        },
        create_listeners: function() {
            Label.__super__.create_listeners.apply(this);
        },
        rescale: function() {
            Label.__super__.rescale.apply(this);
            this.set_ranges();
            this.apply_net_transform();
        },
        draw: function() {
            var self = this;
            this.set_ranges();
            this.el.selectAll(".label")
                .remove();

            this.el.append("text")
                .text(this.model.get("text"))
                .style("font-size", this.model.get("font_size"))
                .style("font-weight",this.model.get("font_weight"))
                .classed("label", true);

            if(this.color != undefined) {
                this.el.select(".label")
                    .style("fill", this.color);
            }
            this.apply_net_transform();
        },
        get_extra_transform: function() {
            var total_transform = "";
            if(this.rotate_angle != undefined) {
                total_transform += " rotate(" + this.rotate_angle + ")";
            }

            if(this.x_offset != undefined || this.y_offset != undefined) {
                total_transform += " translate(" + this.x_offset + ", " + this.y_offset + ")";
            }
            return total_transform;
        },
        apply_net_transform: function() {
            // this function gets the net transform after applying both the
            // rotate and x, y trasnforms
            var net_transform = "translate(" + this.x_scale.scale(this.x) + ", " + this.y_scale.scale(this.y) + ")";
            net_transform += this.get_extra_transform();
            this.el.selectAll(".label")
                .attr("transform", net_transform);
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Label", Label);
    return [Label];
});

