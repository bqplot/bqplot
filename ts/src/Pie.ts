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

import * as d3 from 'd3';
import 'd3-selection-multi';
// var d3 =Object.assign({}, require("d3-array"), require("d3-format"), require("d3-interpolate"), require("d3-shape"));
// Hack to fix problem with webpack providing multiple d3 objects
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import { Mark } from './Mark';
import { getDate } from './utils';

export class Pie extends Mark {
    render() {
        const base_creation_promise = super.render();
        this.selected_indices = this.model.get("selected");
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");

        this.display_el_classes = ["slice", "text"];

        this.pie_g = this.d3el.append("g").attr("class", "pie");
        this.pie_g.append("g").attr("class", "slices");
        this.pie_g.append("g").attr("class", "labels");
        this.pie_g.append("g").attr("class", "lines");

        const radius = this.model.get("radius");
        const inner_radius = this.model.get("inner_radius");

        const display_labels = this.model.get("display_labels");

        if (display_labels === "outside") {
            this.arc = d3.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(inner_radius * 0.8);

            this.outer_arc = d3.arc()
                .innerRadius(radius * 0.9)
                .outerRadius(radius * 0.9);
        } else {
            this.arc = d3.arc()
                .outerRadius(radius)
                .innerRadius(inner_radius);
        }

        this.displayed.then(() => {
            this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
            this.create_tooltip();
        });

        return base_creation_promise.then(() => {
            this.event_listeners = {};
            this.process_interactions();
            this.create_listeners();
            this.compute_view_padding();
            this.draw();
        }, null);
    }

