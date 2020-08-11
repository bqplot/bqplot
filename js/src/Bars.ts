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
// import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"), require("d3-selection-multi"));
// Hack to fix problem with webpack providing multiple d3 objects
const d3GetEvent = function () { return require("d3-selection").event }.bind(this);

import * as _ from 'underscore';
import { Mark } from './Mark'
import { BarsModel } from './BarsModel'

export class Bars extends Mark {

    render() {
        const base_creation_promise = super.render.apply(this);
        this.set_internal_scales();
        this.selected_indices = this.model.get("selected");
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");

        this.display_el_classes = ["bar", "legendtext"];

        this.displayed.then(() => {
            this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
            this.create_tooltip();
        });

        return base_creation_promise.then(() => {
            this.event_listeners = {};
            this.process_interactions();
            this.create_listeners();
            this.compute_view_padding();
            this.draw(false);
        });
    }

    set_scale_orientation() {
        // TODO: we should probably use this.model.get("orientation")?
        // var orient = this.model.get("orientation");
        this.dom_scale = this.scales.x; //(orient === "vertical") ? this.scales.x : this.scales.y;
        this.range_scale = this.scales.y; //(orient === "vertical") ? this.scales.y : this.scales.x;
    }

    set_ranges() {
        const orient = this.model.get("orientation");
        this.set_scale_orientation();
        const dom_scale = this.dom_scale;
        const range_scale = this.range_scale;
        const dom = (orient === "vertical") ? "x" : "y";
        const rang = (orient === "vertical") ? "y" : "x";
        if (dom_scale.model.type !== "ordinal") {
            dom_scale.set_range(this.parent.padded_range(dom, dom_scale.model));
        } else {
            dom_scale.set_range(this.parent.padded_range(dom, dom_scale.model), this.model.get("padding"));
        }
        range_scale.set_range(this.parent.padded_range(rang, range_scale.model));
        // x_offset is set later by the adjust_offset method
        // This differs because it is not constant for a scale.
        // Changes based on the data.
        this.dom_offset = 0;
        this.range_offset = (orient === "vertical") ? range_scale.offset : -range_scale.offset;
    }

