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

import * as widgets from '@jupyter-widgets/base';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-selection"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as interaction from './Interaction';
import * as _ from 'underscore';

// TODO avoid code duplication for 'x' and 'y'

export class PanZoom extends interaction.Interaction {

    render() {
        super.render();
        const that = this;
        this.d3el
          .style("cursor", "move")
          .on("mousedown", function() { that.mousedown(); })
          .on("mousemove", function() { that.mousemove(); })
          .on("mouseup", function() { that.mouseup(); })
          .on("mousewheel", function() { that.mousewheel(); })
          .on("DOMMouseScroll.zoom", function() { that.mousewheel(); })
          .on("mousewheel.zoom", null)
          .on("wheel.zoom", null);
        this.active = false;

        this.update_scales();
        this.listenTo(this.model, "change:scales", this.update_scales);

        this.set_ranges();
        this.listenTo(this.parent, "margin_updated", this.set_ranges);
    }

    update_scales() {
        const scales = this.model.get("scales");
        const that = this;
        this.scale_promises = widgets.resolvePromisesDict({
            "x": Promise.all((scales.x || []).map(function(model : widgets.WidgetModel) {
                    return that.create_child_view(model);
                 })),
            "y": Promise.all((scales.y || []).map(function(model : widgets.WidgetModel) {
                    return that.create_child_view(model);
                 })),
        });
        widgets.resolvePromisesDict(this.scale_promises)
            .then(_.bind(this.set_ranges, this));
    }

    set_ranges() {
       const that = this;
       let i;
       this.scale_promises.then(function(scale_views) {
           const xscale_views = scale_views.x;
           for (i=0; i<xscale_views.length; i++) {
               xscale_views[i].set_range(that.parent.padded_range("x",
                                                xscale_views[i].model));
           }
           const yscale_views = scale_views.y;
           for (i=0; i<yscale_views.length; i++) {
               yscale_views[i].set_range(that.parent.padded_range("y",
                                                yscale_views[i].model));
           }
       });
    }

    mousedown () {
        const scales = this.model.get("scales");
        this.active = true;
        this.d3el.style("cursor", "move");
        this.previous_pos = d3.mouse(this.el);
        // A copy of the original domains is required to avoid additional
        // drift when Paning.
        this.domains_in_order = {
            "x": (scales.x || []).map(function(s) {
                return s.get_domain_slice_in_order();
            }),
            "y": (scales.y || []).map(function(s) {
                return s.get_domain_slice_in_order();
            }),
        };
    }

    mouseup () {
        this.active = false;
    }

    mousemove() {
        if (this.active && this.model.get("allow_pan")) {
            // If memory is set to true, intermediate positions between the
            // last position of the mouse and the current one will be
            // interpolated.
            const mouse_pos = d3.mouse(this.el);
            if (this.previous_pos === undefined) {
                this.previous_pos = mouse_pos;
            }
            const scales = this.model.get("scales");
            const that = this;
            this.scale_promises.then(function(scale_views) {
                const xscale_views = scale_views.x;
                const xdomains = that.domains_in_order.x;
                const xdiffs = xscale_views.map(function(view) {
                    if (view.scale.invert) {
                        // Categorical scales don't have an inversion.
                        return view.scale.invert(mouse_pos[0]) -
                               view.scale.invert(that.previous_pos[0]);
                    }
                });
                let domain, min, max;
                for (let i=0; i<xscale_views.length; i++) {
                    domain = xdomains[i];
                    min = domain[0] - xdiffs[i];
                    max = domain[1] - xdiffs[i];
                    that.set_scale_attribute(scales.x[i], "min", min);
                    that.set_scale_attribute(scales.x[i], "max", max);
                    // TODO? Only do in mouseup?
                    xscale_views[i].touch();
                }

                const yscale_views = scale_views.y;
                const ydomains = that.domains_in_order.y;
                const ydiffs = yscale_views.map(function(view) {
                    if (view.scale.invert) {
                        // Categorical scales don't have an inversion.
                        return view.scale.invert(mouse_pos[1]) -
                               view.scale.invert(that.previous_pos[1]);
                    }
                });
                for (let i=0; i<yscale_views.length; i++) {
                    domain = ydomains[i];
                    min = domain[0] - ydiffs[i];
                    max = domain[1] - ydiffs[i];
                    that.set_scale_attribute(scales.y[i], "min", min);
                    that.set_scale_attribute(scales.y[i], "max", max);
                    // TODO? Only do this on mouseup?
                    yscale_views[i].touch();
                }

            });
        }
    }

    mousewheel() {
        if (this.model.get("allow_zoom")) {
            d3GetEvent().preventDefault();
            // With Firefox, wheelDelta is undefined.
            const delta = d3GetEvent().wheelDelta || d3GetEvent().detail * (-40);
            const mouse_pos = d3.mouse(this.el);
            if (delta) {
                if (delta > 0) {
                    this.d3el.style("cursor", "zoom-in");
                } else {
                    this.d3el.style("cursor", "zoom-out");
                }
                const scales = this.model.get("scales");
                const that = this;
                this.scale_promises.then(function(scale_views) {
                    let domain;
                    let min;
                    let max;
                    const xscale_views = scale_views.x;
                    const xpos = xscale_views.map(function(view) {
                         return view.scale.invert(mouse_pos[0]);
                    });
                    const factor = Math.exp(-delta * 0.001);
                    for (let i=0; i<xscale_views.length; i++) {
                        domain = scales.x[i].get_domain_slice_in_order();
                        min = domain[0];
                        max = domain[1];
                        that.set_scale_attribute(scales.x[i], "min",
                                    (1 - factor) * xpos[i] + factor * min);
                        that.set_scale_attribute(scales.x[i], "max",
                                    (1 - factor) * xpos[i] + factor * max);
                        // TODO? Only do in mouseup?
                        xscale_views[i].touch();
                    }

                    const yscale_views = scale_views.y;
                    const ypos = yscale_views.map(function(view) {
                        return view.scale.invert(mouse_pos[1]);
                    });
                    for (let i=0; i<yscale_views.length; i++) {
                        domain = scales.y[i].get_domain_slice_in_order();
                        min = domain[0];
                        max = domain[1];
                        that.set_scale_attribute(scales.y[i], "min",
                                    (1 - factor) * ypos[i] + factor * min);
                        that.set_scale_attribute(scales.y[i], "max",
                                    (1 - factor) * ypos[i] + factor * max);
                        // TODO? Only do this on mouseup?
                        yscale_views[i].touch();
                    }
                });
            }
        }
    }

    set_scale_attribute(scale, attribute_name, value) {
        // The difference of two dates is an int. So we want to cast it to
        // a date when setting the attribute for the date scale
        if(scale.type == "date") {
            value = (value instanceof Date) ? value : new Date(value);
            //TODO: function for setting date can be made the same as for
            //other scale once the _pack_models is fixes
            scale.set_date_elem(attribute_name, value);
        } else {
            scale.set(attribute_name, value);
        }
    }

    active: boolean;
    scale_promises: any;
    previous_pos: any;
    domains_in_order: any;
}

