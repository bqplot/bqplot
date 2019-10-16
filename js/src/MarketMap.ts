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
import * as _ from 'underscore';

import {
    MessageLoop
} from '@phosphor/messaging';

import {
    Widget
} from '@phosphor/widgets';

import * as d3 from 'd3';
import 'd3-selection-multi';
// var d3 =Object.assign({}, require("d3-array"), require("d3-format"), require("d3-selection"), require("d3-selection-multi"), require("d3-shape"));
import {Figure} from './Figure';
import * as popperreference from './PopperReference';
import popper from 'popper.js';

export class MarketMap extends Figure {

    render(options?) {
        this.id = widgets.uuid();
        const min_width = String(this.model.get("layout").get("min_width"));
        const min_height = String(this.model.get("layout").get("min_height"));

        const impl_dimensions = this._get_height_width(min_height.slice(0, -2), min_width.slice(0, -2));
        this.width = impl_dimensions["width"];
        this.height = impl_dimensions["height"];

        this.scales = {};
        this.set_top_el_style();
        const that = this;
        this.margin = this.model.get("map_margin");
        this.num_rows = this.model.get("rows");
        this.num_cols = this.model.get("cols");
        this.row_groups = this.model.get("row_groups");
        this.enable_select = this.model.get("enable_select");

        this.update_data();
        // set the number of rows and columns in the map
        this.set_area_dimensions(this.data.length);

        if (this.model.get('theme')) {
            this.svg.classed(this.model.get('theme'), true);
        }
        this.fig = this.svg.append("g")
                .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.fig_map = this.fig.append("g");
        this.fig_axes = this.fig.append("g");
        this.fig_click = this.fig.append("g");
        this.fig_hover = this.fig.append("g");
        this.fig_names = this.fig.append("g")
            .style("display", (this.model.get("show_groups") ? "inline" : "none"));

        this.fig_map.classed("g-map", true);
        this.fig_axes.classed("g-axes", true);
        this.fig_click.classed("g-click", true);
        this.fig_hover.classed("g-hover", true);
        this.fig_names.classed("g-names", true);
        this.axis = [];

        // code for tool tip to be displayed
        this.tooltip_div = d3.select(document.createElement("div"))
            .attr("class", "mark_tooltip");
        this.tooltip_div.styles({"opacity": 0, "pointer-events": "none"});

        const freeze_tooltip_loc = this.model.get("freeze_tooltip_location");
        if (freeze_tooltip_loc) {
            this.popper_reference = new popperreference.ElementReference(this.svg.node());
        } else {
            this.popper_reference = new popperreference.PositionReference({x: 0, y: 0, width: 20, height: 20});
        }
        this.popper = new popper(this.popper_reference, this.tooltip_div.node(), {
            placement: 'auto',
        });

        this.update_default_tooltip();

        this.selected_stroke = this.model.get("selected_stroke");
        this.hovered_stroke = this.model.get("hovered_stroke");

        this.update_plotarea_dimensions();

        this.title = this.fig.append("text")
          .attr("class", "mainheading")
          .attrs({x: (0.5 * (this.plotarea_width)), y: -(this.margin.top / 2.0), dy: "1em"})
          .text(this.model.get("title"));
        this.title.styles(this.model.get("title_style"));

        const scale_creation_promise = this.create_scale_views();
        scale_creation_promise.then(function() {
            that.create_listeners();
            that.axis_views = new widgets.ViewList(that.add_axis, null, that);
            that.axis_views.update(that.model.get("axes"));
            that.model.on("change:axes", function(model, value, options) {
                that.axis_views.update(value);
            });
        });
        this.displayed.then(function() {
            document.body.appendChild(that.tooltip_div.node())
            that.relayout();
            that.draw_group_names();
            that.create_tooltip_widget();
        });
        return scale_creation_promise;
    }

    set_top_el_style() {
        this.el.style["user-select"] = "none";
        this.el.style["ms-user-select"] = "none";
        this.el.style["moz-user-select"] = "none";
        this.el.style["khtml-user-select"] = "none";
        this.el.style["webkit-user-select"] = "none";
    }

    update_plotarea_dimensions() {
        this.plotarea_width = this.width - this.margin.left - this.margin.right;
        this.plotarea_height = this.height - this.margin.top - this.margin.bottom;
        this.column_width = parseFloat((this.plotarea_width / this.num_cols).toFixed(2));
        this.row_height = parseFloat((this.plotarea_height / this.num_rows).toFixed(2));
    }

