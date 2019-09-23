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
// var d3 =Object.assign({}, require("d3-selection"), require("d3-zoom"));
const d3GetEvent = () => { return require("d3-selection").event };
import { Mark } from './Mark';
import { MapModel } from './MapModel';

export class Map extends Mark {

    render() {
        const base_render_promise = super.render();

        this.map = this.d3el.append("svg")
            .attr("viewBox", "0 0 1200 980");
        this.width = this.parent.plotarea_width;
        this.height = this.parent.plotarea_height;
        this.map_id = widgets.uuid();
        this.enable_hover = this.model.get("enable_hover");
        this.display_el_classes = ["event_layer"];
        this.displayed.then(() => {
            this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
            this.create_tooltip();
        });

        return base_render_promise.then(() => {
            this.event_listeners = {};
            this.process_interactions();
            this.create_listeners();
            this.draw();
        });
    }

    set_ranges() {
    }

    set_positional_scales() {
        const geo_scale = this.scales.projection;
        this.listenTo(geo_scale, "domain_changed", () => {
            if (!this.model.dirty) { this.draw(); }
        });
    }

    initialize_additional_scales() {
        const color_scale = this.scales.color;
        if(color_scale) {
            this.listenTo(color_scale, "domain_changed", () => {
                this.update_style();
            });
            color_scale.on("color_scale_range_changed",
                           this.update_style, this);
        }
    }

    remove_map() {
        d3.selectAll(".world_map.map" + this.map_id).remove();
    }

