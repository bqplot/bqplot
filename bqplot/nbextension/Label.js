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
            this.rotate_angle = this.model.get("rotate_angle");
            this.x_offset = this.model.get("x_offset");
            this.y_offset = this.model.get("y_offset");
            this.color = this.model.get("color");
            this.text = this.model.get("text");
            return base_render_promise.then(function() {
                self.create_listeners();
                self.draw();
            });
        },
        set_ranges: function() {
            var x_scale = this.scales["x"];
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
                this.x_offset = x_scale.offset;
            }
            var y_scale = this.scales["y"];
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
                this.y_offset = y_scale.offset;
            }
        },
        set_positional_scales: function() {
            this.x_scale = this.scales["x"];
            this.y_scale = this.scales["y"];
            // If no scale for "x" or "y" is specified, figure scales are used.
            if(!this.x_scale) {
                this.x_scale = this.parent.scale_x;
            }
            if(!this.y_scale) {
                this.y_scale = this.parent.scale_y;
            }
            this.listenTo(this.x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
            this.listenTo(this.y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },
        create_listeners: function() {
            Label.__super__.create_listeners.apply(this);
            this.model.on("change:text", this.update_text, this);
            this.model.on_some_change(["font_weight", "font_size", "color",
                                       "align"], this.update_style, this);
            this.model.on("change:rotate_angle", function(model, value) {
                this.rotate_angle = value; this.apply_net_transform();
            }, this);
            this.model.on("change:y_offset", function(model, value) {
                this.y_offset = value; this.apply_net_transform();
            }, this);
            this.model.on("change:x_offset", function(model, value) {
                this.x_offset = value; this.apply_net_transform();
            }, this);
            this.model.on_some_change(["x", "y"], this.apply_net_transform, this);
        },
        relayout: function() {
            this.set_ranges();
            this.apply_net_transform();
        },
        draw: function() {
            var self = this;
            this.set_ranges();
            this.el.selectAll(".label")
                .remove();

            this.el.append("text")
                .text(this.text)
                .classed("label", true);
            this.update_style();
            this.apply_net_transform();
        },
        get_extra_transform: function() {
            var total_transform = "";
            // The translate is applied first and then the rotate is applied
            if(this.x_offset !== undefined || this.y_offset !== undefined) {
                total_transform += " translate(" + this.x_offset + ", " +
                    this.y_offset + ")";
            }

            if(this.rotate_angle !== undefined) {
                total_transform += " rotate(" + this.rotate_angle + ")";
            }

            return total_transform;
        },
        apply_net_transform: function() {
            // this function gets the net transform after applying both the
            // rotate and x, y trasnforms
            var x = (this.x_scale.model.type === "date") ?
                this.model.get_date_elem("x") : this.model.get("x");
            var y = (this.y_scale.model.type === "date") ?
                this.model.get_date_elem("y") : this.model.get("y");
            var net_transform = "translate(" + this.x_scale.scale(x)
                                      + ", " + this.y_scale.scale(y) + ")";
            net_transform += this.get_extra_transform();
            this.el.selectAll(".label")
                .attr("transform", net_transform);
        },
        update_text: function(model, value) {
            this.text = value;
            this.el.select(".label")
                .text(this.text);
        },
        update_style: function() {
            this.color = this.model.get("color");
            this.el.select(".label")
                .style("font-size", this.model.get("font_size"))
                .style("font-weight",this.model.get("font_weight"))
                .style("text-anchor", this.model.get("align"));

            if(this.color !== undefined) {
                this.el.select(".label")
                    .style("fill", this.color);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Label", Label);
    return [Label];
});