    reset_drawing_controls() {
        // Properties useful in drawing the map
        this.prev_x = 0;
        this.prev_y = -1;
        this.y_direction = 1;  // for y direction 1 means going to the right
        this.x_direction = 1;  // for x direction 1 means going down
        this.group_iter = 1;
    }

    create_listeners() {
        this.listenTo(this.model, "change:scales", this.create_scale_views);
        this.listenTo(this.model, "change:color", this.recolor_chart);
        this.listenTo(this.model, "change:colors", this.colors_updated);
        this.listenTo(this.model, "change:show_groups", this.show_groups);
        this.listenTo(this.model, "change:selected_stroke", this.update_selected_stroke);
        this.listenTo(this.model, "change:hovered_stroke", this.update_hovered_stroke);
        this.listenTo(this.model, "change:font_style", this.update_font_style);
        this.model.on_some_change(["title", "title_style"], this.update_title, this);
        this.listenTo(this.model, "change:selected", function() {
            this.clear_selected();
            this.apply_selected();
        });
        this.model.on_some_change(["names", "groups", "ref_data"], function() {
            this.update_data();
            this.compute_dimensions_and_draw();
        }, this);
        this.listenTo(this.model, "change:rows", function(model, value) {
            this.num_rows = value;
            this.compute_dimensions_and_draw();
        });
        this.listenTo(this.model, "change:cols", function(model, value) {
            this.num_cols = value;
            this.compute_dimensions_and_draw();
        });
        this.listenTo(this.model, "change:row_groups", function(model, value) {
            this.row_groups = value;
            this.compute_dimensions_and_draw();
        });
        this.listenTo(this.model, "change:tooltip_widget", this.create_tooltip_widget);
        this.listenTo(this.model, "change:tooltip_fields", this.update_default_tooltip);
        this.listenTo(this.model, "change:tooltip_formats", this.update_default_tooltip);
    }

    update_title(model, value) {
        this.title.text(this.model.get("title"))
           .styles(this.model.get("title_style"));
    }

    relayout() {
        const that = this;

        const impl_dimensions = this._get_height_width(this.el.clientHeight, this.el.clientWidth);
        this.width = impl_dimensions["width"];
        this.height = impl_dimensions["height"];

        window.requestAnimationFrame(function () {
            // update ranges
            that.margin = that.model.get("map_margin");
            that.update_plotarea_dimensions();

            // transform figure
            that.fig.attr("transform", "translate(" + that.margin.left + "," +
                                                      that.margin.top + ")");
            that.title.attrs({
                x: (0.5 * (that.plotarea_width)),
                y: -(that.margin.top / 2.0),
                dy: "1em"
            });

            that.draw_map();

            // Drawing the selected cells
            that.clear_selected();
            that.apply_selected();

            // When map is expanded or contracted, there should not be any
            // accidental hovers. To prevent this, the following call is made.
            that.fig_hover.selectAll("rect")
                .remove();
            that.hide_tooltip();
            that.trigger("margin_updated");
        });
    }

    update_data() {
        const that = this;
        this.data = this.model.get("names") || [];
        this.ref_data = this.model.get("ref_data");
        this.group_data = this.model.get("groups");
        this.groups = _.uniq(this.group_data, true);
        let display_text = this.model.get("display_text");
        display_text = (display_text === null || display_text.length === 0) ? this.data : display_text;

        this.colors = this.model.get("colors");
        const num_colors = this.colors.length;
        this.colors_map = function(d) { return that.get_color(d, num_colors);};
        const color_data = this.model.get("color");
        const mapped_data = _.map(this.data, (d, i) => {
            return {
                display: display_text[i],
                name: d,
                color: Number.isNaN(color_data[i]) ? undefined : color_data[i],
                group: this.group_data[i],
                ref_data: (this.ref_data === null || this.ref_data === undefined) ? null : this.ref_data[i]
            };
        });

        this.update_domains();
        this.grouped_data = _.groupBy(mapped_data, function(d, i) { return that.group_data[i]; });
        this.groups = [];
        this.running_sums = [];
        this.running_sums[0] = 0;
        let count = 0;
        for (let key in this.grouped_data) {
            this.groups.push(key);
            count += this.grouped_data[key].length;
            this.running_sums.push(count);
        }
        this.running_sums.pop();
    }

    update_domains() {
        const color_scale_model = this.model.get("scales").color;
        const color_data = this.model.get("color");
        if(color_scale_model && color_data.length > 0) {
            color_scale_model.compute_and_set_domain(color_data, this.model.model_id);
        }
    }

