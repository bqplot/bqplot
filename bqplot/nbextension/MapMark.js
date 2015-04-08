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

define(["./d3", "d3topojson", "./Figure", "base/js/utils", "./require-less/less!./worldmap"], function(d3, topojson, FigureViewModule, utils) {
    "use strict";


    function cloneAll(selector) {
        var nodes = d3.selectAll(selector);
        nodes.each(function(d, i) {
            nodes[0][i] = (this.cloneNode(true));
        });
        return nodes;
    }

    var Map = FigureViewModule.Figure.extend({

        render: function() {
            this.map_id = utils.uuid();
            this.margin = this.model.get("fig_margin");
            this.enable_hover = this.model.get("enable_hover");
            this.x_offset = (this.options.x) ? this.options.x : 0;
            this.y_offset = (this.options.y) ? this.options.y : 0;

            this.margin.left += this.x_offset;
            this.margin.top += this.y_offset;

            this.def_wt = this.options.width;
            this.def_ht = this.options.height;

            this.title = this.model.get("title");
            this.width = this.model.get("min_width") - this.margin.left - this.margin.right;
            this.height = this.model.get("min_height") - this.margin.top - this.margin.bottom;

            this.$el.css({"flex-grow": "1",
                          "flex-shrink": "1",
                          "align-self": "stretch",
                          "min-width": this.width,
                          "min-height": this.height});

            this.fmt = d3.format(this.model.get("tooltip_format"));

            this.create_promises();
        },
        // first have your own set_scale_views, (found in Mark.js) calling
        // set_positional_scales and set_additional_scales and set_ranges
        create_projection: function() {
            //// Map this to be like set_positional_scales
            var projection = this.model.get("scales")['projection'];
            var that = this;
            that.create_child_view(projection).then(function(view) {
                that.scale = view.scale;

                that.create_data();
            });
        },
        create_promises: function() {
            // This is the set_additional_scale
            var that = this;
            var scales = this.model.get("scales")['color'];
            var color_data = this.model.get("color");


            if (scales) {
                that.create_child_view(scales).then(function(view) {
                    that.color_scale = view;
                    var z_data = Object.keys(color_data).map(function (d) {
                        return color_data[d];
                    });

                    if (that.color_scale) {
                        that.color_scale.compute_and_set_domain(z_data, 0);
                        that.color_scale.set_range();

                        // move this to set_ranges
                        that.color_scale.on("color_scale_range_changed", function() {
                                that.color_change();
                        }, that);

                        //TODO: I am forcing the map to update colors by
                        //calling the function below after the color scale is
                        //created. Bad way to do this. See if the draw can be
                        //called in the resolve handler.
                        that.color_change();
                    }
                    // Trigger the displayed event of the child view.
                });
            }

            that.create_projection();

        },
        create_data: function() {
            // Move to map model
            var that = this;
            var data = utils.load_class.apply(this, this.model.get('map_data'));

            data.then(function(mapdata) {
                that.geodata = mapdata[0];
                that.subunits = mapdata[1];

                that.after_displayed(function() {
                    d3.select(that.el.parentNode).selectAll('#world_tooltip').remove();
                    that.draw_map();
                    that.update_layout();
                    that.create_listeners();
                    that.create_tooltip_widget();
                });
            });
        },
        get_subunit_name: function(id) {
		    for(var i = 0; i< this.subunits.length; i++) {
			    if(id == this.subunits[i].id){
				    name = this.subunits[i].Name;
				}
			}
            return name;
        },
        create_tooltip_widget: function() {
            this.tooltip_widget = this.model.get("tooltip_widget");
            var self = this;

            if (this.tooltip_view) {
                this.tooltip_view.remove();
            }

            if(this.tooltip_widget) {
                var tooltip_widget_creation_promise = this.create_child_view(this.tooltip_widget);
                tooltip_widget_creation_promise.then(function(view) {
                    self.tooltip_view = view;
                    self.tooltip_div.node().appendChild(d3.select(view.el).node());
                });
            }
        },
        remove_map: function() {
            d3.selectAll('.world_map.map'+this.map_id).remove();
            d3.selectAll('.world_viewbox.map'+this.map_id).remove();
            d3.selectAll('.color_axis.map'+this.map_id).remove();
        },
        // you don't need that and co
        create_axis: function() {
            var that = this;
            d3.selectAll('.color_axis.map'+this.map_id).remove();
            if (this.model.get("axis")!==null) {
                this.svg_over.attr("height", "85%");

                this.ax_g = this.svg.append("g")
                                    .attr("class", "color_axis map"+this.map_id);

                this.create_child_view(this.model.get("axis")).then(function(view) {
                    if(that.axes_view) {
                        that.axes_view.remove();
                    }
                    that.axes_view = view;
                    that.ax_g.node().appendChild(view.el.node());

                that.after_displayed(function() {
                        view.trigger("displayed");
                    });
                });
            } else {
                if(this.axes_view) {
                    this.axes_view.remove();
                }
                this.svg_over.attr("height", "100%");
            }
        },
        create_tooltip_div: function() {
            if (!this.tooltip_div) {
                this.tooltip_div = d3.select(this.el.parentNode).append("div")
                .attr("id", "world_tooltip")
                .style("pointer-events", "none")
                .style("z-index", 1001)
                .classed("hidden", true);
            } else {
                this.tooltip_div = d3.select(this.el.parentNode)
                                     .select('#world_tooltip');
            }
        },
        draw_map: function() {

            var that = this;
            var w = this.width;
            var h = this.height;

            //Define default path generator
			this.svg = d3.select(this.el);

            this.svg.attr("viewBox", "0 0 "+ this.width +' '+ this.height);

            this.svg_over = d3.select(this.el).append("svg")
                .attr("viewBox", "0 0 1075 750")
                .attr("width", "100%")
                .attr("class", "world_viewbox map"+this.map_id)
                .on("click", function(d) { that.ocean_clicked(); });

            this.create_axis();

            this.transformed_g = this.svg_over.append("g")
                                     .attr("class", "world_map map"+this.map_id);
            this.fill_g = this.transformed_g.append("g");
            this.highlight_g = this.transformed_g.append("g");
            this.stroke_g = this.transformed_g.append("g");

            this.create_tooltip_div();

            //Bind data and create one path per GeoJSON feature
            this.fill_g.selectAll("path")
			    .data(topojson.feature(this.geodata, this.geodata.objects.subunits).features)
				.enter()
				.append("path")
				.attr("d", that.scale)
				.style("fill", function(d, i) {
                    return that.fill_g_colorfill(d, i);
                });

            this.stroke_g.selectAll("path")
			    .data(topojson.feature(this.geodata, this.geodata.objects.subunits).features)
				.enter()
				.append("path")
				.attr("d", that.scale)
                .style("fill-opacity", 0.0)
				.on("mouseover", function(d){
                    that.mouseover_handler(d, this);
                })
				.on("mousemove", function(d){
                    that.mousemove_handler(d);
                })
				.on("mouseout", function(d) {
                    that.mouseout_handler(d, this);
				})
				.on("click", function(d) {
                    return that.click_highlight(d, this);
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
			this.svg.call(this.zoom);
			this.svg.on("dblclick.zoom", null);

			this.svg.on("dblclick", function() {
                that.zoomed(that, true);
            });
        },
        mouseout_handler: function(d, self) {
            if (!this.model.get("enable_hover")) {
                return;
            }

            var that = this;

            d3.select(this.el.parentNode)
              .select("#world_tooltip").classed("hidden", true);

			d3.select(self).transition().style("fill", function(d, i) {
                return that.fill_g_colorfill(d, i);
            });

            d3.select(self).transition()
              .style("stroke", function(d, i) {
                    return that.hoverfill(d, i);
              });

            that.highlight_g.selectAll(".hovered").remove();

        },
        validate_text: function(text) {
            if (text !== undefined && text !== null) {
                return true;
            } else {
                return false;
            }
        },
        mousemove_handler: function(d) {
            if(!this.model.get("enable_hover")) {
                return;
            }

			var name = this.get_subunit_name(d.id);
            var mouse_pos = d3.mouse(this.el);
            var color_data = this.model.get("color");
            var tooltip = d3.select(this.el.parentNode).select('#world_tooltip');

			tooltip.classed("hidden", false);

            if (this.model.get("display_tooltip")) {
                if (this.tooltip_widget) {
                      tooltip.style("background-color", "transparent")
				             .style({"left": (mouse_pos[0] + this.el.offsetLeft + 5) + "px",
                                     "top": (mouse_pos[1] + this.el.offsetTop + 5) + "px",
                                     "width": "300px",
                                     "height": "200px"});

                } else {
                            //Update the tooltip position and value
                    tooltip.style("background-color", this.model.get("tooltip_color"))
                           .style("color", this.model.get("text_color"))
				           .style({"left":(mouse_pos[0] + this.el.offsetLeft + 5) + "px",
                                   "top":(mouse_pos[1] + this.el.offsetTop + 5) + "px"});

                    if (this.is_object_empty(this.model.get("text_data"))) {
                        if (this.validate_text(color_data[d.id])) {
                            tooltip.text(name + ": " + this.fmt(color_data[d.id]));
                        } else {
				            tooltip.text(name);
                        }
                    } else {
                        if(this.validate_text(this.model.get("text_data")[d.id])) {
				            tooltip.text(name + ": " + this.fmt(this.model.get("text_data")[d.id]));
                        } else {
                            tooltip.text(name);
                        }
                    }
                }
            }
				    //Show the tooltip

            this.send({event:'hover', country:name, id:d.id});
        },
        validate_color: function(color) {
            if (color !== "" && color !== null) {
                return true;
            } else {
                return false;
            }
        },
        mouseover_handler: function(d, self) {
            if(!this.model.get("enable_hover")) {
                return;
            }

            var that = this;
            var select = this.model.get("selected").slice();

            var node = this.highlight_g.append(function() {
                            return self.cloneNode(true);
                        });

            node.classed("hovered", true);

            if(this.validate_color(this.model.get("hovered_styles")["hovered_stroke"]) &&
                select.indexOf(d.id)===-1) {
                node.style("stroke", this.model.get("hovered_styles")["hovered_stroke"])
                    .style("stroke-width", this.model.get("hovered_styles")["hovered_stroke_width"]);
            }

            if(this.validate_color(this.model.get("hovered_styles")["hovered_fill"]) &&
                select.indexOf(d.id)===-1) {

                node.style("fill-opacity", 1.0)
                    .style("fill", function() {
                        return that.model.get("hovered_styles")["hovered_fill"];
                    });
            }
        },
		zoomed: function(that, reset) {
			var t = reset ? [0, 0] : d3.event.translate;
			var s = reset ? 1 : d3.event.scale;
			var h = that.height/3;
			var w = reset ? that.width : 2*that.width;

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

            this.model.on('change:color', function() {
                that.color_change();
            });
            this.model.on("change:stroke_color", function() {
                that.change_stroke_color();
            });
            this.model.on("change:default_color", function() {
                that.change_map_color();
            });
            this.model.on("change:selected", function() {
                that.change_selected();
            });
            this.model.on("change:selected_styles", function() {
                that.change_selected_fill();
                that.change_selected_stroke();
            });
            this.model.on("change:tooltip_widget", function() {
                that.create_tooltip_widget();
            });
            this.model.on("change:axis", function() {
                that.create_axis();
            });
            $(this.options.cell).on("output_area_resize."+this.map_id, function() {
                that.update_layout();
            });
        },
        update_layout: function() {
            // First, reset the natural width by resetting the viewbox, then measure the flex size, then redraw to the flex dimensions
            this.svg.attr("width", null);
            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            setTimeout(_.bind(this.update_layout2, this), 0);
        },
        update_layout2: function() {
            var rect = this.el.getBoundingClientRect();
            this.width = rect.width > 0 ? rect.width : this.model.get("min_width");
            this.height = rect.height > 0 ? rect.height : this.model.get("min_height");
            setTimeout(_.bind(this.update_layout3, this), 0);
        },
        update_layout3: function() {
            var preserve_aspect = true;
            if (preserve_aspect === true) {
                var aspect_ratio = this.model.get("min_width")/this.model.get("min_height");
                if (this.width/this.height > aspect_ratio) {
                    this.width = this.height*aspect_ratio;
                } else {
                    this.height = this.width/aspect_ratio;
                }
            }
            // update ranges
            this.margin = this.model.get("fig_margin");
            this.update_plotarea_dimensions();

            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            this.svg.attr("width", this.width);
            this.remove_map();
            this.draw_map();
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
            }
            else {
                this.highlight_g.selectAll(".selected")
                    .style("stroke-width", this.model.get("selected_styles")["selected_stroke_width"])
                    .style("stroke", this.model.get("selected_styles")["selected_stroke"]);
            }
        },
        change_selected: function() {
            var e = window.event;

            this.highlight_g.selectAll("path").remove();
            var self=this;
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
        ocean_clicked: function(){
            var e = window.event;
            if(!e.altKey) {
                return;
            }

            var that = this;
            this.model.set("selected", []);
            this.touch();
            this.highlight_g.selectAll(".selected").remove();
            d3.select(this.el.parentNode).selectAll("path")
                                         .classed("selected", false);
            d3.select(this.el.parentNode).selectAll("path")
                                         .classed("hovered", false);
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
        color_change: function() {
            var scales = this.model.get("color_scale");
            var color_data = this.model.get("color");

            var that = this;

            if (!this.is_object_empty(color_data)){

                var z_data = Object.keys(color_data)
                                   .map( function (d) {
                                         return color_data[d];
                                   });
                if (this.color_scale) {
                    this.color_scale.compute_and_set_domain(z_data, 0);
                    this.color_scale.set_range();

                    //TODO: I am forcing the map to update colors by
                    //calling the function below after the color scale is
                    //created. Bad way to do this. See if the draw can be
                    //called in the resolve handler.
                }

                this.fill_g.selectAll("path").style("fill", function(d, i) {
                    return that.fill_g_colorfill(d,i);
                });
            }
        },
        click_highlight: function(d, that) {
            var e = window.event;
            var name = this.get_subunit_name(d.id);

            if(e.ctrlKey) {
	            this.send({event:'click', country:name, id:d.id});
                return;
            } else {
                if (!this.model.get("enable_select")) {
                    return;
                }
                var selected = this.model.get("selected").slice();
                var index = selected.indexOf(d.id);
                if(index > -1) {
                    selected.splice(index, 1);
                    this.model.set("selected", selected);
                    this.touch();
                    d3.select(that).style("fill-opacity", 0.0).transition();
                    this.highlight_g.selectAll(".hovered").remove();
                    var choice = "#c".concat(d.id.toString());
                    d3.select(choice).remove();
                }
                else {
                    this.highlight_g.selectAll(".hovered").remove();
                    this.highlight_g.append(function() {
                            return that.cloneNode(true);
                         })
                         .attr("id", 'c'+d.id)
                         .classed("selected", true);

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

                    selected.push(d.id);
                    this.model.set("selected", selected);
                    this.touch();
                }
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
            if (select.indexOf(d.id)>-1 &&
                this.validate_color(this.model.get("selected_styles")["selected_stroke"])) {
                return this.model.get("selected_styles")["selected_stroke"];
            } else {
                return this.model.get("stroke_color");
            }
        },
        fill_g_colorfill: function(d, j) {
            var select = this.model.get("selected").slice();
            var color_data = this.model.get("color");
            if (this.is_object_empty(color_data)) {
                return this.model.get("default_color");
            } else if (color_data[d.id]===undefined ||
                       color_data[d.id]===null ||
                       color_data[d.id]==="nan" ||
                       this.color_scale===undefined) {
                return "Grey";
            } else {
                return this.color_scale.scale(color_data[d.id]);
            }
        },
    });

    return {
        Map: Map,
    };
});