    set_positional_scales() {
        const x_scale = this.scales.x, y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function () {
            if (!this.model.dirty) {
                this.draw(true);
            }
        });
        this.listenTo(y_scale, "domain_changed", function () {
            if (!this.model.dirty) {
                this.draw(true);
            }
        });
    }

    set_internal_scales() {
        // Two scales to draw the bars.
        this.stacked_scale = d3.scaleBand();
        this.grouped_scale = d3.scaleBand();
    }

    adjust_offset() {
        // In the case of a linear scale, and when plotting ordinal data,
        // the value have to be negatively offset by half of the width of
        // the bars, because ordinal scales give the values corresponding
        // to the start of the bin but linear scale gives the actual value.
        const dom_scale = this.dom_scale;
        if (dom_scale.model.type !== "ordinal") {
            if (this.model.get("align") === "center") {
                this.dom_offset = -(this.stacked_scale.bandwidth() / 2).toFixed(2);
            } else if (this.model.get("align") === "left") {
                this.dom_offset = -(this.stacked_scale.bandwidth()).toFixed(2);
            } else {
                this.dom_offset = 0;
            }
        } else {
            if (this.model.get("align") === "center") {
                this.dom_offset = 0;
            } else if (this.model.get("align") === "left") {
                this.dom_offset = -(this.stacked_scale.bandwidth() / 2);
            } else {
                this.dom_offset = (this.stacked_scale.bandwidth() / 2);
            }
        }
    }

    create_listeners() {
        super.create_listeners.apply(this);
        this.d3el
            .on("mouseover", () => {
                this.event_dispatcher("mouse_over");
            })
            .on("mousemove", () => {
                this.event_dispatcher("mouse_move");
            })
            .on("mouseout", () => {
                this.event_dispatcher("mouse_out");
            });

        this.listenTo(this.model, "data_updated", () => {
            //animate bars on data update
            const animate = true;
            this.draw(animate);
        });
        this.listenTo(this.model, "change:colors", this.update_colors);
        this.listenTo(this.model, "change:opacities", this.update_colors);
        this.listenTo(this.model, "colors_updated", this.update_colors);
        this.listenTo(this.model, "change:type", this.update_type);
        // FIXME: These are expensive calls for changing padding and align
        this.listenTo(this.model, "change:align", this.relayout);
        this.listenTo(this.model, "change:padding", this.relayout)
        this.listenTo(this.model, "change:orientation", this.relayout)
        this.listenTo(this.model, "change:tooltip", this.create_tooltip);
        this.model.on_some_change(['stroke', 'fill', 'stroke_width'], this.apply_styles, this);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", () => {
            this.event_dispatcher("parent_clicked");
        });
        this.model.on_some_change([
            "label_display_format",
            "label_font_style",
            "label_display",
            "label_display_vertical_offset",
            "label_display_horizontal_offset"],
            this.draw, this);
    }

    process_click(interaction) {
        super.process_click(interaction);
        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.bar_click_handler;
        }
    }

    draw_zero_line() {
        this.set_scale_orientation();
        const range_scale = this.range_scale;
        const orient = this.model.get("orientation");
        if (orient === "vertical") {
            this.d3el.select(".zeroLine")
                .attr("x1", 0)
                .attr("x2", this.parent.plotarea_width)
                .attr("y1", range_scale.scale(this.model.base_value))
                .attr("y2", range_scale.scale(this.model.base_value));
        } else {
            this.d3el.select(".zeroLine")
                .attr("x1", range_scale.scale(this.model.base_value))
                .attr("x2", range_scale.scale(this.model.base_value))
                .attr("y1", 0)
                .attr("y2", this.parent.plotarea_height);
        }
    }

    update_internal_scales() {
      this.stacked_scale.rangeRound(this.set_x_range());
      // This padding logic is duplicated from OrdinalScale
      // and should be factorized somewhere
      const padding = this.model.get("padding");
      this.stacked_scale.paddingInner(padding);
      this.stacked_scale.paddingOuter(padding / 2.0);
      this.adjust_offset();
      this.grouped_scale.rangeRound([0, this.stacked_scale.bandwidth().toFixed(2)]);
    }

    relayout() {
        this.set_ranges();
        this.compute_view_padding();
        this.draw_zero_line();
        this.update_internal_scales();
        this.draw_bars();
    }

    invert_point(pixel) {
        if (pixel === undefined) {
            this.model.set("selected", null);
            this.touch();
            return;
        }

        const abs_diff = this.x_pixels.map((elem) => { return Math.abs(elem - pixel); });
        this.model.set("selected", new Uint32Array([abs_diff.indexOf(d3.min(abs_diff))]));
        this.touch();
    }

    selector_changed(point_selector, rect_selector) {
        if (point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        const pixels = this.pixel_coords;
        const indices = new Uint32Array(_.range(pixels.length));
        // Here we only select bar groups. It shouldn't be too hard to select
        // individual bars, the `selected` attribute would then be a list of pairs.
        const selected_groups = indices.filter(index => {
            let bars = pixels[index];
            for (let i = 0; i < bars.length; i++) {
                if (rect_selector(bars[i])) { return true; }
            } return false;
        });
        this.model.set("selected", selected_groups);
        this.touch();
    }

    update_selected(model, value) {
        this.selected_indices = value;
        this.apply_styles();
    }

    draw(animate?: boolean) {
        this.set_ranges();
        const that = this;
        let bar_groups = this.d3el.selectAll(".bargroup")
            .data(this.model.mark_data, (d) => d.key);

        const dom_scale = this.dom_scale;
        // this.stacked_scale is the ordinal scale used to draw the bars. If a linear
        // scale is given, then the ordinal scale is created from the
        // linear scale.
        if (dom_scale.model.type !== "ordinal") {
            const model_domain = this.model.mark_data.map((elem) => elem.key);
            this.stacked_scale.domain(model_domain);
        } else {
            this.stacked_scale.domain(dom_scale.scale.domain());
        }

        this.update_internal_scales();

        if (this.model.mark_data.length > 0) {
            this.grouped_scale.domain(_.range(this.model.mark_data[0].values.length))
                .rangeRound([0, this.stacked_scale.bandwidth().toFixed(2)]);
        }

        // Since we will assign the enter and update selection of bar_groups to
        // itself, we may remove exit selection first.
        bar_groups.exit().remove();

        bar_groups = bar_groups.enter()
            .append("g")
            .attr("class", "bargroup")
            .merge(bar_groups);
        // The below function sorts the DOM elements so that the order of
        // the DOM elements matches the order of the data they are bound
        // to. This is required to maintain integrity with selection.
        bar_groups.order();

        bar_groups.on("click", function (d, i) {
            return that.event_dispatcher("element_clicked",
                { "data": d, "index": i });
        });

        const bars_sel = bar_groups.selectAll(".bar")
            .data((d) => d.values);

        // default values for width and height are to ensure smooth
        // transitions
        bars_sel.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("width", 0)
            .attr("height", 0);

        bars_sel.exit().remove();

        if (!this.model.get("label_display")) {
            bar_groups.selectAll("text").remove();
        }

        if (this.model.get("label_display")) {
            const bar_labels = bar_groups.selectAll(".bar_label")
            .data((d) => d.values);

            bar_labels.exit().remove();

            bar_labels.enter()
                .append("text")
                .attr("class", "bar_label")
                .attr("width", 0)
                .attr("height", 0);
        }

        this.draw_bars(animate);
        // this.draw_bar_labels(); TODO

        this.apply_styles();

        this.d3el.selectAll(".zeroLine").remove();
        this.d3el.append("g")
            .append("line")
            .attr("class", "zeroLine");

        this.draw_zero_line();
    }

    draw_bars(animate?: boolean) {
        const bar_groups = this.d3el.selectAll(".bargroup");
        const bars_sel = bar_groups.selectAll(".bar");
        const animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        const that = this;
        const orient = this.model.get("orientation");

        const dom_scale = this.dom_scale;
        const range_scale = this.range_scale;

        const dom = (orient === "vertical") ? "x" : "y";
        const rang = (orient === "vertical") ? "y" : "x";

        const dom_control = (orient === "vertical") ? "width" : "height";
        const range_control = (orient === "vertical") ? "height" : "width";

        if (dom_scale.model.type === "ordinal") {
            const dom_max = d3.max(this.parent.range(dom));
            bar_groups.attr("transform", function (d) {
                if (orient === "vertical") {
                    return "translate(" + ((dom_scale.scale(d.key) !== undefined ?
                        dom_scale.scale(d.key) : dom_max) + that.dom_offset) + ", 0)"
                } else {
                    return "translate(0, " + ((dom_scale.scale(d.key) !== undefined ?
                        dom_scale.scale(d.key) : dom_max) + that.dom_offset) + ")"
                }
            });
        } else {

            bar_groups.attr("transform", function (d) {
                if (orient === "vertical") {
                    return "translate(" + (dom_scale.scale(d.key) + that.dom_offset) + ", 0)";
                } else {
                    return "translate(0, " + (dom_scale.scale(d.key) + that.dom_offset) + ")";
                }
            });
        }

        const is_stacked = (this.model.get("type") === "stacked");
        let band_width = 1.0;
        if (is_stacked) {
            band_width = Math.max(1.0, this.stacked_scale.bandwidth());
            bars_sel.transition().duration(animation_duration)
                .attr(dom, 0)
                .attr(dom_control, band_width.toFixed(2))
                .attr(rang, function (d) {
                    return (rang === "y") ? range_scale.scale(d.y1) : range_scale.scale(d.y0);
                })
                .attr(range_control, function (d) {
                    return Math.abs(range_scale.scale(d.y1 + d.y_ref) - range_scale.scale(d.y1));
                });
        } else {
            band_width = Math.max(1.0, this.grouped_scale.bandwidth());
            bars_sel.transition().duration(animation_duration)
                .attr(dom, function (datum, index) {
                    return that.grouped_scale(index);
                })
                .attr(dom_control, band_width.toFixed(2))
                .attr(rang, function (d) {
                    return d3.min([range_scale.scale(d.y), range_scale.scale(that.model.base_value)]);
                })
                .attr(range_control, function (d) {
                    return Math.abs(range_scale.scale(that.model.base_value) - (range_scale.scale(d.y)));
                });
        }

        // adding/updating bar data labels
        this.manageBarLabels(bar_groups, band_width, dom, rang);

        this.pixel_coords = this.model.mark_data.map(d => {
            const key = d.key;
            const group_dom = dom_scale.scale(key) + this.dom_offset;
            return d.values.map((d) => {
                const rect_coords = {};
                rect_coords[dom] = is_stacked ? group_dom : group_dom + this.grouped_scale(d.sub_index);
                rect_coords[rang] = is_stacked ?
                    (rang === "y") ? range_scale.scale(d.y1) : range_scale.scale(d.y0) :
                    d3.min([range_scale.scale(d.y), range_scale.scale(this.model.base_value)]);
                rect_coords[dom_control] = band_width;
                rect_coords[range_control] = is_stacked ?
                    Math.abs(range_scale.scale(d.y1 + d.y_ref) - range_scale.scale(d.y1)) :
                    Math.abs(range_scale.scale(this.model.base_value) - (range_scale.scale(d.y_ref)));
                return [[rect_coords["x"], rect_coords["x"] + rect_coords["width"]],
                [rect_coords["y"], rect_coords["y"] + rect_coords["height"]]];
            })
        })
        this.x_pixels = this.model.mark_data.map((el) => {
            return dom_scale.scale(el.key) + dom_scale.offset;
        });
    }


    ///////////////////
    ///   Getters   ///
    ///////////////////

    /**
     * Get the vertical label offset from the model
     */
    get offsetVertical(): number {
        return this.model.get("label_display_vertical_offset");
    }

    /**
     * Get the horizontal label offset from the model
     */
    get offsetHorizontal(): number {
        return this.model.get("label_display_horizontal_offset");
    }

    /**
     * Get the baseline parameter from the model
     */
    get baseLine(): number {
        return this.model.get("base");
    }

    /**
     * Get the bar chart's orientation
     */
    get barOrientation(): string {
        return this.model.get("orientation");
    }


    //////////////////
    /// Bar labels ///
    //////////////////

    /**
     * Main entry point function for adding bar labels
     * @param barGroups - D3 selection for all bar groups
     * @param bandWidth - Bandwidth of the x or y axis
     * @param dom - X or y axis (depending on oridnetation)
     * @param rang - X or y axis (depending on orientation)
     */
    manageBarLabels(barGroups: any, bandWidth: number, dom: string, rang: string): void {
        if (!this.model.get("label_display")) {
            return
        }

        // Ladding the labels
        if (this.model.get("type") === "stacked") {
            this.stackedBarLabels(barGroups, bandWidth, dom, rang);
        } else {
            this.groupedBarLabels(barGroups, bandWidth);
        }

        // Styling the labels
        this.updateBarLabelsStyle();
    }

    /**
     * All bars are stacked by default. The only other value this parameter can take is 'grouped'
     * @param barGroups - D3 selection for bar groups
     * @param bandWidth - Bandwidth parameter for the bar dimensions
     * @param dom - X or y axis (depending on oridnetation)
     * @param rang - X or y axis (depending on oridnetation)
     */
    stackedBarLabels(barGroups: any, bandWidth: number, dom: string, rang: string): void {
        const baseLine = this.baseLine;
        const barOrientation = this.barOrientation;
        const barLabels = barGroups.selectAll(".bar_label");

        barLabels
            .attr(dom, d => 0)
            .attr(rang, d => {
                if (d.y <= baseLine) {
                    return this.range_scale.scale(d.y0);
                } else {
                    return this.range_scale.scale(d.y1);
                }
            })
            .style("font-weight", "400")
            .style("text-anchor", (d, i) => {
                return this.styleBarLabelTextAnchor(
                    d,
                    barOrientation,
                    baseLine);
            })
            .style("dominant-baseline", (d, i) => {
                return this.styleBarLabelDominantBaseline(
                    d,
                    baseLine,
                    barOrientation);
            })
            .attr("transform", (d, i) => {
                return this.transformBarLabel(
                    d,
                    baseLine,
                    this.offsetHorizontal,
                    this.offsetVertical,
                    bandWidth,
                    barOrientation);
            })
    }

    /**
     * Add labels for a chart with grouped bars
     * @param barGroups - D3 selection for bar group
     * @param bandWidth - bandwidth parameter for the X axis
     */
    groupedBarLabels(barGroups: any, bandWidth: number): void {
        const baseLine = this.baseLine;
        const barOrientation = this.barOrientation;
        const barLabels = barGroups.selectAll(".bar_label")

        barLabels
            .attr("x", (d, i) => {
                if (barOrientation === "horizontal") {
                    return this.range_scale.scale(d.y);
                } else {
                    return this.grouped_scale(i);
                }
            })
            .attr("y", (d, i) => {
                if (barOrientation === "horizontal") {
                    return this.grouped_scale(i);
                } else {
                    return this.range_scale.scale(d.y);
                }
            })
            .style("font-weight", "400")
            .style("text-anchor", (d, i) => {
                return this.styleBarLabelTextAnchor(
                    d,
                    barOrientation,
                    baseLine);
            })
            .style("dominant-baseline", (d, i) => {
                return this.styleBarLabelDominantBaseline(
                    d,
                    baseLine,
                    barOrientation);
            })
            .attr("transform", (d, i) => {
                return this.transformBarLabel(
                    d,
                    baseLine,
                    this.offsetHorizontal,
                    this.offsetVertical,
                    bandWidth,
                    barOrientation);
            })
    }

    /**
     * Applies CSS translate to shift label position according
     * to vertical/horizontal offsets
     * @param d - Data point
     * @param baseLine - The base line of the chart
     * @param offsetHorizontal - Horizontal offset, in pixels, of the label
     * @param offsetVertical - Vertical offset, in pixels, of the label
     * @param bandWidth - Bandwidth parameter for the bar dimantions
     * @param barOrientation - Orientation of the bar chart (horizontal/vertical)
     */
    transformBarLabel(
        d: any,
        baseLine: number,
        offsetHorizontal: number,
        offsetVertical: number,
        bandWidth: number,
        barOrientation: string): string {
        if (barOrientation === "horizontal") {
            return (d.y <= baseLine)
            ? `translate(${(d.y0 <= baseLine)
                ? (0 - offsetVertical)
                : (0 + offsetVertical)}, ${bandWidth / 2 + offsetHorizontal})`
            : `translate(${(d.y1 <= baseLine)
                ? (0 - offsetVertical)
                : (0 + offsetVertical)}, ${bandWidth / 2 + offsetHorizontal})`;
        } else {
            return (d.y <= baseLine)
            ? `translate(${bandWidth / 2 + offsetHorizontal},
                ${(d.y0 <= baseLine)
                    ? (0 - offsetVertical)
                    : (0 + offsetVertical)})`
            : `translate(${bandWidth / 2 + offsetHorizontal},
                ${(d.y1 <= baseLine)
                    ? (0 - offsetVertical)
                    : (0 + offsetVertical)})`;
        }
    }


    /**
     * Determines the value of the text-anchor CSS attribute
     * @param d - Data point
     * @param i - Index number
     * @param barOrientation - Orientation of the bar chart (horizontal/vertical)
     * @param baseLine - The base line of the chart
     */
    styleBarLabelTextAnchor(d: any, barOrientation: string, baseLine: number): string {
        if (barOrientation === "horizontal") {
            return (d.y <= baseLine) ? "start" : "end";
        } else {
            return "middle";
        }
    }

    /**
     * Determines the value of the dominant-base-line CSS attribute
     * @param d - Data point
     * @param i - Index number
     * @param baseLine - The base line of the chart
     * @param barOrientation - Orientation of the bar chart (horizontal/vertical)
     */
    styleBarLabelDominantBaseline(d: any, baseLine: number, barOrientation: string): string {
        if (barOrientation === "horizontal") {
            return "central";
        } else {
            return (d.y <= baseLine) ? "text-after-edge" : "text-before-edge";
        }
    }

    /**
     * Adds CSS styling to the bar labels
     */
    updateBarLabelsStyle(): void {
        const displayFormatStr = this.model.get("label_display_format");
        const displayFormat = displayFormatStr
        ? d3.format(displayFormatStr)
        : null;

        let fonts = this.d3el.selectAll(".bar_label")
            .text((d, i) => displayFormat ? displayFormat(d.y) : null);

        const fontStyle = this.model.get("label_font_style");

        for (const styleKey in fontStyle) {
            fonts = fonts.style(styleKey, fontStyle[styleKey]);
        }
    }

    ////////////////////////////
    ////// End bar labels //////
    ////////////////////////////
    update_type(model, value) {
        // We need to update domains here as the y_domain needs to be
        // changed when we switch from stacked to grouped.
        this.model.update_domains();
        this.draw();
    }

    update_colors() {
        //the following if condition is to handle the case of single
        //dimensional data.
        //if y is 1-d, each bar should be of 1 color.
        //if y is multi-dimensional, the corresponding values should be of
        //the same color.
        const stroke = this.model.get("stroke");
        if (this.model.mark_data.length > 0) {
            if (!(this.model.is_y_2d)) {
                this.d3el.selectAll(".bar")
                    .style("fill", this.get_mark_color.bind(this))
                    .style("stroke", stroke ? stroke : this.get_mark_color.bind(this))
                    .style("opacity", this.get_mark_opacity.bind(this));
            } else {
                this.d3el.selectAll(".bargroup")
                    .selectAll(".bar")
                    .style("fill", this.get_mark_color.bind(this))
                    .style("stroke", stroke ? stroke : this.get_mark_color.bind(this))
                    .style("opacity", this.get_mark_opacity.bind(this));
            }
        }
        //legend color update
        if (this.legend_el) {
            this.legend_el.selectAll(".legendrect")
                .style("fill", this.get_mark_color.bind(this))
                .style("stroke", stroke ? stroke : this.get_mark_color.bind(this))
                .style("opacity", this.get_mark_opacity.bind(this));
            this.legend_el.selectAll(".legendtext")
                .style("fill", this.get_mark_color.bind(this))
                .style("stroke", stroke ? stroke : this.get_mark_color.bind(this))
                .style("opacity", this.get_mark_opacity.bind(this));
        }
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        if (!(this.model.is_y_2d) &&
            (this.model.get("colors").length !== 1 &&
                this.model.get("color_mode") !== "element")) {
            return [0, 0];
        }

        const legend_data = this.model.mark_data[0].values.map((data) => {
            return {
                index: data.sub_index,
                color_index: data.color_index,
                opacity_index: data.opacity_index,
            };
        });
        this.legend_el = elem.selectAll(".legend" + this.uuid)
            .data(legend_data);

        const that = this;
        const rect_dim = inter_y_disp * 0.8;
        const legend = this.legend_el.enter()
            .append("g")
            .attr("class", "legend" + this.uuid)
            .attr("transform", (d, i) => {
                return "translate(0, " + (i * inter_y_disp + y_disp) + ")";
            })
            .on("mouseover", () => {
                this.event_dispatcher("legend_mouse_over");
            })
            .on("mouseout", () => {
                this.event_dispatcher("legend_mouse_out");
            })
            .on("click", () => {
                this.event_dispatcher("legend_clicked");
            });

        legend.append("rect")
            .classed("legendrect", true)
            .style("fill", this.get_mark_color.bind(this))
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", rect_dim)
            .attr("height", rect_dim);

        legend.append("text")
            .attr("class", "legendtext")
            .attr("x", rect_dim * 1.2)
            .attr("y", rect_dim / 2)
            .attr("dy", "0.35em")
            .text((d, i) => { return that.model.get("labels")[i]; })
            .style("fill", this.get_mark_color.bind(this));

        this.legend_el = legend.merge(this.legend_el);

        const max_length = d3.max(this.model.get("labels"), (d: any[]) => d.length);

        this.legend_el.exit().remove();
        return [this.model.mark_data[0].values.length, max_length];
    }

    clear_style(style, indices) {
        if (!indices || indices.length === 0) {
            return;
        }

        if (Object.keys(style).length === 0) {
            return;
        }

        const elements = this.d3el.selectAll(".bargroup").filter((d, index) => {
            return indices.indexOf(index) !== -1;
        });

        const clearing_style = {};
        for (const key in style) {
            clearing_style[key] = null;
        }
        elements.selectAll(".bar").styles(clearing_style);
    }

    set_style_on_elements(style, indices) {
        if (!indices || indices.length === 0) {
            return;
        }

        if (Object.keys(style).length === 0) {
            return;
        }

        const elements = this.d3el.selectAll(".bargroup").filter((data, index) => {
            return indices.indexOf(index) !== -1;
        });
        elements.selectAll(".bar").styles(style);
    }

    set_default_style(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        if (!indices || indices.length === 0) {
            return;
        }

        const fill = this.model.get("fill"),
            stroke = this.model.get("stroke"),
            stroke_width = this.model.get("stroke_width");

        this.d3el.selectAll(".bargroup").filter((data, index) => {
                return indices.indexOf(index) !== -1;
            })
            .selectAll('.bar')
            .style("fill", fill ? this.get_mark_color.bind(this) : "none")
            .style("stroke", stroke ? stroke : "none")
            .style("opacity", this.get_mark_opacity.bind(this))
            .style("stroke-width", stroke_width);
    }

    get_mark_color(data, index) {
        // Workaround for the bargroup, the color index is not the same as the bar index
        return super.get_mark_color(data, data.color_index);
    }

    get_mark_opacity(data, index) {
        // Workaround for the bargroup, the color index is not the same as the bar index
        return super.get_mark_opacity(data, data.opacity_index);
    }

    set_x_range() {
        const dom_scale = this.dom_scale;
        if (dom_scale.model.type === "ordinal") {
            return dom_scale.scale.range();
        } else {
            return [dom_scale.scale(d3.min(this.stacked_scale.domain())),
            dom_scale.scale(d3.max(this.stacked_scale.domain()))];
        }
    }

    bar_click_handler(args) {
        const index = args.index;
        const that = this;
        const idx = this.model.get("selected") || [];
        let selected: number[] = Array.from(idx);

        // index of bar i. Checking if it is already present in the list.
        const elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
        if (elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the element from the list
            selected.splice(elem_index, 1);
        } else {
            if (d3GetEvent().shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if (elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //bar which has been clicked
                const min_index = (selected.length !== 0) ?
                    d3.min(selected) : -1;
                const max_index = (selected.length !== 0) ?
                    d3.max(selected) : that.model.mark_data.length;
                if (index > max_index) {
                    _.range(max_index + 1, index + 1).forEach((i) => {
                        selected.push(i);
                    });
                } else if (index < min_index) {
                    _.range(index, min_index).forEach((i) => {
                        selected.push(i);
                    });
                }
            } else if (accelKey) {
                //If accel is pressed and the bar is not already selcted
                //add the bar to the list of selected bars.
                selected.push(index);
            }
            // updating the array containing the bar indexes selected
            // and updating the style
            else {
                //if accel is not pressed, then clear the selected ones
                //and set the current element to the selected
                selected = [];
                selected.push(index);
            }
        }
        this.model.set("selected",
            ((selected.length === 0) ? null : new Uint32Array(selected)),
            { updated_view: this });
        this.touch();
        const e = d3GetEvent();
        if (e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    }

    reset_selection() {
        this.model.set("selected", null);
        this.selected_indices = null;
        this.touch();
    }

    compute_view_padding() {
        // //This function returns a dictionary with keys as the scales and
        // //value as the pixel padding required for the rendering of the
        // //mark.
        const dom_scale = this.dom_scale;
        const orient = this.model.get("orientation");
        let x_padding = 0;
        const avail_space = (orient === "vertical") ? this.parent.plotarea_width : this.parent.plotarea_height;
        if (dom_scale) {
            if (this.stacked_scale !== null && this.stacked_scale !== undefined &&
                this.stacked_scale.domain().length !== 0) {
                if (dom_scale.model.type !== "ordinal") {
                    if (this.model.get("align") === "center") {
                        x_padding = (avail_space / (2.0 * this.stacked_scale.domain().length) + 1);
                    } else if (this.model.get("align") === "left" ||
                        this.model.get("align") === "right") {
                        x_padding = (avail_space / (this.stacked_scale.domain().length) + 1);
                    }
                } else {
                    if (this.model.get("align") === "left" ||
                        this.model.get("align") === "right") {
                        x_padding = parseFloat((this.stacked_scale.bandwidth() / 2).toFixed(2));
                    }
                }
            }
        }
        if (orient === "vertical") {
            if (x_padding !== this.x_padding) {
                this.x_padding = x_padding;
                this.trigger("mark_padding_updated");
                //dispatch the event
            }
        } else {
            if (x_padding !== this.y_padding) {
                this.y_padding = x_padding;
                this.trigger("mark_padding_updated");
                //dispatch the event
            }
        }
    }

    dom_offset: any;
    dom_scale: any;
    legend_el: any;
    pixel_coords: any;
    range_offset: any;
    range_scale: any;
    x_pixels: any;
    stacked_scale: any;
    grouped_scale: any;

    // Overriding super class
    model: BarsModel;
}