    set_area_dimensions(num_items) {
        this.num_rows = this.model.get("rows");
        this.num_cols = this.model.get("cols");
        this.row_groups = this.model.get("row_groups");

        if (this.num_cols !== undefined && this.num_cols !== null && this.num_cols !== 0) {
            // When the number of row groups is greater than 1, the number
            // of columns has to be an odd number. This is to
            // ensure the continuity of the waffles when groups are spread
            // across multiple row groups
            if(this.row_groups > 1 && this.num_cols % 2 === 0)
                this.num_cols++;
            this.num_rows = Math.floor(num_items / this.num_cols);
            this.num_rows = (num_items % this.num_cols === 0) ? this.num_rows : (this.num_rows + 1);
        } else if(this.num_rows !== undefined && this.num_rows !== null && this.num_rows !== 0) {
            this.num_cols = Math.floor(num_items / this.num_rows);
            this.num_cols = (num_items % this.num_rows === 0) ? this.num_cols : (this.num_cols + 1);
            if(this.row_groups > 1 && this.num_cols % 2 === 0)
                this.num_cols++;
        } else {
            this.num_cols = Math.floor(Math.sqrt(num_items));
            if(this.row_groups > 1 && this.num_cols % 2 === 0)
                this.num_cols++;
            this.num_rows = Math.floor(num_items / this.num_cols);
            this.num_rows = (num_items % this.num_cols === 0) ? this.num_rows : (this.num_rows + 1);
        }

        // row_groups cannot be greater than the number of rows
        this.row_groups = Math.min(this.row_groups, this.num_rows);
        // if there is only one row_group, then the number of columns are
        // not necessarily equal to the variable this.num_cols as we draw
        // row first. So we need to adjust the this.num_cols variable
        // according to the num_rows.
        if(this.row_groups == 1) {
            this.num_cols = Math.floor(num_items / this.num_rows);
            this.num_cols = (num_items % this.num_rows === 0) ? this.num_cols : (this.num_cols + 1);
        }
        // depending on the number of rows, we need to decide when to
        // switch direction. The below functions tells us where to swtich
        // direction.
        this.set_row_limits();
    }

    compute_dimensions_and_draw() {
        this.set_area_dimensions(this.data.length);
        this.update_plotarea_dimensions();
        this.draw_map();

        this.clear_selected();
        this.apply_selected();

        // when data is changed
        this.fig_hover.selectAll("rect")
            .remove();
        this.hide_tooltip();
    }

    update_default_tooltip() {
        this.tooltip_fields = this.model.get("tooltip_fields");
        const formats = this.model.get("tooltip_formats");
        this.tooltip_formats = this.tooltip_fields.map(function(field, index) {
            const fmt = formats[index];
            if(fmt === undefined || fmt === "") {return function(d) { return d; }; }
            else return d3.format(fmt);
        });
    }

    create_scale_views() {
        for (let key in this.scales) {
            this.stopListening(this.scales[key]);
        }
        const scale_models = this.model.get("scales");
        const that = this;
        const scale_promises = {};
        _.each(scale_models, function(model : widgets.WidgetModel, key) {
            scale_promises[key] = that.create_child_view(model);
        });
        return widgets.resolvePromisesDict(scale_promises).then(function(d) {
            that.scales = d;
            that.set_scales();
        });
    }

    set_scales() {
        const that = this;
        const color_scale = this.scales.color;
        if(color_scale) {
            color_scale.set_range();
            color_scale.on("color_scale_range_changed", that.update_map_colors, that);
            this.update_domains();
            this.listenTo(color_scale, "domain_changed", function() {
                that.update_map_colors();
            });
            this.update_map_colors();
        }
    }

    show_groups(model, value) {
        this.fig_names.style("display", (value ? "inline" : "none"));
        this.fig_map.selectAll(".market_map_text").style("opacity", (value ? 0.2 : 1));
        this.fig_map.selectAll(".market_map_rect").style("stroke-opacity", (value ? 0.2 : 1));
    }

