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

define(["widgets/js/manager", "widgets/js/widget", "d3", "./Figure", "base/js/utils"], function(WidgetManager, Widget, d3, FigureView, utils) {
    var baseFigure = FigureView[0];
    var MarketMap = baseFigure.extend({
        initialize: function() {
            MarketMap.__super__.initialize.apply(this, arguments);
        },
        remove: function() {
            this.model.off(null, null, this);
            this.svg.remove();
        },
        render: function(options) {
            this.width = this.model.get("map_width");
            this.height = this.model.get("map_height");

            this.scales = {};
            this.set_top_el_style();
            var self = this;
            this.margin = this.model.get("map_margin");
            this.num_rows = this.model.get("rows");
            this.num_cols = this.model.get("cols");
            this.row_groups = this.model.get("row_groups");
            this.clickable = this.model.get('clickable');

            this.data = this.model.get("names");
            this.ref_data = this.model.get("ref_data");
            this.group_data = this.model.get("groups");
            this.groups = _.uniq(this.group_data, true);
            var display_text = this.model.get("display_text");
            display_text = (display_text == undefined || display_text.length == 0) ? this.data : display_text;

            this.colors = this.model.get('colors');
            var num_colors = this.colors.length;
            this.colors_map = function(d) { return self.get_color(d, num_colors);};
            var color_data = this.model.get('color_data');
            var mapped_data = this.data.map(function(d, i) {
                return {'display': display_text[i], 'name': d, 'color': color_data[i],
                        'group': self.group_data[i], 'ref_data': self.ref_data[i]};
            });
            var num_items = mapped_data.length;

            if (this.num_cols !== undefined && this.num_cols !== null && this.num_cols != 0) {
                // When the number of row groups is greater than 1, the number
                // of columns has to be an odd number. This is to
                // ensure the continuity of the waffles when groups are spread
                // across multiple row groups
                if(this.row_groups > 1 && this.num_cols % 2 == 0)
                    this.num_cols++;
                this.num_rows = Math.floor(num_items / this.num_cols);
                this.num_rows = (num_items % this.num_cols == 0) ? this.num_rows : (this.num_rows + 1);
            } else if(this.num_rows !== undefined && this.num_rows !== null && this.num_rows != 0) {
                this.num_cols = Math.floor(num_items / this.num_rows);
                this.num_cols = (num_items % this.num_rows == 0) ? this.num_cols : (this.num_cols + 1);
                if(this.row_groups > 1 && this.num_cols % 2 == 0)
                    this.num_cols++;
            } else {
                this.num_cols = Math.floor(Math.sqrt(num_items));
                if(this.row_groups > 1 && this.num_cols % 2 == 0)
                    this.num_cols++;
                this.num_rows = Math.floor(num_items / this.num_cols);
                this.num_rows = (num_items % this.num_cols == 0) ? this.num_rows : (this.num_rows + 1);
            }
            // Reading the properties and creating the dom elements required
            this.svg = d3.select(this.el)
                    .attr("viewBox", "0 0 "+ this.width +' '+ this.height)
                    .attr("width", "100%")
                    .attr("height", "100%");
            if (this.model.get('theme')) {
                this.svg.classed(this.model.get('theme'), true)
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
                .attr("id", "map_tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("pointer-events", "none")
                .style("z-index", 1001);  // setting the z-index to a value which is greater than the full screen z-index value

            this.tooltip_fields = this.model.get("tooltip_fields");
            var formats = this.model.get("tooltip_formats");
            this.tooltip_formats = this.tooltip_fields.map(function(field, index) {
                var fmt = formats[index];
                if(fmt == undefined || fmt == "") {return function(d) { return d;}}
                else return d3.format(fmt);
            });

            this.selected_stroke = this.model.get("selected_stroke");
            this.hovered_stroke = this.model.get("hovered_stroke");

            this.grouped_data = _.groupBy(mapped_data, function(d, i) {return self.group_data[i];});
            this.groups = [];
            this.running_sums = [];
            this.running_sums[0] = 0;
            var count = 0;
            for (var key in this.grouped_data) {
                this.groups.push(key);
                count += this.grouped_data[key].length;
                this.running_sums.push(count);
            }
            this.running_sums.pop();
            this.update_plotarea_dimensions();
            // depending on the number of rows, we need to decide when to
            // switch direction. The below functions tells us where to swtich
            // direction.
            this.set_row_limits();

            var scale_creation_promise = this.create_scale_views();
            scale_creation_promise.then(function() {
                self.color_scale = self.scales['color'];
                if(self.color_scale){
                    self.color_scale.compute_and_set_domain(color_data, 0);
                    self.color_scale.set_range();
                    self.color_scale.on("color_scale_range_changed", self.update_map_colors, self);
                }
                self.create_listeners();
                // self.draw_map();

                self.axis_views = new Widget.ViewList(self.add_axis, null, self);
                self.axis_views.update(self.model.get("axes"));
                self.model.on("change:axes", function(model, value, options) {
                    self.axis_views.update(value);
                });
            });
            this.after_displayed(function() {
                // Adding the tooltip to the parent of the el so as to not
                // pollute the DOM
                this.el.parentNode.appendChild(this.tooltip_div.node());
                this.update_layout();
                this.draw_group_names();
            });
            $(this.options.cell).on("output_area_resize", function() {
                self.update_layout();
            });
        },
        set_top_el_style: function() {
            this.$el.css({
                "user-select": "none",
                "ms-user-select": "none",
                "moz-user-select": "none",
                "khtml-user-select": "none",
                "webkit-user-select": "none"});

            this.$el.css({"flex-grow": "1",
                          "flex-shrink": "1",
                          "align-self": "stretch",
                          "min-width": this.width,
                          "min-height": this.height});
        },
        update_plotarea_dimensions: function() {
            this.rect_width = this.width - this.margin.left - this.margin.right;
            this.rect_height = this.height - this.margin.top - this.margin.bottom;
            this.column_width = parseFloat((this.rect_width / this.num_cols).toFixed(2));
            this.row_height = parseFloat((this.rect_height / this.num_rows).toFixed(2));
        },
        reset_drawing_controls: function() {
            // Properties useful in drawing the map
            this.prev_x = 0;
            this.prev_y = -1;
            this.y_direction = 1;  // for y direction 1 means going to the right
            this.x_direction = 1;  // for x direction 1 means going down
            this.group_iter = 1;
        },
        create_listeners: function() {
            this.model.on('change:color_data', this.recolor_chart, this);
            this.model.on('change:show_groups', this.show_groups, this);
            this.model.on('change:selected_stroke', this.update_selected_stroke, this);
            this.model.on('change:hovered_stroke', this.update_hovered_stroke, this);
            this.model.on('change:selected', function() { this.clear_selected(); this.apply_selected(); }, this);
        },
        update_layout: function() {
            // First, reset the natural width by resetting the viewbox, then measure the flex size, then redraw to the flex dimensions
            this.svg.attr("width", null);
            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            setTimeout($.proxy(this.update_layout2, this), 0);
        },
        update_layout2: function() {
            rect = this.el.getBoundingClientRect();
            this.width = rect.width > 0 ? rect.width : this.model.get("map_width");
            this.height = rect.height > 0 ? rect.height : this.model.get("map_height");
            setTimeout($.proxy(this.update_layout3, this), 0);
        },
        update_layout3: function() {
            var preserve_aspect = this.model.get("preserve_aspect");
            if (preserve_aspect === true) {
                var aspect_ratio = this.model.get("map_width")/this.model.get("map_height");
                if (this.width/this.height > aspect_ratio) {
                    this.width = this.height*aspect_ratio;
                } else {
                    this.height = this.width/aspect_ratio;
                }
            }
            // update ranges
            this.margin = this.model.get("map_margin");
            this.update_plotarea_dimensions();

            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            this.svg.attr("width", this.width);
            // transform figure
            this.fig.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
            this.draw_map();

            // Drawing the selected cells
            this.clear_selected();
            this.apply_selected();

            // When map is expanded or contracted, there should not be any
            // accidental hovers. To prevent this, the following call is made.
            this.fig_hover.selectAll("rect")
                .remove();
            this.hide_tooltip();
            this.trigger("margin_updated");
        },
        create_scale_views: function() {
            for (var key in this.scales) {
                this.stopListening(this.scales[key]);
            }
            var scale_models = this.model.get("scales");
            var that = this;
            var scale_promises = {}
            _.each(scale_models, function(model, key) {
                scale_promises[key] = that.create_child_view(model);
            });
            return utils.resolve_promises_dict(scale_promises).then(function(d) {
                that.scales = d;
            });
        },
        show_groups: function(model, value) {
            this.fig_names.style("display", (value ? "inline" : "none"));
            this.fig_map.selectAll(".market_map_text").style("opacity", (value ? 0.2 : 1));
            this.fig_map.selectAll(".market_map_rect").style("stroke-opacity", (value ? 0.2 : 1));
        },
        draw_map: function() {
            this.reset_drawing_controls();
            // Removing pre existing elements from the map
            this.fig_map.selectAll(".element_group").remove();
            this.rect_groups = this.fig_map.selectAll(".element_group")
                .data(this.groups);

            var that = this;
            this.rect_groups.enter()
                .append("g")
                .attr("class", "element_group")
                .attr("transform", function(d, i) { return that.get_group_transform(i); });

            this.rect_groups.exit().remove();
            this.end_points = [];
            this.rect_groups[0].forEach(function(d, i) {
                var data = that.grouped_data[that.groups[i]];
                var color = that.colors_map(i);
                var return_arr = that.get_new_cords();
                var ends = that.get_end_points(return_arr[2], data.length, return_arr[0], return_arr[1], return_arr[3], return_arr[4]);
                ends.forEach(function(point) { that.end_points.push(point); });
                var element_count = that.running_sums[i];

                var groups = d3.select(d)
                    .selectAll(".rect_element")
                    .data(data);

                // Appending the <g> <rect> and <text> elements to the newly
                // added nodes
                var new_groups = groups.enter()
                    .append("g")
                    .classed("rect_element", true);

                new_groups.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .classed("market_map_rect", true);

                new_groups.append("text")
                    .classed("market_map_text", true)
                    .style({"text-anchor": "middle", 'fill' :'black'});

                // Update the attributes of the entire set of nodes
                groups.attr("transform", function(data, ind) { return that.get_cell_transform(ind); })
                    .on("click", function(data, ind) {$.proxy(that.cell_click_handler(data, (element_count + ind), this), that);})
                    .on("mouseover", function(data, ind) {$.proxy(that.mouseover_handler(data, (element_count + ind), this), that);})
                    .on("mouseout", function(data, ind) {$.proxy(that.mouseout_handler(data, (element_count + ind), this), that);})
                    .attr("class",function(data, index) { return d3.select(this).attr("class") + " " + "rect_" + (element_count + index); })
                    .attr("id", function(data) { return "market_map_element_" + data['name']});

                groups.selectAll(".market_map_rect")
                    .attr("width", that.column_width)
                    .attr("height", that.row_height)
                    .style("stroke-opacity", (that.model.get("show_groups") ? 0.2 : 1.0))
                    .style({'stroke': that.model.get("stroke"), "fill": function(elem, j) { return (that.color_scale && elem.color != undefined)
                           ? that.color_scale.scale(elem["color"]) : that.colors_map(i);}});

                groups.selectAll(".market_map_text")
                    .attr("x", that.column_width / 2.0)
                    .attr("y", that.row_height / 2.0)
                    .text(function(data, j) { return data['display']; })
                    .style("opacity", (that.model.get("show_groups") ? 0.2 : 1.0))

                // Removing the old nodes
                groups.exit().remove();
                var path = that.create_bounding_path(d, ends);
                var min_x = d3.min(ends, function(end_point) { return end_point.x;});
                var min_y = d3.min(ends, function(end_point) { return end_point.y;});

                that.fig_names.append("foreignObject")
                    .attr("class", "names_object")
                    .attr("x", min_x)
                    .attr("y", min_y)
                    .append("xhtml:div")
                    .attr("class", "names_div")
                    .style({"display": "flex", "flex-direction": "row", "align-content": "center", "align-items": "center", "width": "100%",
                           "height": "100%", "justify-content": "center", "word-wrap": "break-word", "font": "24px sans-serif", "color": "black"})
                    .text(that.groups[i]);
            });
            this.draw_group_names();
        },
        draw_group_names: function() {
            // Get all the bounding rects of the paths around each of the
            // sectors. Get their client bounding rect.
            var paths = d3.select(this.el).selectAll(".bounding_path")[0];
            var clientRects = paths.map(function(path) { return path.getBoundingClientRect(); });
            var text_elements = this.fig_names.selectAll(".names_object").data(clientRects);
            text_elements.attr("width", function(d) { return d.width;})
                .attr("height", function(d) { return d.height;});
        },
        recolor_chart: function() {
            var that = this;
            var color_data = this.model.get('color_data');
            var display_text = this.model.get("display_text");
            display_text = (display_text == undefined || display_text.length == 0) ? this.data : display_text;

            var mapped_data = this.data.map(function(d, i) { return {'name': d, 'display': display_text[i],
                                                                     'color': color_data[i], 'group': that.grouped_data[i], 'ref_data': that.ref_data[i]};});

            if(this.color_scale){
                this.color_scale.compute_and_set_domain(color_data, 0);
                this.color_scale.set_range();
            }

            this.grouped_data = _.groupBy(mapped_data, function(d, i) {return that.group_data[i];});
            this.rect_groups = this.fig.selectAll(".element_group")
                .data(this.groups);

            var that = this;

            this.rect_groups[0].forEach(function(d, i) {
                var data = that.grouped_data[that.groups[i]];
                var color = that.colors_map(i);
                var groups = d3.select(d)
                    .selectAll(".rect_element")
                    .data(data)
                    .select('rect')
                    .style({'stroke': that.model.get('stroke'), 'fill': function(elem, j)
                           { return (that.color_scale && elem.color != undefined) ? that.color_scale.scale(elem['color']) : that.colors_map(i);}});
            });
        },
        update_map_colors: function() {
            var that = this;
            this.rect_groups[0].forEach(function(d, i) {
                var data = that.grouped_data[that.groups[i]];
                var color = that.colors_map(i);
                var groups = d3.select(d)
                    .selectAll(".rect_element")
                    .data(data)
                    .select('rect')
                    .style({'stroke': that.model.get('stroke'), 'fill': function(elem, j) { return (that.color_scale && elem.color != undefined)
                           ? that.color_scale.scale(elem['color']) : that.colors_map(i);}});
            });
        },
        cell_click_handler: function(data, id, cell) {
            var selected = this.model.get("selected").slice();
            var index = selected.indexOf(data.name);
            var cell_id = d3.select(cell).attr("id");
            if(index == -1) {
                //append a rectangle with the dimensions to the g-click
                selected.push(data.name);
                var transform = d3.select(cell).attr("transform");
                this.add_selected_cell(cell_id, transform);
            }
            else {
                this.fig_click.select("#click_" + cell_id)
                    .remove();
                //remove the rectangle from the g-click
                selected.splice(index, 1);
            }
            this.model.set("selected", selected);
            this.touch();
        },
        apply_selected: function() {
            var selected = this.model.get("selected");
            var self = this;
            if(selected === undefined || selected === null || selected.length == 0)
                this.clear_selected();
            else{
                selected.forEach(function(data) {
                    var cell_id = "market_map_element_" + data;
                    self.fig_click.select("#click_" + cell_id)
                        .remove();
                    if(self.fig_map.selectAll("#"+ cell_id)[0].length == 1) {
                        var transform = self.fig_map.selectAll("#"+ cell_id).attr("transform");
                        self.add_selected_cell(cell_id, transform);
                    }
               });
            }
        },
        clear_selected: function() {
            this.fig_click.selectAll("rect")
                .remove();
        },
        add_selected_cell: function(id, transform) {
            this.fig_click.append("rect")
                .attr("id", "click_" + id)
                .attr("transform", transform)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.column_width)
                .attr("height", this.row_height)
                .style({'stroke': this.selected_stroke, 'stroke-width': '4px', 'fill': 'none'});
        },
        mouseover_handler: function(data, id, cell) {
            var transform = d3.select(cell).attr("transform");
            if(this.model.get("enable_hover")) {
                this.fig_hover.append("rect")
                    .attr("class", "hover_" + id)
                    .attr("transform", transform)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", this.column_width)
                    .attr("height", this.row_height)
                    .style({'stroke': this.hovered_stroke, 'stroke-width': '3px', 'fill': 'none'});
            }
            this.show_tooltip(d3.event, data);
        },
        update_selected_stroke: function(model, value) {
            this.selected_stroke = value;
            var that = this;
            this.fig_click.selectAll("rect")
                .style({'stroke': value});
        },
        update_hovered_stroke: function(model, value) {
            this.hovered_stroke = value;
            // I do not need to update anything else because when hovered color
            // is being updated you are not hovering over anything.
        },
        mouseout_handler: function(data, id, cell) {
            if(this.model.get("enable_hover")) {
                this.fig_hover.select(".hover_" + id)
                    .remove();
            }
            this.hide_tooltip();
        },
        show_tooltip: function(event, data) {
            var mouse_pos = d3.mouse(this.el);
            var that = this;
            var tooltip_div = d3.select("body")
                .select("#map_tooltip");
            tooltip_div.transition()
                .style("opacity", .9);

            // the +5s are for breathing room for the tool tip
            tooltip_div.style("left", (mouse_pos[0] + this.el.offsetLeft + 5) + "px")
                .style("top", (mouse_pos[1] + this.el.offsetTop + 5) + "px");
            tooltip_div.select("table").remove();

            var tooltip_table = tooltip_div.append("table")
                .selectAll("tr").data(this.tooltip_fields);

            tooltip_table.exit().remove();
            var table_rows = tooltip_table.enter().append("tr");

            table_rows.append("td")
                .attr("class", "tooltiptext")
                .text(function(datum) { return datum;});

            table_rows.append("td")
                .attr("class", "tooltiptext")
                .text(function(datum, index) { return that.tooltip_formats[index](data.ref_data[datum]);});
        },
        hide_tooltip: function() {
            var tooltip_div = d3.select("body")
                .select("#map_tooltip");
            tooltip_div.transition()
                .style("opacity", 0);
        },
        get_group_transform: function(index) {
            return "translate(" + '0' + ", 0)";
        },
        get_cell_transform: function(index) {
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
            return "translate(" + (this.prev_x * this.column_width) + ", " + (this.prev_y * this.row_height) + ")";
        },
        get_new_cords: function() {
            var new_x = this.prev_x;
            var new_y = this.prev_y;
            var y_direction = this.y_direction;
            var x_direction = this.x_direction;
            var group_iter = this.group_iter;
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
        },
        past_border_y: function() {
            if(this.y_direction == 1) {
                return (this.prev_y + 1) < this.row_limits[this.group_iter];
            } else {
                return (this.prev_y - 1) > this.row_limits[this.group_iter -1] - 1;
            }
        },
        past_border_x: function() {
            if(this.x_direction == 1) {
                return (this.prev_x + 1) < this.num_cols;
            } else {
                return (this.prev_x - 1) > -1;
            }
        },
        get_color: function(index, length) {
            return this.colors[index % length];
        },
        set_row_limits: function() {
            var step = Math.floor(this.num_rows / this.row_groups);
            this.row_limits = [];
            for(var iter = this.row_groups - 1; iter > -1; iter--){
                this.row_limits.unshift(iter * step);
            }
            this.row_limits[this.row_groups] = this.num_rows;
        },
        get_end_points: function(group_iter, num_cells, start_col, start_row, x_direction, y_direction) {
            //start_row is the 0-based index and not a 1-based index, i.e., it
            //is not the column number in the truest sense
            // Function to get the end points of the rectangle representing the
            // groups.
            // Requires the direction variables to be updated before this
            // function is called
            var top_row = this.row_limits[group_iter - 1];
            var bottom_row = this.row_limits[group_iter];
            var across = false;

            var init_x = x_direction;
            var init_y = y_direction;
            var end_points = [];

            var rows_remaining = (init_y == 1) ? (bottom_row - start_row) : (start_row - top_row + 1);
            var cols_remaining = (init_x == 1) ? (this.num_cols - 1 - start_col) : (start_col); // this is the num of columns remaining
            //after the cuirrent column has been filled
            var elem_remaining = num_cells;
            //this holds the number of continuous cols that will be filled
            //between the current top and bottom rows
            var num_rows = bottom_row - top_row;

            if(elem_remaining != 0){
                this.calc_end_point_source(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
                var elem_filled = Math.min(rows_remaining, elem_remaining);
                elem_remaining = elem_remaining - elem_filled;
                if(cols_remaining == 0) {
                    this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });
                }
                else if(rows_remaining != (bottom_row - top_row)) {
                    this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });

                    if(elem_remaining > num_rows) {
                        this.calc_end_point_dest(start_col + init_x, (init_y == 1) ? top_row :
                                             bottom_row - 1, init_x * (-1), init_y * (-1)).forEach(function(d) { end_points.push(d); });
                    }
                }
                start_row = start_row + (init_y * (elem_filled - 1));
                //first set of end points are added here
                this.calc_end_point_dest(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
                if(elem_remaining == 0) {
                    this.calc_end_point_dest(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
                    return end_points;
                }
                if(cols_remaining != 0 && elem_remaining > num_rows)
                    start_col = start_col + init_x;
            }

            while(elem_remaining > num_rows) {
                var no_cont_cols;
                if(num_rows * cols_remaining < elem_remaining) {
                    no_cont_cols = cols_remaining;
                    var leftover_elem = elem_remaining - (no_cont_cols) * num_rows;
                    no_cont_cols += Math.floor(leftover_elem / (this.row_limits[group_iter + 1] - this.row_limits[group_iter]));
                } else {
                    no_cont_cols = Math.floor(elem_remaining / num_rows);
                }

                if(no_cont_cols > cols_remaining){
                    start_col = (init_x == 1) ? this.num_cols - 1 : 0;
                    if(cols_remaining != 0)
                        this.calc_end_point_dest(start_col, top_row, init_x, -1).forEach(function(d) { end_points.push(d); });
                    no_cont_cols = cols_remaining;
                    cols_remaining = this.num_cols;
                    group_iter += 1;
                    top_row = bottom_row;
                    bottom_row = this.row_limits[group_iter];
                    start_row = top_row;
                    init_x = -1 * init_x;
                    init_y = Math.pow(-1, no_cont_cols) * init_y * (-1);
                    this.calc_end_point_dest(start_col, bottom_row - 1, (-1) * init_x, 1).forEach(function(d) { end_points.push(d); });
                } else if (no_cont_cols == cols_remaining) {
                    start_col = (init_x == 1) ? this.num_cols - 1 : 0;
                    if(cols_remaining != 0)
                        this.calc_end_point_dest(start_col, top_row, init_x, -1).forEach(function(d) { end_points.push(d); });

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
                    init_y = Math.pow(-1, (no_cont_cols)) * init_y;
                    //as I am moving down this time, next time I will move up
                    //and I might not reach the top row, it might be an end
                    //point.
                    start_row = (init_y == 1) ? top_row : bottom_row - 1;
                    start_col = start_col + (init_x) * (no_cont_cols - 1);
                    this.calc_end_point_source(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
                }
                elem_remaining -= (no_cont_cols * (num_rows));
                num_rows = bottom_row - top_row;
                //reset direction
                //this is an end point
            }
            //all elements are exhausted
            if(elem_remaining == 0){
                start_row = (init_y == 1) ? bottom_row - 1 : top_row;
                init_x = (across) ? ((-1) * init_x) : init_x;
                this.calc_end_point_dest(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
            }
            else {
                init_y = -1 * init_y;
                start_row = (init_y == 1) ? top_row : bottom_row - 1;
                start_col = (across) ? start_col : (start_col + (init_x));
                this.calc_end_point_source(start_col, start_row, init_x * (-1), init_y).forEach(function(d) { end_points.push(d); });
                start_row = start_row + (elem_remaining - 1) * init_y;
                this.calc_end_point_dest(start_col, start_row, init_x, init_y).forEach(function(d) { end_points.push(d); });
                this.calc_end_point_dest(start_col, start_row, (-1) * init_x, init_y).forEach(function(d) { end_points.push(d); });
            }
            // console.log("new set");
            // end_points.forEach(function(point) { console.log(point); });
            // console.log("end set");
            return end_points;
        },
        create_bounding_path: function(elem, end_points) {
            var start_x = end_points[0].x;
            var start_y = end_points[0].y;
            var values = [];
            var editing_copy = end_points.slice();
            values.push(end_points[0]);
            editing_copy.splice(0, 1);
            //do union based on which direction you are trying to move in and
            //draw the path
            //best way seems to be horizaontal followed by vertical
            var props = ['x', 'y'];
            var iter = 0;
            prop = props[iter % 2];
            other_prop = props[(iter + 1) % 2];
            var curr_elem = values[0];
            var match = curr_elem[prop];
            var dim = curr_elem[other_prop];
            var max_iter = 2 * editing_copy.length;
            while(editing_copy.length > 1 && max_iter > 0){
                filtered_array = editing_copy.filter(function(elem) { return elem[prop] == match; });
                if(filtered_array.length > 0) {
                    iter++;
                    var min_elem = d3.min(filtered_array, function(elem) { return elem[other_prop]; });
                    var max_elem = d3.max(filtered_array, function(elem) { return elem[other_prop]; });
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
                            var lesser_arr = filtered_array.filter(function(elem) { return elem[other_prop] < dim; });
                            var greater_arr = filtered_array.filter(function(elem) { return elem[other_prop] > dim; });

                            if(lesser_arr.length == 1) {
                                final_val = min_elem;
                            } else if(greater_arr.length == 1) {
                                final_val = max_elem;
                            } else {
                                final_val = d3.max(lesser_arr, function(elem) {return elem[other_prop]; });
                            }
                        }
                    } else {
                        if(min_elem > dim) {
                            final_val = min_elem;
                        } else {
                            final_val = max_elem;
                        }
                    }
                    match_elem = editing_copy.filter(function(elem) { return elem[prop] == match && elem[other_prop] == final_val});
                    match_elem.forEach(function(elem) { editing_copy.splice(editing_copy.indexOf(elem), 1);} );
                    value = {};
                    value[prop] = match;
                    value[other_prop] = final_val;
                    values.push(value);
                }
                else {
                    final_val = dim;
                }
                //swap prop and other_prop
                var temp = prop;
                prop = other_prop;
                other_prop = temp;

                dim = match;
                match = final_val;
                max_iter--;
            }
            values.push(editing_copy[0]);
            values.push(end_points[0]);
            var line = d3.svg.line()
                .interpolate('linear')
                .x(function(d) { return d.x;})
                .y(function(d) { return d.y;});
            var bounding_path = d3.select(elem)
                .append('path')
                .attr("class", "bounding_path")
                .attr('d', function() {return line(values);})
                .attr('fill', 'none')
                .style('stroke', this.model.get('group_stroke'))
                .style('stroke-width', 3);
            return bounding_path;
        },
        calc_end_point_source: function(curr_x, curr_y, x_direction, y_direction) {
            curr_y = (y_direction == 1) ? curr_y : curr_y + 1;
            curr_x = (x_direction == 1) ? curr_x : curr_x + 1;
            return[{'x': curr_x * this.column_width, 'y': curr_y * this.row_height}];
        },
        calc_end_point_dest: function(curr_x, curr_y, x_direction, y_direction) {
            curr_y = (y_direction == -1) ? curr_y : curr_y + 1;
            curr_x = (x_direction == -1) ? curr_x : curr_x + 1;
            return[{'x': curr_x * this.column_width, 'y': curr_y * this.row_height}];
        },
    });
    WidgetManager.WidgetManager.register_widget_view("MarketMap", MarketMap);
    return [MarketMap];
});