    set_ranges() {
        const x_scale = this.scales.x;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            this.x_offset = x_scale.offset;
        }
        const y_scale = this.scales.y;
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            this.y_offset = y_scale.offset;
        }
    }

    set_positional_scales() {
        // If no scale for "x" or "y" is specified, figure scales are used.
        const x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        const y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        const that = this;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!that.model.dirty) { that.draw(); }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!that.model.dirty) { that.draw(); }
        });
    }

    create_listeners() {
        super.create_listeners();
        this.d3el
          .on("mouseover", _.bind(function() {
              this.event_dispatcher("mouse_over");
          }, this))
          .on("mousemove", _.bind(function() {
              this.event_dispatcher("mouse_move");
          }, this))
          .on("mouseout", _.bind(function() {
              this.event_dispatcher("mouse_out");
          }, this));

        this.listenTo(this.model, "data_updated", function() {
            //animate on data update
            const animate = true;
            this.draw(animate);
        });
        this.listenTo(this.model, "colors_updated", this.updateSlices);
        this.model.on_some_change(["inner_radius", "radius"], function() {
            this.compute_view_padding();
            const animate = true;
            this.update_radius(animate);
        }, this);
        this.model.on_some_change(["colors", "stroke", "opacities"], this.updateSlices, this);
        this.model.on_some_change(["x", "y"], function() {
            const animate = true;
            this.position_center(animate);
        }, this);
        this.model.on_some_change(["display_labels", "label_color", "font_size", "font_weight", "display_values", "values_format"], function() {
            const animate = true;
            this.updateLabels(animate);
        }, this);
        this.model.on_some_change(["start_angle", "end_angle", "sort"], function() {
            const animate = true;
            this.draw(animate);
        }, this);

        this.listenTo(this.model, "labels_updated", function() {
            const animate = true;
            this.updateLabels(animate);
            this.updatePolylines(animate);
        });

        this.listenTo(this.model, "change:selected", function() {
            this.selected_indices = this.model.get("selected");
            this.apply_styles();
        });
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    }

    process_click(interaction) {
        super.process_click(interaction);
        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.click_handler;
        }
    }

    relayout() {
        this.set_ranges();
        this.position_center();
        this.update_radius();
    }

    position_center(animate?: boolean) {
        const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        const x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        const y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;
        const x = (x_scale.model.type === "date") ?
            getDate(this.model.get("x")) : this.model.get("x");
        const y = (y_scale.model.type === "date") ?
            getDate(this.model.get("y")) : this.model.get("y");
        const transform = "translate(" + (x_scale.scale(x) + x_scale.offset) +
                                ", " + (y_scale.scale(y) + y_scale.offset) + ")";
        this.pie_g
            .transition("position_center").duration(animation_duration)
            .attr("transform", transform);
    }

    update_radius(animate?: boolean) {
        const animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        const radius = this.model.get("radius");
        const inner_radius = this.model.get("inner_radius");
        const display_labels = this.model.get("display_labels");

        if(display_labels === "inside") {
            this.arc.outerRadius(radius).innerRadius(inner_radius);
        } else if(display_labels === "outside") {
            this.arc.outerRadius(radius * 0.8).innerRadius(inner_radius * 0.8);
            this.outer_arc.innerRadius(radius * 0.9).outerRadius(radius * 0.9);
        }

        const slices = this.pie_g.select(".slices");
        const labels = this.pie_g.select(".labels");
        const lines = this.pie_g.select(".lines");

        const that = this;

        slices.selectAll(".slice")
            .transition("update_radius").duration(animation_duration)
            .attr("d", this.arc);

        if(display_labels === "inside") {
            labels.selectAll("text")
                .transition("update_radius").duration(animation_duration)
                .attr("transform", function(d) {
                    return "translate(" + that.arc.centroid(d) + ")";
                });
        } else if(display_labels === "outside") {
            labels.selectAll("text")
                .transition("update_radius").duration(animation_duration)
                .attr("transform", function(d) {
                    const pos = that.outer_arc.centroid(d);
                    pos[0] = radius * (that.mid_angle_location(d) === "left" ? -1 : 1);
                    return "translate(" + pos + ")";
                });

            lines.selectAll("polyline")
                .transition("update_radius").duration(animation_duration)
                .attr("points", function(d) {
                    const pos = that.outer_arc.centroid(d);
                    pos[0] = radius * 0.95 * (that.mid_angle_location(d) === "left" ? -1 : 1);
                    return [that.arc.centroid(d), that.outer_arc.centroid(d), pos];
                });
        }
    }

    mid_angle_location(arc_data) {
        // decides if the location of the mid angle of the arc is toward left or right (to aid the
        // placement of label text)
        const mid_angle = (arc_data.startAngle + arc_data.endAngle) / 2;
        return (mid_angle > Math.PI || (mid_angle < 0 && mid_angle > -Math.PI)) ? "left" : "right";
    }

    draw(animate?: boolean) {
        this.set_ranges();
        this.position_center(animate);

        this.d3Pie = d3.pie()
            .startAngle(this.model.get("start_angle") * 2 * Math.PI/360)
            .endAngle(this.model.get("end_angle") * 2 * Math.PI/360)
            .value(function(d: any) { return d.size; });

        if(!this.model.get("sort")) { this.d3Pie.sort(null); }

        this.updateSlices(animate);
        this.updateLabels(animate);
        this.updatePolylines(animate);
    }

    updateSlices (animate?: boolean) {
        const that = this;
        const animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        // update pie slices
        const slices = this.pie_g.select(".slices")
            .selectAll(".slice")
            .data(this.d3Pie(this.model.mark_data));

        const stroke = this.model.get("stroke");
        const opacities = this.model.get("opacities");
        const colorScale = this.scales.color;

        slices.enter()
            .append('path')
            .attr('class', 'slice')
            .each(function(d) {
                this._current = d;
            })
            .on("click", function(d, i) {
                return that.event_dispatcher("element_clicked", {data: d, index: i});}
            )
            .merge(slices)
            .transition("draw")
            .duration(animation_duration)
            .style("fill", function(d, i) {
                return (d.data.color !== undefined && colorScale !== undefined) ?
                    colorScale.scale(d.data.color) : that.get_colors(d.data.index);
            })
            .style('stroke', stroke)
            .style('opacity', (d, i) => opacities[i])
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate(this._current, d);
                this._current = d;
                return function(t) { return that.arc(interpolate(t)); };
            });

        slices.exit()
            .transition('remove')
            .duration(animation_duration)
            .style('opacity', 0)
            .remove();

        this.apply_styles();
    }

    updateLabels (animate?: boolean) {
        const that = this;
        const animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        // Update labels
        const display_labels = this.model.get("display_labels");
        const display_values = this.model.get("display_values");

        const values_format = d3.format(this.model.get("values_format"));

        const labels = this.pie_g.select(".labels")
            .selectAll("text")
            .data(this.d3Pie(this.model.mark_data));

        const labelsTransition = labels.enter()
            .append("text")
            .attr("dy", ".35em")
            .style("opacity", 0)
            .each(function(d) {
                this._current = d;
            })
            .merge(labels)
            .transition("draw")
            .duration(animation_duration)
            .text((d) => {
                if (d.data.label === '') {
                    return '';
                }

                if (display_values) {
                    return d.data.label + ": " + values_format(d.data.size);
                }

                return d.data.label
            })
            .style("font-weight", this.model.get("font_weight"))
            .style("font-size", this.model.get("font_size"))
            .style("opacity", d => (display_labels === "none" || d.value == 0) ? 0 : 1);

        const color = this.model.get("label_color");
        if(color !== undefined) {
            labelsTransition.style("fill", color);
        }

        if (display_labels === "inside") {
            labelsTransition.attr("transform", d => "translate(" + this.arc.centroid(d) + ")")
                .style("text-anchor", "middle");
        } else if (display_labels === "outside") {
            labelsTransition.attrTween("transform", function(d) {
                const interpolate = d3.interpolate(this._current, d);
                const _this = this;
                return function(t) {
                    const d2 = interpolate(t);
                    _this._current = d2;
                    const pos = that.outer_arc.centroid(d2);
                    pos[0] = that.model.get("radius") *
                        (that.mid_angle_location(d) === "left" ?  -1 : 1);
                    return "translate(" + pos + ")";
                };
            })
            .styleTween("text-anchor", function(d) {
                const interpolate = d3.interpolate(this._current, d);
                return function(t) {
                    const d2 = interpolate(t);
                    return that.mid_angle_location(d2) === "left" ? "end" : "start";
                };
            });
        }

        labels.exit().remove();
    }

    updatePolylines (animate?: boolean) {
        const that = this;
        const animation_duration = animate === true ?
            this.parent.model.get("animation_duration") : 0;

        const display_labels = this.model.get("display_labels");

        const polylines = this.pie_g.select(".lines")
            .selectAll("polyline")
            .data(this.d3Pie(this.model.mark_data));

        const polylinesTransition = polylines.enter()
            .append("polyline")
            .each(function(d) {
                this._current = d;
            })
            .merge(polylines)
            .transition("draw")
            .duration(animation_duration)
            .style("opacity", d => (display_labels !== "outside" || d.value == 0 || d.data.label === "") ? 0 : 1);

        if (display_labels === 'outside') {
            polylinesTransition.attrTween("points", function(d) {
                this._current = this._current;
                const interpolate = d3.interpolate(this._current, d);
                const _this = this;
                return function(t) {
                    const d2 = interpolate(t);
                    _this._current = d2;
                    const pos = that.outer_arc.centroid(d2);
                    pos[0] = that.model.get("radius") * 0.95 *
                        (that.mid_angle_location(d2) === "left" ? -1 : 1);
                    return [that.arc.centroid(d2), that.outer_arc.centroid(d2), pos];
                };
            });
        }

        polylines.exit().remove();
    }

    clear_style(style_dict, indices?) {
        // Function to clear the style of a dict on some or all the elements of the
        // chart. If indices is null, clears the style on all elements. If
        // not, clears on only the elements whose indices are matching.
        let elements = this.pie_g.selectAll(".slice");
        if(indices) {
            elements = elements.filter(function(d, index) {
                return indices.indexOf(index) !== -1;
            });
        }
        const clearing_style = {};
        for(let key in style_dict) {
            clearing_style[key] = null;
        }
        elements.styles(clearing_style);
    }

    set_style_on_elements(style, indices?) {
        // If the index array is undefined or of length=0, exit the
        // function without doing anything
        if(indices === undefined || indices === null || indices.length === 0) {
            return;
        }
        let elements = this.pie_g.selectAll(".slice");
        elements = elements.filter(function(data, index) {
            return indices.indexOf(index) !== -1;
        });
        elements.styles(style);
    }

    set_default_style(indices?) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        const that = this;

        const stroke = this.model.get("stroke");
        const opacities = this.model.get("opacities");
        const colorScale = this.scales.color;

        // Update pie slices
        this.pie_g.select(".slices")
            .selectAll(".slice")
            .style('fill', function(d, i) {
                return (d.data.color !== undefined && colorScale !== undefined) ?
                    colorScale.scale(d.data.color) : that.get_colors(d.data.index);
            })
            .style('stroke', stroke)
            .style('opacity', (d, i) => opacities[i]);
    }

    click_handler (args) {
        const index = args.index;
        const that = this;
        const idx = this.model.get("selected") || [];
        let selected: number[] = Array.from(idx);
            // index of slice i. Checking if it is already present in the list.
        const elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
        if(elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the element from the list
            selected.splice(elem_index, 1);
        } else {
            if(d3GetEvent().shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if(elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //slice which has been clicked
                const min_index = (selected.length !== 0) ?
                    d3.min(selected) : -1;
                const max_index = (selected.length !== 0) ?
                    d3.max(selected) : that.model.mark_data.length;
                if(index > max_index){
                    _.range(max_index+1, index).forEach(function(i) {
                        selected.push(i);
                    });
                } else if(index < min_index){
                    _.range(index+1, min_index).forEach(function(i) {
                        selected.push(i);
                    });
                }
                } else if(!accelKey) {
                selected = [];
            }
            // updating the array containing the slice indexes selected
            // and updating the style
            selected.push(index);
        }
        this.model.set("selected",
            ((selected.length === 0) ? null : new Uint32Array(selected)),
            {updated_view: this});
        this.touch();
        const e = d3GetEvent();
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
        this.selected_indices = selected;
        this.apply_styles();
    }

    reset_selection() {
        this.model.set("selected", null);
        this.touch();
        this.selected_indices = null;
        this.clear_style(this.selected_style);
        this.clear_style(this.unselected_style);
        this.set_default_style();
    }

    compute_view_padding() {
        const scales = this.model.get("scales");
        const r = d3.max([this.model.get("radius"), this.model.get("inner_radius")]);

        const x_padding = (scales.x) ? (r+1) : 0;
        const y_padding = (scales.y) ? (r+1) : 0;
        if(x_padding !== this.x_padding || y_padding !== this.y_padding) {
            this.x_padding = x_padding;
            this.y_padding = y_padding;
            this.trigger("mark_padding_updated");
        }
    }

    d3Pie: any;
    pie_g: any;
    arc: any;
    outer_arc: any;
    x_offset: any;
    y_offset: any;
}