    draw() {
        this.set_ranges();
        this.remove_map();
        this.transformed_g = this.map.append("g")
            .attr("class", "world_map map" + this.map_id);
        this.fill_g = this.transformed_g.append("g");
        this.highlight_g = this.transformed_g.append("g");
        this.stroke_g = this.transformed_g.append("g");
        const projection = this.scales.projection;
        //Bind data and create one path per GeoJSON feature
        this.fill_g.selectAll("path")
            .data(this.model.geodata)
            .enter()
            .append("path")
            .attr("d", projection.path)
            .style("fill", (d, i) => {
                return this.fill_g_colorfill(d, i);
            });
        this.stroke_g.selectAll("path")
            .data(this.model.geodata)
            .enter()
            .append("path")
            .attr("class", "event_layer")
            .attr("d", projection.path)
            .style("fill-opacity", 0.0)
            .on("click", (d, i) => {
                return this.event_dispatcher("element_clicked", {"data": d, "index": i});
            });
        if(this.validate_color(this.model.get("stroke_color"))) {
            this.stroke_g.selectAll("path")
                .style("stroke", this.model.get("stroke_color"));
        }
        this.zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", () => {
               this.zoomed(this);
            });
        this.parent.bg_events.call(this.zoom);

        this.parent.bg_events.on("dblclick.zoom", null);
        this.parent.bg_events.on("dblclick", () => {
            this.reset_zoom(this);
        });
    }

    validate_color(color) {
        return color !== "";
    }

    mouseover_handler() {
        if (!this.model.get("hover_highlight")) {
            return;
        }
        const el = d3.select(d3GetEvent().target);
        if(this.is_hover_element(el)) {
            const data: any = el.data()[0];
            const idx = this.model.get("selected") || [];
            const select = Array.from(idx);
            const node = this.highlight_g.append(() => {
                return el.node().cloneNode(true);
            });
            node.classed("hovered", true);
            node.classed("event_layer", false);

            if(this.validate_color(this.model.get("hovered_styles").hovered_stroke) &&
                select.indexOf(data.id) === -1) {
                node.style("stroke", this.model.get("hovered_styles").hovered_stroke)
                    .style("stroke-width", this.model.get("hovered_styles").hovered_stroke_width);
            }
            if(this.validate_color(this.model.get("hovered_styles").hovered_fill) &&
                select.indexOf(data.id) === -1) {
                node.style("fill-opacity", 1.0)
                    .style("fill", () => {
                        return this.model.get("hovered_styles").hovered_fill;
                    });
            }
        }
    }

    mouseout_handler() {
        if (!this.model.get("hover_highlight")) {
            return;
        }
        const el = d3.select(d3GetEvent().target);
        if(this.is_hover_element(el)) {
            el.transition("mouseout_handler")
            .style("fill", (d, i) => {
                return this.fill_g_colorfill(d, i);
            })
            .style("stroke", (d, i) => {
                return this.hoverfill(d, i);
            });
            this.highlight_g.selectAll(".hovered").remove();
        }
    }

    click_handler() {
        const el = d3.select(d3GetEvent().target);
        if(this.is_hover_element(el)) {
            const data: any = el.data()[0];
            const idx = this.model.get("selected") || [];
            const selected = Array.from(idx);
            const elem_index = selected.indexOf(data.id);
            if(elem_index > -1) {
                selected.splice(elem_index, 1);
                el.transition("click_handler")
                    .style("fill-opacity", 0.0);
                this.highlight_g.selectAll(".hovered").remove();
                const choice = "#c".concat(data.id.toString());
                d3.select(choice).remove();
            } else {
                this.highlight_g.selectAll(".hovered").remove();
                this.highlight_g.append(() => {
                    return el.node().cloneNode(true);
                })
                .attr("id", "c" + data.id)
                .classed("selected", true)
                .classed("event_layer", false);

                if (this.validate_color(this.model.get("selected_styles").selected_fill)) {
                    this.highlight_g.selectAll(".selected")
                        .style("fill-opacity", 1.0)
                        .style("fill", this.model.get("selected_styles").selected_fill);
                }

                if (this.validate_color(this.model.get("selected_styles").selected_stroke)) {
                    this.highlight_g.selectAll(".selected")
                        .style("stroke", this.model.get("selected_styles").selected_stroke)
                        .style("stroke-width", this.model.get("selected_styles").selected_stroke_width);
                }
                selected.push(data.id);
                this.model.set("selected", selected);
                this.touch();
            }
        this.model.set("selected",
            ((selected.length === 0) ? null : selected),
            {updated_view: this});
        this.touch();
        }
    }

    reset_zoom(that) {
        that.zoom.transform(that.parent.bg, d3.zoomIdentity);
    }

    zoomed(that) {
        const tr = d3GetEvent().transform;
        const h = that.height / 3;
        const w = 2 * that.width;
        tr.x = Math.min(that.width / 2 * (tr.k -1), Math.max(w / 2  * (1 - tr.k), tr.x));
        tr.y = Math.min(that.height / 2 * (tr.k - 1) + this.height * tr.k, Math.max(h / 2 * (1 - tr.k) - that.width * tr.k, tr.y));
        that.transformed_g.style("stroke-width", 1 / tr.k)
            .attr("transform", tr);
    }

    create_listeners() {
        this.d3el.on("mouseover", () => { this.event_dispatcher("mouse_over"); })
            .on("mousemove", () => { this.event_dispatcher("mouse_move"); })
            .on("mouseout", () => { this.event_dispatcher("mouse_out"); });

        this.listenTo(this.model, "data_updated", this.draw);
        this.listenTo(this.model, "change:color", this.update_style);
        this.listenTo(this.model, "change:stroke_color", this.change_stroke_color);
        this.listenTo(this.model, "change:colors", this.change_map_color);
        this.listenTo(this.model, "change:selected", this.change_selected);
        this.listenTo(this.model, "change:selected_styles", () => {
            this.change_selected_fill();
            this.change_selected_stroke();
        });
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", () => {
            this.event_dispatcher("parent_clicked");
        });
    }

    process_click(interaction) {
        super.process_click([interaction]);
        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.click_handler;
        }
    }

    process_hover(interaction) {
        super.process_hover([interaction]);
        if(interaction === "tooltip") {
            this.event_listeners.mouse_over = () => {
                this.mouseover_handler();
                return this.refresh_tooltip();
            };
            this.event_listeners.mouse_move = this.move_tooltip;
            this.event_listeners.mouse_out = () => {
                this.mouseout_handler();
                return this.hide_tooltip();
            };
        }
    }

    change_selected_fill() {
        if (!this.validate_color(this.model.get("selected_styles").selected_fill)) {
            this.highlight_g.selectAll(".selected")
                .style("fill-opacity", 0.0);
        } else {
            this.highlight_g.selectAll(".selected")
                .style("fill-opacity", 1.0)
                .style("fill", this.model.get("selected_styles").selected_fill);
        }
    }

    change_selected_stroke() {
        if (!this.validate_color(this.model.get("selected_styles").selected_stroke)) {
            this.highlight_g.selectAll(".selected")
                .style("stroke-width", 0.0);
        } else {
            this.highlight_g.selectAll(".selected")
                .style("stroke-width", this.model.get("selected_styles").selected_stroke_width)
                .style("stroke", this.model.get("selected_styles").selected_stroke);
        }
    }

    change_selected() {
        this.highlight_g.selectAll("path").remove();
        const idx = this.model.get("selected");
        const select = idx ? idx : [];
        const temp = this.stroke_g.selectAll("path").data();
        this.stroke_g.selectAll("path").style("stroke", (d, i) => {
            return this.hoverfill(d, i);
        });
        const nodes = this.stroke_g.selectAll("path");
        for (let i=0; i<temp.length; i++) {
            if(select.indexOf(temp[i].id) > -1) {
                this.highlight_g.append(() => {
                    return nodes.nodes()[i].cloneNode(true);
                }).attr("id", temp[i].id)
                .style("fill-opacity", () => {
                    if (this.validate_color(this.model.get("selected_styles").selected_fill)) {
                        return 1.0;
                    } else {
                        return 0.0;
                    }
                })
                .style("fill", this.model.get("selected_styles").selected_fill)
                .style("stroke-opacity", () => {
                    if (this.validate_color(this.model.get("selected_styles").selected_stroke)) {
                        return 1.0;
                    } else {
                        return 0.0;
                    }
                })
                .style("stroke", this.model.get("selected_styles").selected_stroke)
                .style("stroke-width", this.model.get("selected_styles").selected_stroke_width)
                .classed("selected", true);
            }
        }
    }

    reset_selection() {
        this.model.set("selected", []);
        this.touch();
        this.highlight_g.selectAll(".selected").remove();
        d3.select(this.d3el.parentNode)
            .selectAll("path")
            .classed("selected", false);
        d3.select(this.d3el.parentNode)
            .selectAll("path")
            .classed("hovered", false);

        this.stroke_g.selectAll("path").style("stroke", (d, i) => {
            return this.hoverfill(d, i);
        });
        this.fill_g.selectAll("path").classed("selected", false)
            .style("fill", (d, i) => {
                return this.fill_g_colorfill(d, i);
            });
    }

    change_stroke_color() {
        this.stroke_g.selectAll("path")
            .style("stroke", this.model.get("stroke_color"));
    }

    change_map_color() {
        if (!this.is_object_empty(this.model.get("color"))) {
            return;
        }
        this.fill_g.selectAll("path").style("fill", (d, i) => {
            return this.fill_g_colorfill(d, i);
        });
    }

    update_style() {
        const color_data = this.model.get("color");
        if (!this.is_object_empty(color_data)) {
            this.fill_g.selectAll("path").style("fill", (d, i) => {
                return this.fill_g_colorfill(d, i);
            });
        }
    }

    is_object_empty(object: any) {
        return Object.keys(object).length === 0 && object.constructor === Object;
    }

    hoverfill(d, j) {
        const idx = this.model.get("selected");
        const select = idx ? idx : [];
        if (select.indexOf(d.id) > -1 &&
            this.validate_color(this.model.get("selected_styles").selected_stroke)) {
            return this.model.get("selected_styles").selected_stroke;
        } else {
            return this.model.get("stroke_color");
        }
    }

    fill_g_colorfill(d, j) {
        const color_scale = this.scales.color;
        const idx = this.model.get("selected");
        const selection = idx ? idx : [];
        const color_data = this.model.get("color");
        const colors = this.model.get("colors");

        if (selection.indexOf(d.id) > -1) {
		    return this.model.get("selected_styles").selected_fill;
        } else if (this.is_object_empty(color_data)) {
		    return colors[d.id] || colors.default_color;
        } else if (color_data[d.id] === undefined ||
                   color_data[d.id] === null ||
                   color_data[d.id] === "nan" ||
                   color_scale === undefined) {
            return colors.default_color;
        } else {
            return color_scale.scale(color_data[d.id]);
        }
    }

    clear_style() {}
    compute_view_padding() {}
    set_default_style() {}
    set_style_on_elements() {}

    map: any;
    map_id: any;
    width: any;
    height: any;
    enable_hover: any;
    stroke_g: any;
    fill_g: any;
    highlight_g: any;
    transformed_g: any;
    zoom: any;
    model: MapModel;
};
