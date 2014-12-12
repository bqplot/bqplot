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

define(["widgets/js/manager", "d3", "./utils", "./Overlay"], function(WidgetManager, d3, utils, Overlay) {

    // TODO avoid duplication of 'x' and 'y'

    var PanZoom = Overlay.extend({
        render: function() {
            PanZoom.__super__.render.apply(this);
            var that = this;
            this.el
                .style({"cursor": "move"})
                .on("mousedown", function() { that.mousedown(); })
                .on("mousemove", function() { that.mousemove(); })
                .on("mouseup", function() { that.mouseup(); })
                .on("mousewheel", function() { that.mousewheel(); });
            this.active = false;

            this.update_scales({}, this.model.get("scales"));
            this.model.on("change:scales", function(model, value) {
                this.update_scales(model.previous("scales"), value);
            }, this);
        },
        update_scales: function(old_scales, new_scales) {
            this.xscales = new_scales["x"];
            this.yscales = new_scales["y"];

            var that = this;
            // Getting A collection of views for each of the scale models.
            this.xscale_views = this.xscales.map(function(scale_model) {
                //TODO: check if exists
                return that.parent.child_scale_views[scale_model.id]['x'][0];
            });
            this.yscale_views = this.yscales.map(function(scale_model) {
                // TODO: check if exists
                return that.parent.child_scale_views[scale_model.id]['y'][0];
            });
        },
        mousedown: function () {
            this.active = true;
            this.el.style({"cursor": "move"});
            this.previous_pos = d3.mouse(this.el.node());
            this.xdomains = this.xscales.map(function(s) { return s.domain.slice(0); });
            this.ydomains = this.yscales.map(function(s) { return s.domain.slice(0); });
        },
        mouseup: function () {
            this.active = false;
        },
        mousemove: function() {
            if (this.active && this.model.get("allow_pan")) {
                // If memory is set to true, intermediate positions between the last
                // position of the mouse and the current one will be interpolated.
                var mouse_pos = d3.mouse(this.el.node());
                if (!("previous_pos" in this)) {
                    this.previous_pos = mouse_pos;
                }
                var that = this;
                var xdiffs = this.xscale_views.map(function(view) {
                                                if (view.scale.invert) { // Categorical scales don't have an inversion.
                                                    return view.scale.invert(mouse_pos[0]) - view.scale.invert(that.previous_pos[0]);
                                                }
                                            });
                var ydiffs = this.yscale_views.map(function(view) {
                                                if (view.scale.invert) { // Categorical scales don't have an inversion.
                                                    return view.scale.invert(mouse_pos[1]) - view.scale.invert(that.previous_pos[1]);
                                                }
                                            });
                for (var i=0; i<this.xscale_views.length; i++) {
                    var domain = this.xdomains[i];
                    var min = domain[0] - xdiffs[i];
                    var max = domain[1] - xdiffs[i];
                    this.set_scale_attribute(this.xscales[i], "min", min);
                    this.set_scale_attribute(this.xscales[i], "max", max);
                    // TODO? Only do in mouseup?
                    this.xscale_views[i].touch();
                }
                for (var i=0; i<this.yscale_views.length; i++) {
                    var domain = this.ydomains[i];
                    var min = domain[0] - ydiffs[i];
                    var max = domain[1] - ydiffs[i];
                    this.set_scale_attribute(this.yscales[i], "min",min);
                    this.set_scale_attribute(this.yscales[i], "max", max);
                    // TODO? Only do in mouseup?
                    this.yscale_views[i].touch();
                }
            }
        },
        mousewheel: function() {
            if (this.model.get("allow_zoom")) {
                d3.event.preventDefault();
                var delta = d3.event.wheelDelta;
                var mouse_pos = d3.mouse(this.el.node());
                if (delta) {
                    if (delta > 0) {
                        this.el.style({"cursor": "zoom-in"});
                    } else {
                        this.el.style({"cursor": "zoom-out"});
                    }
                    var that = this;
                    var xpos = this.xscale_views.map(function(view) {
                                                         return view.scale.invert(mouse_pos[0]);
                                                     });
                    var ypos = this.yscale_views.map(function(view) {
                                                         return view.scale.invert(mouse_pos[1]);
                                                     });
                    var factor = Math.exp(-delta * 0.001);
                    for (var i=0; i<this.xscale_views.length; i++) {
                        var domain = this.xscales[i].domain;
                        var min = domain[0];
                        var max = domain[1];
                        this.set_scale_attribute(this.xscales[i], "min", (1 - factor) * xpos[i] + factor * min);
                        this.set_scale_attribute(this.xscales[i], "max", (1 - factor) * xpos[i] + factor * max);
                        // TODO? Only do in mouseup?
                        this.xscale_views[i].touch();
                    }
                    for (var i=0; i<this.yscale_views.length; i++) {
                        var domain = this.yscales[i].domain;
                        var min = domain[0];
                        var max = domain[1];
                        this.set_scale_attribute(this.yscales[i], "min", (1 - factor) * ypos[i] + factor * min);
                        this.set_scale_attribute(this.yscales[i], "max", (1 - factor ) * ypos[i] + factor * max);
                        // TODO? Only do in mouseup?
                        this.yscale_views[i].touch();
                    }
                }
            }
        },
        set_scale_attribute: function(scale, attribute_name, value) {
            // The difference of two dates is an int. So we want to cast it to
            // a date when setting the attribute for the date scale
            if(scale.type == "date") {
                value = (value instanceof Date) ? value : new Date(value);
                //TODO: Function for setting date can be made the same as for
                //other scale once the _pack_models is fixes
                scale.set_date_elem(attribute_name, value);
            }
            else {
                scale.set(attribute_name, value);
            }
        },
    });

    WidgetManager.WidgetManager.register_widget_view("bqplot.PanZoom", PanZoom);
});