    draw_map() {
        this.reset_drawing_controls();
        // Removing pre existing elements from the map
        this.fig_map.selectAll(".element_group").remove();
        this.fig_names.selectAll(".names_object").remove();
        this.rect_groups = this.fig_map.selectAll(".element_group")
            .data(this.groups);
        const color_scale = this.scales.color;

        const that = this;
        this.rect_groups = this.rect_groups.enter()
            .append("g")
            .attr("class", "element_group")
            .attr("transform", function(d, i) { return that.get_group_transform(i); })
            .merge(this.rect_groups);

        this.rect_groups.exit().remove();
        this.end_points = [];
        this.rect_groups.nodes().forEach(function(d, i) {
            const data = that.grouped_data[that.groups[i]];
            const return_arr = that.get_new_cords();
            const ends = that.get_end_points(return_arr[2], data.length, return_arr[0], return_arr[1], return_arr[3], return_arr[4]);
            ends.forEach(function(point) { that.end_points.push(point); });
            const element_count = that.running_sums[i];

            let groups = d3.select(d)
                .selectAll<SVGGElement, undefined>(".rect_element")
                .data(data);

            // Appending the <g> <rect> and <text> elements to the newly
            // added nodes
            const new_groups = groups.enter()
                .append("g")
                .classed("rect_element", true);

            new_groups.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .classed("market_map_rect", true);

            // Grouping calls to style into a single call to styles
            // leads to build error despite the import of d3-selection-multi
            let text = new_groups.append("text")
                .classed("market_map_text", true)
                .style("text-anchor", "middle")
                .style('fill', 'black')
                .style("pointer-events", "none")
                .style("dominant-baseline", "central");
            let fontStyle = that.model.get("font_style");
            for (let i in Object.keys(fontStyle)) {
                text.style(i, fontStyle[i]);
            }

            groups = new_groups.merge(groups);

            // Update the attributes of the entire set of nodes
            groups.attr("transform", function(data, ind) { return that.get_cell_transform(ind); })
                .on("click", function(data, ind) { that.cell_click_handler(data, (element_count + ind), this);})
                .on("mouseover", function(data, ind) { that.mouseover_handler(data, (element_count + ind), this);})
                .on("mousemove", function(data) { that.mousemove_handler(); })
                .on("mouseout", function(data, ind) { that.mouseout_handler(data, (element_count + ind), this);})
                .attr("class",function(data, index) { return d3.select(this).attr("class") + " " + "rect_" + (element_count + index); });

            groups.selectAll(".market_map_rect")
                .attr("width", that.column_width)
                .attr("height", that.row_height)
                .style("stroke-opacity", (that.model.get("show_groups") ? 0.2 : 1.0))
                .style('stroke', that.model.get("stroke"))
                .style("fill", function(elem: any, j) {
                    return (color_scale && elem.color !== undefined && elem.color !== null) ?
                        color_scale.scale(elem.color) :
                        that.colors_map(i);
                    });

            groups.selectAll(".market_map_text")
                .attr("x", that.column_width / 2.0)
                .attr("y", that.row_height / 2.0)
                .text(function(data: any, j) { return data.display; })
                .style("opacity", (that.model.get("show_groups") ? 0.2 : 1.0));

            // Removing the old nodes
            groups.exit().remove();
            that.create_bounding_path(d, ends);
            const min_x = d3.min(ends, function(end_point: any) { return end_point.x;});
            const min_y = d3.min(ends, function(end_point: any) { return end_point.y;});

            that.fig_names.append("foreignObject")
                .attr("class", "names_object")
                .attr("x", min_x)
                .attr("y", min_y)
                .append("xhtml:div")
                .attr("class", "names_div")
                .styles({"display": "flex", "flex-direction": "row", "align-content": "center", "align-items": "center", "width": "100%",
                       "height": "100%", "justify-content": "center", "word-wrap": "break-word", "font": "24px sans-serif", "color": "black"})
                .text(that.groups[i]);
        });
        this.draw_group_names();
    }

    draw_group_names() {
        // Get all the bounding rects of the paths around each of the
        // sectors. Get their client bounding rect.
        const paths = this.svg.selectAll(".bounding_path").nodes() as SVGPathElement[];
        const clientRects = paths.map(function(path) { return path.getBoundingClientRect(); });
        const text_elements = this.fig_names.selectAll(".names_object").data(clientRects);
        text_elements.attr("width", function(d) { return d.width;})
            .attr("height", function(d) { return d.height;});
    }

    recolor_chart() {
        const that = this;
        this.update_data();
        this.rect_groups = this.fig.selectAll(".element_group")
            .data(this.groups);
        const color_scale = this.scales.color;

        this.rect_groups.nodes().forEach(function(d, i) {
            const data = that.grouped_data[that.groups[i]];
            d3.select(d)
                .selectAll(".rect_element")
                .data(data)
                .select('rect')
                .style('stroke', that.model.get('stroke'))
                .style('fill', function(elem: any, j) {
                    return (color_scale && elem.color !== undefined && elem.color !== null) ?
                           color_scale.scale(elem.color) :
                           that.colors_map(i);
                });
        });
    }

    update_font_style(model, value) {
        // This is a bit awkward because we did not figure out how to get
        // Typescript to recognize the d3-select-multi typings.
        const x: any = this.svg.selectAll(".market_map_text");
        x.styles(value);
    }

    update_map_colors() {
        if(this.rect_groups !== undefined && this.rect_groups !== null) {
            this.recolor_chart();
        }
    }

