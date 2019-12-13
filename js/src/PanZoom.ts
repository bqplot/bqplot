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

    mousedown() {
        this._mousedown(d3.mouse(this.el));
    }

    _mousedown(mouse_pos) {
        const scales = this.model.get("scales");
        this.active = true;
        this.d3el.style("cursor", "move");
        this.previous_pos = mouse_pos.slice();
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
        this._mousemove(d3.mouse(this.el));
    }

    _mousemove(mouse_pos) {
        if (this.active && this.model.get("allow_pan")) {
            // If memory is set to true, intermediate positions between the
            // last position of the mouse and the current one will be
            // interpolated.
            if (this.previous_pos === undefined) {
                this.previous_pos = mouse_pos;
            }
            const mouse_delta = {
                x: mouse_pos[0] - this.previous_pos[0],
                y: mouse_pos[1] - this.previous_pos[1],
            }
            return this.scale_promises.then((scale_views) => {
                ["x", "y"].forEach((dimension) => {
                    scale_views[dimension].forEach((view, index) => {
                        if (view.scale.invert) { // Categorical scales don't have an inversion.
                            const scale = view.scale.copy().domain(this.domains_in_order[dimension][index]);
                            // convert the initial domain to pixel coordinates
                            const pixel_min = scale(this.domains_in_order[dimension][index][0]);
                            const pixel_max = scale(this.domains_in_order[dimension][index][1]);
                            // shift pixels, and convert to new domain
                            const domain_min = scale.invert(pixel_min - mouse_delta[dimension]);
                            const domain_max = scale.invert(pixel_max - mouse_delta[dimension]);
                            this.set_scale_attribute(view.model, "min", domain_min);
                            this.set_scale_attribute(view.model, "max", domain_max);
                            view.touch();
                        }
                    });
                });
            });
        }
    }

    mousewheel() {
        if (this.model.get("allow_zoom")) {
            d3GetEvent().preventDefault();
            // With Firefox, wheelDelta is undefined.
            const delta = d3GetEvent().wheelDelta || d3GetEvent().detail * (-40);
            const mouse_pos = d3.mouse(this.el);
            this._zoom(mouse_pos, delta);
        }
    }

    _zoom(mouse_pos, delta) {
        if (delta) {
            if (delta > 0) {
                this.d3el.style("cursor", "zoom-in");
            } else {
                this.d3el.style("cursor", "zoom-out");
            }
            const mouse = {x: mouse_pos[0], y: mouse_pos[1]};
            const factor = Math.exp(-delta * 0.001);
            return this.scale_promises.then((scale_views) => {
                ["x", "y"].forEach((dimension) => {
                    scale_views[dimension].forEach((view, index) => {
                        if (view.scale.invert) { // Categorical scales don't have an inversion.
                            const scale = view.scale;//.copy().domain(this.domains_in_order[dimension][index]);
                            // convert the initial domain to pixel coordinates
                            let [domain_min, domain_max] = view.model.get_domain_slice_in_order();
                            const pixel_min = scale(domain_min);
                            const pixel_max = scale(domain_max);
                            // take a weighted average between the mouse pos and the original pixel coordinate
                            // and translate that back to the domain
                            domain_min = scale.invert((1 - factor) * mouse[dimension] + factor * pixel_min);
                            domain_max = scale.invert((1 - factor) * mouse[dimension] + factor * pixel_max);
                            this.set_scale_attribute(view.model, "min", domain_min);
                            this.set_scale_attribute(view.model, "max", domain_max);
                            view.touch();
                        }
                    });
                });
            });
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

