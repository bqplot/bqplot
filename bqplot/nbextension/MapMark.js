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

requirejs.config({
    paths: {
            "d3topojson": "/nbextensions/bqplot/topojson/topojson",
           },
    shim: {
           "d3topojson": {exports: "topojson"},
          }
});

define(["./d3", "d3topojson", "./Figure", "base/js/utils", "./Mark"],
       function(d3, topojson, FigureViewModule, utils, Mark) {
    "use strict";

    var Map = Mark.Mark.extend({

        render: function() {
            var base_render_promise = Map.__super__.render.apply(this);
            this.map = this.el.append("svg")
                .attr("viewBox", "0 0 1200 980");
            this.width = this.parent.plotarea_width;
            this.height = this.parent.plotarea_height;
            this.map_id = utils.uuid();
            this.enable_hover = this.model.get("enable_hover");
            this.display_el_classes = ["event_layer"];
            var that = this;
            this.after_displayed(function() {
                this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
                this.create_tooltip();
            });
            return base_render_promise.then(function() {
                that.event_listeners = {};
                that.process_interactions();
                that.create_listeners();
                that.draw();
            });
        },
        set_ranges: function() {
        },
        set_positional_scales: function() {
            var geo_scale = this.scales["projection"];
            this.listenTo(geo_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },
        initialize_additional_scales: function() {
            var color_scale = this.scales["color"];
            if(color_scale) {
                this.listenTo(color_scale, "domain_changed", function() {
                    this.update_style();
                });
                color_scale.on("color_scale_range_changed",
                               this.update_style, this);
            }
        },
        remove_map: function() {
            d3.selectAll(".world_map.map" + this.map_id).remove();
        },
        draw: function() {
            this.set_ranges();
            var that = this;
            this.remove_map();
            this.transformed_g = this.map.append("g")
                .attr("class", "world_map map" + this.map_id);
            this.fill_g = this.transformed_g.append("g");
            this.highlight_g = this.transformed_g.append("g");
            this.stroke_g = this.transformed_g.append("g");
            var projection = this.scales["projection"];
            //Bind data and create one path per GeoJSON feature
            this.fill_g.selectAll("path")
			    .data(topojson.feature(this.model.geodata, this.model.geodata.objects.subunits).features)
				.enter()
				.append("path")
				.attr("d", projection.path)
				.style("fill", function(d, i) {
                    return that.fill_g_colorfill(d, i);
                });
            this.stroke_g.selectAll("path")
			    .data(topojson.feature(this.model.geodata, this.model.geodata.objects.subunits).features)
				.enter()
				.append("path")
                .attr("class", "event_layer")
				.attr("d", projection.path)
                .style("fill-opacity", 0.0)
                .on("click", function(d, i) {
                    return that.event_dispatcher("element_clicked", {"data": d, "index": i});
                });
            if(this.validate_color(this.model.get("stroke_color"))) {
                this.stroke_g.selectAll("path")
                    .style("stroke", this.model.get("stroke_color"));
            }
			this.zoom = d3.behavior.zoom()
                .scaleExtent([1, 8])
				.on("zoom", function() {
                   that.zoomed(that, false);
                });
			this.parent.bg.call(this.zoom);

            this.parent.bg.on("dblclick.zoom", null);
			this.parent.bg.on("dblclick", function() {
                that.zoomed(that, true);
            });
        },
        validate_color: function(color) {
            return color !== "";
        },
        mouseover_handler: function() {
            if (!this.model.get("hover_highlight")) {
                return
            }
            var el = d3.select(d3.event.target);
            if(this.is_hover_element(el)) {
                var data = el.data()[0];
                var select = this.model.get("selected").slice();
                var node = this.highlight_g.append(function() {
                    return el.node().cloneNode(true);
                });
                node.classed("hovered", true);
                node.classed("event_layer", false);

                if(this.validate_color(this.model.get("hovered_styles")["hovered_stroke"]) &&
                    select.indexOf(data.id) === -1) {
                    node.style("stroke", this.model.get("hovered_styles")["hovered_stroke"])
                        .style("stroke-width", this.model.get("hovered_styles")["hovered_stroke_width"]);
                }
                var that = this;
                if(this.validate_color(this.model.get("hovered_styles")["hovered_fill"]) &&
                    select.indexOf(data.id) === -1) {
                    node.style("fill-opacity", 1.0)
                        .style("fill", function() {
                            return that.model.get("hovered_styles")["hovered_fill"];
                        });
                }
            }
        },
        mouseout_handler: function() {
            if (!this.model.get("hover_highlight")) {
                return
            }
            var el = d3.select(d3.event.target);
            if(this.is_hover_element(el)) {
                var that = this;
	    		el.transition().style("fill", function(d, i) {
                    return that.fill_g_colorfill(d, i);
                });
                el.transition().style("stroke", function(d, i) {
                    return that.hoverfill(d, i);
                });
                that.highlight_g.selectAll(".hovered").remove();
            }
        },
        click_handler: function() {
            var el = d3.select(d3.event.target);
            if(this.is_hover_element(el)) {
                var data = el.data()[0];
                var name = this.model.get_subunit_name(data.id);
                var selected = this.model.get("selected").slice();
                var index = selected.indexOf(data.id);
                if(index > -1) {
                    selected.splice(index, 1);
                    this.model.set("selected", selected);
                    this.touch();
                    el.style("fill-opacity", 0.0).transition();
                    this.highlight_g.selectAll(".hovered").remove();
                    var choice = "#c".concat(data.id.toString());
                    d3.select(choice).remove();
                } else {
                    this.highlight_g.selectAll(".hovered").remove();
                    this.highlight_g.append(function() {
                        return el.node().cloneNode(true);
                    })
                    .attr("id", "c" + data.id)
                    .classed("selected", true)
                    .classed("event_layer", false);

                    if (this.validate_color(this.model.get("selected_styles")["selected_fill"])) {
                        this.highlight_g.selectAll(".selected")
                            .style("fill-opacity", 1.0)
                            .style("fill", this.model.get("selected_styles")["selected_fill"]);
                    }

                    if (this.validate_color(this.model.get("selected_styles")["selected_stroke"])) {
                        this.highlight_g.selectAll(".selected")
                            .style("stroke", this.model.get("selected_styles")["selected_stroke"])
                            .style("stroke-width", this.model.get("selected_styles")["selected_stroke_width"]);
                    }
                    selected.push(data.id);
                    this.model.set("selected", selected);
                    this.touch();
                }
            }
        },
		zoomed: function(that, reset) {
			var t = reset ? [0, 0] : d3.event.translate;
			var s = reset ? 1 : d3.event.scale;
			var h = that.height / 3;
			var w = reset ? that.width : 2 * that.width;

			t[0] = Math.min(that.width / 2 * (s - 1), Math.max(w / 2 * (1 - s), t[0]));
			t[1] = Math.min(that.height / 2 * (s - 1) + this.height * s, Math.max(h / 2 * (1 - s) - that.width * s, t[1]));

			that.zoom.translate(t);
            if (reset) {
                that.zoom.scale(s);
            }
			that.transformed_g.style("stroke-width", 1 / s)
                .attr("transform", "translate(" + t + ")scale(" + s + ")");
		},
        create_listeners: function() {
            var that = this;
            this.el.on("mouseover", _.bind(function() { this.event_dispatcher("mouse_over"); }, this))
                .on("mousemove", _.bind(function() { this.event_dispatcher("mouse_move");}, this))
                .on("mouseout", _.bind(function() { this.event_dispatcher("mouse_out");}, this));

            this.listenTo(this.model, "data_updated", this.draw, this);
            this.listenTo(this.model, "change:color", this.update_style, this);
            this.listenTo(this.model, "change:stroke_color", this.change_stroke_color, this);
            this.listenTo(this.model, "change:default_color", this.change_map_color, this);
            this.listenTo(this.model, "change:selected", this.change_selected, this);
            this.listenTo(this.model, "change:selected_styles", function() {
                that.change_selected_fill();
                that.change_selected_stroke();
            });
            this.listenTo(this.model, "change:interactions", this.process_interactions);
            this.listenTo(this.parent, "bg_clicked", function() {
                this.event_dispatcher("parent_clicked");
            });
            $(this.options.cell).on("output_area_resize." + this.map_id, function() {
                that.update_layout();
            });
        },
        process_interactions: function() {
            var interactions = this.model.get("interactions");
            if(_.isEmpty(interactions)) {
                //set all the event listeners to blank functions
                this.reset_interactions();
            }
            else {
                if(interactions["click"] !== undefined &&
                   interactions["click"] !== null) {
                    if(interactions["click"] === "tooltip") {
                        this.event_listeners["element_clicked"] = function() {
                            return this.refresh_tooltip(true);
                        };
                        this.event_listeners["parent_clicked"] = this.hide_tooltip;
                    } else if (interactions["click"] === "select") {
                        this.event_listeners["parent_clicked"] = this.reset_selection;
                        this.event_listeners["element_clicked"] = this.click_handler;
                    }
                } else {
                    this.reset_click();
                }
                if(interactions["hover"] !== undefined &&
                  interactions["hover"] !== null) {
                    if(interactions["hover"] === "tooltip") {
                        this.event_listeners["mouse_over"] = function() {
                            this.mouseover_handler();
                            return this.refresh_tooltip();
                        };
                        this.event_listeners["mouse_move"] = this.show_tooltip;
                        this.event_listeners["mouse_out"] = function() {
                            this.mouseout_handler();
                            return this.hide_tooltip();
                        }
                    }
                } else {
                    this.reset_hover();
                }
                if(interactions["legend_click"] !== undefined &&
                  interactions["legend_click"] !== null) {
                    if(interactions["legend_click"] === "tooltip") {
                        this.event_listeners["legend_clicked"] = function() {
                            return this.refresh_tooltip(true);
                        };
                        this.event_listeners["parent_clicked"] = this.hide_tooltip;
                    }
                } else {
                    this.event_listeners["legend_clicked"] = function() {};
                }
            }
        },
        update_layout: function() {
            this.remove_map();
            this.draw();
            this.change_selected();
        },
        change_selected_fill: function() {
            if (!this.validate_color(this.model.get("selected_styles")["selected_fill"])) {
                this.highlight_g.selectAll(".selected")
                    .style("fill-opacity", 0.0);
            } else {
                this.highlight_g.selectAll(".selected")
                    .style("fill-opacity", 1.0)
                    .style("fill", this.model.get("selected_styles")["selected_fill"]);
            }
        },
        change_selected_stroke: function() {
            if (!this.validate_color(this.model.get("selected_styles")["selected_stroke"])) {
                this.highlight_g.selectAll(".selected")
                    .style("stroke-width", 0.0);
            } else {
                this.highlight_g.selectAll(".selected")
                    .style("stroke-width", this.model.get("selected_styles")["selected_stroke_width"])
                    .style("stroke", this.model.get("selected_styles")["selected_stroke"]);
            }
        },
        change_selected: function() {
            this.highlight_g.selectAll("path").remove();
            var self = this;
            var select = this.model.get("selected").slice();
            var temp = this.stroke_g.selectAll("path").data();
            this.stroke_g.selectAll("path").style("stroke", function(d, i) {
                return self.hoverfill(d, i);
            });
            var nodes = this.stroke_g.selectAll("path");
            for (var i=0; i<temp.length; i++) {
                if(select.indexOf(temp[i].id) > -1) {
                    self.highlight_g.append(function() {
                        return nodes[0][i].cloneNode(true);
                    }).attr("id", temp[i].id)
                    .style("fill-opacity", function() {
                        if (self.validate_color(self.model.get("selected_styles")["selected_fill"])) {
                            return 1.0;
                        } else {
                            return 0.0;
                        }
                    })
                    .style("fill", self.model.get("selected_styles")["selected_fill"])
                    .style("stroke-opacity", function() {
                        if (self.validate_color(self.model.get("selected_styles")["selected_stroke"])) {
                            return 1.0;
                        } else {
                            return 0.0;
                        }
                    })
                    .style("stroke", self.model.get("selected_styles")["selected_stroke"])
                    .style("stroke-width", self.model.get("selected_styles")["selected_stroke_width"])
                    .classed("selected", true);
                }
            }
        },
        reset_selection: function() {
            this.model.set("selected", []);
            this.touch();
            this.highlight_g.selectAll(".selected").remove();
            d3.select(this.el.parentNode)
                .selectAll("path")
                .classed("selected", false);
            d3.select(this.el.parentNode)
                .selectAll("path")
                .classed("hovered", false);

            var that = this;
            this.stroke_g.selectAll("path").style("stroke", function(d, i) {
                return that.hoverfill(d, i);
            });
            this.fill_g.selectAll("path").classed("selected", false)
                .style("fill", function(d, i) {
                    return that.fill_g_colorfill(d,i);
                });
        },
        change_stroke_color: function(){
            this.stroke_g.selectAll("path")
                .style("stroke", this.model.get("stroke_color"));
        },
        change_map_color: function(){
            if (!this.is_object_empty(this.model.get("color"))){
                return;
            }
            this.fill_g.selectAll("path")
                .style("fill", this.model.get("default_color"));
        },
        update_style: function() {
            var color_data = this.model.get("color");
            var that = this;
            if (!this.is_object_empty(color_data)){
                this.fill_g.selectAll("path").style("fill", function(d, i) {
                    return that.fill_g_colorfill(d, i);
                });
            }
        },
        is_object_empty: function(object){
            var is_empty = true;
            for(var keys in object) {
                is_empty = false;
                break;
            }
            return is_empty;
        },
        hoverfill: function(d, j) {
            var select = this.model.get("selected").slice();
            if (select.indexOf(d.id) > -1 &&
                this.validate_color(this.model.get("selected_styles")["selected_stroke"])) {
                return this.model.get("selected_styles")["selected_stroke"];
            } else {
                return this.model.get("stroke_color");
            }
        },
        fill_g_colorfill: function(d, j) {
            var color_scale = this.scales["color"];
            var selection = this.model.get("selected");
            var color_data = this.model.get("color");
            if (selection.indexOf(d.id) > -1) {
                return this.model.get("selected_styles")["selected_fill"];
            } else if (this.is_object_empty(color_data)) {
                return this.model.get("default_color");
            } else if (color_data[d.id] === undefined ||
                       color_data[d.id] === null ||
                       color_data[d.id] === "nan" ||
                       color_scale === undefined) {
                return "Grey";
            } else {
                return color_scale.scale(color_data[d.id]);
            }
        },
    });

    return {
        Map: Map,
    };
});