    cell_click_handler(data, id, cell) {
        if(this.model.get("enable_select")) {
            const selected = this.model.get("selected").slice();
            const index = selected.indexOf(data.name);
            if(index == -1) {
                // not already selected, so add to selected
                selected.push(data.name);
            }
            else {
                // already in selected list, so delete from selected
                selected.splice(index, 1);
            }
            this.model.set("selected", selected);
            this.touch();
        }
    }

    apply_selected() {
        const selected = this.model.get("selected");
        const that = this;
        if(selected === undefined || selected === null || selected.length === 0)
            this.clear_selected();
        else{
            selected.forEach(function(data) {
                const selected_cell = that.fig_map
                    .selectAll(".rect_element")
                    .filter(function(d, i) {
                        return d.name === data;
                    });

                that.fig_click
                    .append("rect")
                    .data(selected_cell.data())
                    .attr("transform", selected_cell.attr("transform"))
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", that.column_width)
                    .attr("height", that.row_height)
                    .styles({"stroke": that.selected_stroke,
                            "stroke-width": "3px",
                            "fill": "none"});
            });
        }
    }

    clear_selected() {
        this.fig_click.selectAll("rect").remove();
    }

    mouseover_handler(data, id, cell) {
        const transform = d3.select(cell).attr("transform");
        if(this.model.get("enable_hover")) {
            this.fig_hover.append("rect")
                .attr("class", "hover_" + id)
                .attr("transform", transform)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.column_width)
                .attr("height", this.row_height)
                .styles({'stroke': this.hovered_stroke, 'stroke-width': '3px', 'fill': 'none',
                         'pointer-events': 'none'});
            this.show_tooltip(d3.event, data);
            this.send({event: "hover", data: data.name, ref_data: data.ref_data});
        }
    }

    update_selected_stroke(model, value) {
        this.selected_stroke = value;
        this.fig_click.selectAll("rect")
            .style('stroke', value);
    }

    update_hovered_stroke(model, value) {
        this.hovered_stroke = value;
        // I do not need to update anything else because when hovered color
        // is being updated you are not hovering over anything.
    }

    mouseout_handler(data, id, cell) {
        this.fig_hover.select(".hover_" + id)
            .remove();
        this.hide_tooltip();
    }

    show_tooltip(event, data) {
        const that = this;
        if(!this.tooltip_view && (!this.tooltip_fields || this.tooltip_fields.length == 0))
        {
            return;
        } else {
            const tooltip_div = this.tooltip_div;
            tooltip_div.transition()
                .styles({"opacity": 0.9, "display": null});

            this.move_tooltip();
            tooltip_div.select("table").remove();

            const ref_data = data.ref_data;
            if(!this.tooltip_view) {
                const tooltip_table = tooltip_div.append("table")
                    .selectAll("tr").data(this.tooltip_fields);

                tooltip_table.exit().remove();
                const table_rows = tooltip_table.enter().append("tr");

                table_rows.append("td")
                    .attr("class", "tooltiptext")
                    .text(function(datum) { return datum;});

                table_rows.append("td")
                    .attr("class", "tooltiptext")
                    .text(function(datum, index) { return (ref_data === null || ref_data === undefined) ? null : that.tooltip_formats[index](ref_data[datum]);});
            }
            this.popper.enableEventListeners();
            this.move_tooltip();
        }
    }

    mousemove_handler() {
        this.move_tooltip();
    }

    move_tooltip() {
        this.popper_reference.x = d3.event.clientX;
        this.popper_reference.y = d3.event.clientY;
        this.popper.scheduleUpdate();
    }

    hide_tooltip() {
         this.tooltip_div.style("pointer-events", "none");
         this.tooltip_div.transition()
            .styles({"opacity": 0, "display": "none"});
        this.popper.disableEventListeners();
    }

    create_tooltip_widget() {
        const tooltip_model = this.model.get("tooltip_widget");
        if((this.tooltip_view !== null && this.tooltip_view !== undefined)) {
            //remove the previous tooltip
            this.tooltip_view.remove();
            this.tooltip_view = null;
        }
        const that = this;
        if(tooltip_model) {
            const tooltip_widget_creation_promise = this.create_child_view(tooltip_model);
            tooltip_widget_creation_promise.then(function(view) {
                that.tooltip_view = view;

                MessageLoop.sendMessage(view.pWidget, Widget.Msg.BeforeAttach);
                that.tooltip_div.node().appendChild(view.el);
                MessageLoop.sendMessage(view.pWidget, Widget.Msg.AfterAttach);
            });
        }
    }

    get_group_transform(index) {
        return "translate(" + '0' + ", 0)";
    }

    get_cell_transform(index) {
        if(!this.past_border_y()){
            if(this.past_border_x()) {
                this.y_direction = -1 * this.y_direction;
                this.prev_x += this.x_direction;
            } else {
                this.x_direction = -1 * this.x_direction;
                this.prev_y += this.y_direction;
                this.group_iter += 1;
            }
        } else {
            this.prev_y += this.y_direction;
        }
        return "translate(" + (this.prev_x * this.column_width) + ", " +
                              (this.prev_y * this.row_height) + ")";
    }

    get_new_cords() {
        let new_x = this.prev_x;
        let new_y = this.prev_y;
        let y_direction = this.y_direction;
        let x_direction = this.x_direction;
        let group_iter = this.group_iter;
        if(!this.past_border_y()){
            if(this.past_border_x()) {
                y_direction = -1 * this.y_direction;
                new_x += this.x_direction;
            } else {
                x_direction = -1 * this.x_direction;
                new_y += this.y_direction;
                group_iter += 1;
            }
        } else {
            new_y += this.y_direction;
        }
        return [new_x, new_y, group_iter, x_direction, y_direction, new_x * this.column_width, new_y * this.row_height];
    }

    past_border_y() {
        if(this.y_direction == 1) {
            return (this.prev_y + 1) < this.row_limits[this.group_iter];
        } else {
            return (this.prev_y - 1) > this.row_limits[this.group_iter -1] - 1;
        }
    }

    past_border_x() {
        if(this.x_direction == 1) {
            return (this.prev_x + 1) < this.num_cols;
        } else {
            return (this.prev_x - 1) > -1;
        }
    }

    colors_updated() {
        this.colors = this.model.get("colors");
        this.recolor_chart();
    }

    get_color(index, length) {
        return this.colors[index % length];
    }

    set_row_limits() {
        const step = Math.floor(this.num_rows / this.row_groups);
        this.row_limits = [];
        for(let iter = this.row_groups - 1; iter > -1; iter--){
            this.row_limits.unshift(iter * step);
        }
        this.row_limits[this.row_groups] = this.num_rows;
    }

    get_end_points(group_iter, num_cells, start_col, start_row, x_direction, y_direction) {
        //start_row is the 0-based index and not a 1-based index, i.e., it
        //is not the column number in the truest sense
        // Function to get the end points of the rectangle representing the
        // groups.
        // Requires the direction variables to be updated before this
        // function is called
        let top_row = this.row_limits[group_iter - 1];
        let bottom_row = this.row_limits[group_iter];
        let across = false;

        let init_x = x_direction;
        let init_y = y_direction;
        const end_points = [];
        let current_row;

        let rows_remaining = (init_y == 1) ? (bottom_row - start_row) : (start_row - top_row + 1);
        let cols_remaining = (init_x == 1) ? (this.num_cols - 1 - start_col) : (start_col); // this is the num of columns remaining
        //after the cuirrent column has been filled
        let elem_remaining = num_cells;
        //this holds the number of continuous cols that will be filled
        //between the current top and bottom rows
        let num_rows = bottom_row - top_row;

        if(elem_remaining !== 0) {
            // starting corener of the path
            this.calc_end_point_source(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
            const elem_filled = Math.min(rows_remaining, elem_remaining);

            if(elem_filled === elem_remaining) {
                // There are enough elements only to fill one column
                // partially. We add the three end points and exit
                // The adjacent corner from the starting corner. This is
                // required because the elements are filled in the first
                // row itself.
                this.calc_end_point_source(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });

                current_row = start_row + (elem_remaining - 1) * init_y;
                this.calc_end_point_dest(start_col, current_row, (-1) * init_x, init_y).forEach(function(e) { end_points.push(e); });
                this.calc_end_point_dest(start_col, current_row, init_x, init_y).forEach(function(e) { end_points.push(e); });

                /*
                console.log("new set");
                end_points.forEach(function(point) { console.log(point); });
                console.log("end set");
               */

                return end_points;
            }
            elem_remaining = elem_remaining - elem_filled;
            if(cols_remaining === 0) {
                // Since this is the last column, the adjacent corner from
                // the starting corner is added here too
                this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });
            }
            else if(rows_remaining !== (bottom_row - top_row)) {
                // If the starting row is not the starting row of a group,
                // the poirnt adjacent to the starting point needs to be
                // added.
                this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });

                if(elem_remaining > num_rows) {
                    // If next row is completely filled, then the top row
                    // element of the next column is an end point. That is
                    // being added here.
                    this.calc_end_point_dest(start_col + init_x, (init_y == 1) ? top_row :
                                         bottom_row - 1, init_x * (-1), init_y * (-1)).forEach(function(d) { end_points.push(d); });
                }
            }
            else if(elem_remaining < num_rows) {
                // one continuous row in this case
                this.calc_end_point_source(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
            }
            start_row = start_row + (init_y * (elem_filled - 1));
            //first set of end points are added here
            this.calc_end_point_dest(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
            if(elem_remaining === 0) {
                this.calc_end_point_dest(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });

                /*
                console.log("new set");
                end_points.forEach(function(point) { console.log(point); });
                console.log("end set");
               */

                return end_points;
            }
            if(cols_remaining !== 0 && elem_remaining > num_rows)
                start_col = start_col + init_x;
        }

        while(elem_remaining > num_rows) {
            let no_cont_cols;
            if(num_rows * cols_remaining < elem_remaining) {
                no_cont_cols = cols_remaining;
                const leftover_elem = elem_remaining - (no_cont_cols) * num_rows;
                no_cont_cols += Math.floor(leftover_elem / (this.row_limits[group_iter + 1] - this.row_limits[group_iter]));
            } else {
                no_cont_cols = Math.floor(elem_remaining / num_rows);
            }

            if(no_cont_cols > cols_remaining){
                start_col = (init_x === 1) ? this.num_cols - 1 : 0;
                if(cols_remaining !== 0) {
                    this.calc_end_point_dest(start_col, top_row, init_x, -1)
                        .forEach(function(d) { end_points.push(d); });
                }
                no_cont_cols = cols_remaining;
                cols_remaining = this.num_cols;
                group_iter += 1;
                top_row = bottom_row;
                bottom_row = this.row_limits[group_iter];
                start_row = top_row;
                init_x = -1 * init_x;
                init_y = Math.pow(-1, no_cont_cols) * init_y * (-1);
                this.calc_end_point_dest(start_col, bottom_row - 1, (-1) * init_x, 1)
                    .forEach(function(d) { end_points.push(d); });
            } else if (no_cont_cols === cols_remaining) {
                start_col = (init_x === 1) ? this.num_cols - 1 : 0;
                if(cols_remaining !== 0) {
                    this.calc_end_point_dest(start_col, top_row, init_x, -1)
                        .forEach(function(d) { end_points.push(d); });
                }
                no_cont_cols = cols_remaining;
                cols_remaining = this.num_cols;
                group_iter += 1;
                if(group_iter < this.row_limits.length) {
                    top_row = bottom_row;
                    bottom_row = this.row_limits[group_iter];
                    start_row = top_row;
                    init_x = -1 * init_x;
                    init_y = Math.pow(-1, no_cont_cols) * init_y * (-1);
                    across = true;
                }
                else {
                    init_y = 1;
                    init_x = 1;
                }
            } else {
                // The number of elements are such that the row group is
                // not exhausted.
                init_y = Math.pow(-1, (no_cont_cols)) * init_y;
                //As I am moving down this time, next time I will move up
                //and I might not reach the top row, it might be an end
                //point.
                start_row = (init_y === 1) ? top_row : bottom_row - 1;
                start_col = start_col + (init_x) * (no_cont_cols - 1);
                this.calc_end_point_source(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
            }
            elem_remaining -= (no_cont_cols * (num_rows));
            num_rows = bottom_row - top_row;
            //reset direction
            //this is an end point
        }
        //all elements are exhausted
        if(elem_remaining === 0) {
            // The column is exactly filled. In this case, the only end
            // point I need to add is the outer edge w.r.t. the direction
            // in which we are travelling
            start_row = (init_y === 1) ? bottom_row - 1 : top_row;
            init_x = (across) ? ((-1) * init_x) : init_x;
            this.calc_end_point_dest(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
        }
        else {
            // The previous column was exactly filled and the last column
            // is partially filled
            init_y = -1 * init_y; // Since we are in the next column, the direction of y has to be reversed
            start_row = (init_y === 1) ? top_row : bottom_row - 1;
            start_col = (across) ? start_col : (start_col + (init_x));

            // this is the outer edge of the start of the last column w.r.t
            // the current direction of travel.
            this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });

            // The points corresponding to the cell at which we stop.
            current_row = start_row + (elem_remaining - 1) * init_y;  // this is the row in which we end
            // Two points need to be added. The boundary of the last cell
            // in the y-direction.
            this.calc_end_point_dest(start_col, current_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
            this.calc_end_point_dest(start_col, current_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
        }

        /*
        console.log("new set");
        end_points.forEach(function(point) { console.log(point); });
        console.log("end set");
       */

        return end_points;
    }

    create_bounding_path(elem, end_points) {
        const values = [];
        const editing_copy = end_points.slice();
        values.push(end_points[0]);
        editing_copy.splice(0, 1);
        //do union based on which direction you are trying to move in and
        //draw the path
        //best way seems to be horizaontal followed by vertical
        const props = ['x', 'y'];
        let iter = 0;
        let prop = props[iter % 2];
        let other_prop = props[(iter + 1) % 2];
        const curr_elem = values[0];
        let match = curr_elem[prop];
        let dim = curr_elem[other_prop];
        let max_iter = 2 * editing_copy.length;
        let final_val = 0;
        while(editing_copy.length > 1 && max_iter > 0){
            const filtered_array = editing_copy.filter(function(elem) { return elem[prop] == match; });
            if(filtered_array.length > 0) {
                iter++;
                const min_elem = d3.min(filtered_array, function(elem) { return elem[other_prop] as number; });
                const max_elem = d3.max(filtered_array, function(elem) { return elem[other_prop] as number; });
                if(min_elem < dim && max_elem > dim) {
                    if(prop == 'y') {
                        if(this.x_direction == 1) {
                            final_val = max_elem;
                        }
                        else {
                            final_val = min_elem;
                        }
                    } else {
                        // There are elements greater than and lesser than
                        // reference value. I am trying to see if there are
                        // multiple elements greater or lesser. If there is
                        // only one in one of the directions, that is the
                        // direction I draw the line in.
                        const lesser_arr = filtered_array.filter(function(elem) { return elem[other_prop] < dim; });
                        const greater_arr = filtered_array.filter(function(elem) { return elem[other_prop] > dim; });

                        if(lesser_arr.length == 1) {
                            final_val = min_elem;
                        } else if(greater_arr.length == 1) {
                            final_val = max_elem;
                        } else {
                            final_val = d3.max(lesser_arr, function(elem) {return elem[other_prop] as number; });
                        }
                    }
                } else {
                    if(min_elem > dim) {
                        final_val = min_elem;
                    } else {
                        final_val = max_elem;
                    }
                }
                const match_elem = editing_copy.filter(function(elem) { return elem[prop] == match && elem[other_prop] == final_val;});
                match_elem.forEach(function(elem) { editing_copy.splice(editing_copy.indexOf(elem), 1);} );
                const value = {};
                value[prop] = match;
                value[other_prop] = final_val;
                values.push(value);
            }
            else {
                final_val = dim;
            }
            //swap prop and other_prop
            const temp = prop;
            prop = other_prop;
            other_prop = temp;

            dim = match;
            match = final_val;
            max_iter--;
        }
        if(editing_copy.length > 0)
            values.push(editing_copy[0]);
        values.push(end_points[0]);
        const line = d3.line()
            .curve(d3.curveLinear)
            .x(function(d: any) { return d.x;})
            .y(function(d: any) { return d.y;});
        const bounding_path = d3.select(elem)
            .append('path')
            .attr("class", "bounding_path")
            .attr('d', function() {return line(values);})
            .attr('fill', 'none')
            .style('stroke', this.model.get('group_stroke'))
            .style('stroke-width', 3);
        return bounding_path;
    }

    calc_end_point_source(curr_x, curr_y, x_direction, y_direction) {
        curr_y = (y_direction == 1) ? curr_y : curr_y + 1;
        curr_x = (x_direction == 1) ? curr_x : curr_x + 1;
        return[{'x': curr_x * this.column_width, 'y': curr_y * this.row_height}];
    }

    calc_end_point_dest(curr_x, curr_y, x_direction, y_direction) {
        curr_y = (y_direction == -1) ? curr_y : curr_y + 1;
        curr_x = (x_direction == -1) ? curr_x : curr_x + 1;
        return[{'x': curr_x * this.column_width, 'y': curr_y * this.row_height}];
    }

    scales: any;
    num_rows: number;
    num_cols: number;
    row_groups: any;
    enable_select: any;
    data: any[];
    fig_map: any;
    fig_click: any;
    fig_hover: any;
    fig_names: any;
    axis: any[];
    selected_stroke: any;
    hovered_stroke: any;
    column_width: number;
    row_height: number;
    prev_x: number;
    prev_y: number;
    y_direction: number;
    x_direction: number;
    group_iter: number;
    ref_data: any;
    group_data: any;
    groups: any;
    colors: any;
    colors_map: any;
    grouped_data: any;
    running_sums: any[];
    tooltip_fields: any;
    tooltip_formats: any;
    rect_groups: any;
    end_points: any[];
    tooltip_view: any;
    row_limits: any[];
}
