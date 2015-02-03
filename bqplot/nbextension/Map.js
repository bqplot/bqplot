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

define(["widgets/js/manager", "widgets/js/widget", "d3", "d3topojson", "./Figure", "base/js/utils", "./MapData", "less!./worldmap"], function(WidgetManager, Widget, d3, topojson, FigureView, utils, mapdata) {

    var world = mapdata.world;
    var countries = mapdata.countries;

    function cloneAll(selector) {
        var nodes = d3.selectAll(selector);
        nodes.each(function(d, i) {
            nodes[0][i] = (this.cloneNode(true));
        });
        return nodes;
    }

    var baseFigure = FigureView[0];

    var Map = baseFigure.extend({

        render: function() {
            this.margin = this.model.get("fig_margin");
            this.enable_hover = this.model.get("enable_hover");
            this.hover_fill = this.model.get("hover_fill");
            this.stroke_color = this.model.get("stroke_color");
            this.map_color = this.model.get("color");
            this.x_offset = (this.options.x) ? this.options.x : 0;
            this.y_offset = (this.options.y) ? this.options.y : 0;

            this.margin.left += this.x_offset;
            this.margin.top += this.y_offset;

            this.def_wt = this.options.width;
            this.def_ht = this.options.height;

            this.title = this.model.get("title");
            this.width = (this.def_wt) ?  this.def_wt : this.model.get("min_width") - this.margin.left - this.margin.right;
            this.height = (this.def_ht) ? this.def_ht : this.model.get("min_height") - this.margin.top - this.margin.bottom;

            var that = this;

            this.fmt = d3.format(this.model.get("text_format"));

            var scales = this.model.get("color_scale");
            this.color_data = this.model.get("color_data");

            if (!this.is_object_empty(that.color_data)){

                that.create_child_view(scales).then(function(view) {
                    that.color_scale = view;
                    var z_data = Object.keys(that.color_data).map( function (d) {
                        return that.color_data[d];
                    });

                    if (that.color_scale) {
                        that.color_scale.compute_and_set_domain(z_data, 0);
                        that.color_scale.set_range();

                        //TODO: I am forcing the map to update colors by
                        //calling the function below after the color scale is
                        //created. Bad way to do this. See if the draw can be
                        //called in the resolve handler.
                        that.color_change(that);
                    }
                    // Trigger the displayed event of the child view.
                    that.after_displayed(function() {
                        view.trigger("displayed");
                    });

                });
            }

            this.draw_map();
            this.create_listeners();

        },
        remove: function() {
            $('.world_map').remove();
            $('.world_tooltip').remove();
            $('.world_viewbox').remove();
            $('.ColorBar').remove();
            $('.color_axis').remove();
            $(this.options.cell).off("output_area_resize."+this.id);
        },
        draw_map: function() {

            var that = this;
            var w = this.width;
            var h = this.height;

            //Define default path generator
			var path = d3.geo.path();
			var projection = d3.geo.mercator().center([0,60]).scale(190);
			path = path.projection(projection);

			this.svg = d3.select(this.el)

            this.svg.attr("viewBox", "0 0 "+ w +' '+ h)
              .attr("width", "100%")
              .attr("height", "100%");

            this.svg_over = d3.select(this.el).append("svg")
                .attr("viewBox", "0 0 1075 750")
                .attr("width", "100%")
                .attr("class", "world_viewbox")
                .on("click", function(d) { that.ocean_clicked(that); });

            if (this.model.get("axis")!=null){
                this.svg_over.attr("height", "85%");

                that.ax_g = this.svg.append("g")
                                    .attr("class", "color_axis")

                this.create_child_view(this.model.get("axis")).then(function(view) {
                    that.axes_view = view;
                    that.ax_g.node().appendChild(view.el.node());

                that.after_displayed(function() {
                        view.trigger("displayed");
                    });
                });
            }
            else {
                this.svg_over.attr("height", "100%");
            }

            this.transformed_g = this.svg_over.append("g").attr("class", "world_map");

            this.fill_g = this.transformed_g.append("g");
            this.highlight_g = this.transformed_g.append("g");
            this.stroke_g = this.transformed_g.append("g");

            this.div = d3.select("body").append("div")
                .attr("id", "world_tooltip");

            //Bind data and create one path per GeoJSON feature
            this.fill_g.selectAll("path")
			    .data(topojson.feature(world, world.objects.countries).features)
				.enter()
				.append("path")
				.attr("d", path)
				.style("fill", function(d, i) { return that.fill_g_colorfill(d, i, that); });

            this.stroke_g.selectAll("path")
			    .data(topojson.feature(world, world.objects.countries).features)
				.enter()
				.append("path")
				.attr("d", path)
                .style("fill-opacity", 0.0)
				.on("mouseover", function(d){
                    if(!that.enable_hover){
                        return;
                    }

                    var that2 = this;

                    var select = that.model.get("selected").slice();

                    if((that.model.get("hover_stroke")!="" &&  that.model.get("hover_stroke")!=null) && select.indexOf(d.id)==-1){
                        that.highlight_g.append(function() {return that2.cloneNode(true)}).style("stroke", that.model.get("hover_stroke")).classed("hovered", true).style("stroke-width", that.model.get("hover_stroke_width"));
                    }
                    if((that.model.get("hover_stroke")=="" || that.model.get("hover_stroke")==null) && (that.model.get("hover_fill")!="" && that.model.get("hover_fill")!=null) && select.indexOf(d.id)==-1){
                        that.highlight_g.append(function() {return that2.cloneNode(true)}).classed("hovered", true).style("fill-opacity", 1.0).style("fill", function(){ return that.model.get("hover_fill"); });
                    }
                    if((that.model.get("hover_fill")!="" &&  that.model.get("hover_fill")!=null) && (that.model.get("hover_stroke")!="" && that.model.get("hover_stroke")!=null) && select.indexOf(d.id)==-1) {
                        that.highlight_g.selectAll(".hovered").style("fill-opacity", 1.0).style("fill", function() { return that.model.get("hover_fill"); });
                    }
                })
				.on("mousemove", function(d){
                    if(!that.enable_hover){
                        return;
                    }
					var name;
					for(var i = 0; i< countries.length; i++){
						if(d.id == countries[i].id){
							name = countries[i].Name;
						}
					};

                if (that.model.get("display_tooltip")) {
                   //Update the tooltip position and value
                   if (that.is_object_empty(that.model.get("text_data"))) {
                        if (that.color_data[d.id]!==undefined && that.color_data[d.id]!==null){
                            d3.select("#world_tooltip")
                            .style("background-color", that.model.get("tooltip_color"))
                            .style("color", that.model.get("text_color"))
				            .style({"left":(d3.event.x+5)+"px", "top":(d3.event.y-5)+"px"})
				            .text(name + ": " + that.fmt(that.model.get("color_data")[d.id]));
                        }
                        else {
                            d3.select("#world_tooltip")
                            .style("background-color", that.model.get("tooltip_color"))
                            .style("color", that.model.get("text_color"))
				            .style({"left":(d3.event.x+5)+"px", "top":(d3.event.y-5)+"px"})
				            .text(name);
                        }
                    }
                    else {
                        d3.select("#world_tooltip")
                          .style("background-color", that.model.get("tooltip_color"))
                          .style("color", that.model.get("text_color"))
				          .style({"left":(d3.event.x+5)+"px", "top":(d3.event.y-5)+"px"});
                        if(that.model.get("text_data")[d.id]!==undefined && that.model.get("text_data")[d.id]!==null) {
				            d3.select("#world_tooltip")
                              .text(name + ": " + that.fmt(that.model.get("text_data")[d.id]));
                        }
                        else {
                            d3.select("#world_tooltip")
                              .text(name);
                        }
                    }

				    //Show the tooltip
				    d3.select("#world_tooltip").classed("hidden", false);
                    that.send({event:'hover', country:name, id:d.id});

				}})
				.on("mouseout", function(d){
                    if (!that.enable_hover){
                        return;
                    }
				    d3.select("#world_tooltip").classed("hidden", true);
					d3.select(this).transition().style("fill", function(d, i) { return that.fill_g_colorfill(d, i, that);});
                    d3.select(this).transition().style("stroke", function(d, i) { return that.hoverfill(d, i, that);});
                    that.highlight_g.selectAll(".hovered").remove();
				})
				.on("click", function(d) { return that.click_highlight(d, this);})

            if(that.stroke_color!=null && that.stroke_color!=undefined && that.stroke_color!="") {
                that.stroke_g.selectAll("path").style("stroke", that.stroke_color);
            }


			var zoomed = function(){
				var t = d3.event.translate;
				var s = d3.event.scale;
				var height = h/3;
				var width = 2*w;

				t[0] = Math.min(width / 2 * (s - 1), Math.max(width / 2 * (1 - s), t[0]));
				t[1] = Math.min(height / 2 * (s - 1) + h * s, Math.max(height / 2 * (1 - s) - h * s, t[1]));

				zoom.translate(t);
				that.transformed_g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
			};

			this.svg.on("dblclick", function(){
				var t = [0, 0];
				var s = 1;
				var height = h/3;
				var width = w;

				t[0] = Math.min(width / 2 * (s - 1), Math.max(width / 2 * (1 - s), t[0]));
				t[1] = Math.min(height / 2 * (s - 1) + h * s, Math.max(height / 2 * (1 - s) - h * s, t[1]));

				zoom.translate(t);
				zoom.scale(s);
				that.transformed_g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
			});

			var zoom = d3.behavior.zoom()
						.scaleExtent([1, 8])
						.on("zoom", zoomed);
			this.svg.call(zoom);
			this.svg.on("dblclick.zoom", null);

            var that = this;

            $(this.options.cell).on("output_area_resize", function() {
                that.update_layout();
            });
        },
        create_listeners: function() {
            var that = this;

            this.model.on('change:color_data', function() {that.color_change(that);});
            this.model.on("change:stroke_color", function() { that.change_stroke_color(that); });
            this.model.on("change:color", function() { that.change_map_color(that); });
            this.model.on("change:selected", function() { that.change_selected(that); });
            this.model.on("change:enable_hover", function() {that.change_hover(that);});
            this.model.on("change:hover_fill", function() { that.hover_fill = that.model.get("hover_fill"); });
            this.model.on("change:selected_fill", function() { that.change_selected_fill(that); });
            this.model.on("change:selected_stroke", function() { that.change_selected_stroke(that); });
        },
        update_layout: function() {
            // First, reset the natural width by resetting the viewbox, then measure the flex size, then redraw to the flex dimensions
            this.svg.attr("width", null);
            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            setTimeout(_.bind(this.update_layout2, this), 0);
        },
        update_layout2: function() {
            rect = this.el.getBoundingClientRect();
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
            //this.svg.attr("width", this.width);
            // transform figure
            //this.fig.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
            this.remove();
            this.draw_map();

            // Drawing the selected cells
            //this.clear_selected();
            //this.apply_selected();

            // When map is expanded or contracted, there should not be any
            // accidental hovers. To prevent this, the following call is made.
            //this.fig_hover.selectAll("rect")
                //.remove();
            //this.hide_tooltip();
            //this.trigger("margin_updated");
        },
        change_selected_fill: function(that){
            if (that.model.get("selected_fill")=="" || that.model.get("selected_fill")==null){
                that.highlight_g.selectAll(".selected").style("fill-opacity", 0.0);
            }
            else {
                that.highlight_g.selectAll(".selected").style("fill-opacity", 1.0).style("fill", that.model.get("selected_fill"));
            }
        },
        update_plotarea_dimensions: function() {

        },
        change_selected_stroke: function(that){
            if (that.model.get("selected_stroke")=="" || that.model.get("selected_stroke")==null){
                that.highlight_g.selectAll(".selected").style("stroke-width", 0.0);
            }
            else {
                that.highlight_g.selectAll(".selected").style("stroke-width", that.model.get("selected_stroke_width")).style("stroke", that.model.get("selected_stroke"));
            }
        },
        change_selected: function(that){
            var e = window.event;

            this.highlight_g.selectAll("path").remove();
            var that2=this;
            var select = this.model.get("selected").slice()
            var temp = this.stroke_g.selectAll("path").data()
            that.stroke_g.selectAll("path").style("stroke", function(d, i) { return that.hoverfill(d, i, that); });
            var nodes = this.stroke_g.selectAll("path")
            for (i=0; i<temp.length; i++) {
                if(select.indexOf(temp[i].id) > -1) {
                    that2.highlight_g.append(function() { return nodes[0][i].cloneNode(true); }).attr("id", temp[i].id)
                                    .style("fill-opacity", function() { if (that2.model.get("selected_fill")!=null && that2.model.get("selected_fill")!="") { return 1.0; } else { return 0.0; }})
                                    .style("fill", that2.model.get("selected_fill"))
                                    .style("stroke-opacity", function() { if (that2.model.get("selected_stroke")!=null && that2.model.get("selected_stroke")!="") { return 1.0; } else { return 0.0; }})
                                    .style("stroke", that2.model.get("selected_stroke"))
                                    .style("stroke-width", that2.model.get("selected_stroke_width"))
                                    .classed("selected", true);
                }
            }
        },
        ocean_clicked: function(that){
            e = window.event;
            if(!e.altKey){
                return;
            }
            that.model.set("selected", []);
            that.touch();
            that.highlight_g.selectAll(".selected").remove();
            $("path").removeClass("selected");
            $("path").removeClass("hovered");
            that.stroke_g.selectAll("path").style("stroke", function(d, i) { return that.hoverfill(d, i, that); });
            that.fill_g.selectAll("path").classed("selected", false).style("fill", function(d, i) { return that.fill_g_colorfill(d,i, that);})
        },
        change_stroke_color: function(that){
            that.stroke_color = that.model.get("stroke_color");
            that.stroke_g.selectAll("path").style("stroke", that.model.get("stroke_color"));
        },
        change_map_color: function(that){
            if (!that.is_object_empty(that.color_data)){
                return;
            }
            that.map_color = that.model.get("color");
            that.fill_g.selectAll("path").style("fill", that.map_color);
        },
        color_change: function(that) {
            var scales = this.model.get("color_scale")
            this.color_data = this.model.get("color_data");

            var that2 = this;

            if (!this.is_object_empty(that.color_data)){

                //var that = this;

                that2.create_child_view(scales).then(function(view) {
                    that2.color_scale = view;
                    var z_data = Object.keys(that2.color_data).map( function (d) {
                        return that2.color_data[d]; })
                    if (that2.color_scale) {
                        that2.color_scale.compute_and_set_domain(z_data, 0);
                        that2.color_scale.set_range();

                        //TODO: I am forcing the map to update colors by
                        //calling the function below after the color scale is
                        //created. Bad way to do this. See if the draw can be
                        //called in the resolve handler.
                    }
                    // Trigger the displayed event of the child view.
                    that2.after_displayed(function() {
                        view.trigger("displayed");
                    });

                    that.fill_g.selectAll("path").style("fill", function(d, i) { return that.fill_g_colorfill(d,i, that);})

                });
            }

            if (this.model.get("axis")!=null){
                this.svg_over.attr("height", "85%");

                this.ax_g = this.svg.append("g")
                                .attr("class", "color_axis");

                this.create_child_view(this.model.get("axis")).then(function(view) {
                   that.axes_view = view;
                    that.ax_g.node().appendChild(view.el.node());
                    that.after_displayed(function() {
                        view.trigger("displayed");
                    });
                });
            }
        },
        click_highlight: function(d, that) {
            e = window.event
			var name;
			for(var i = 0; i< countries.length; i++){
				if(d.id == countries[i].id){
					name = countries[i].Name;
				}
			};
            if(e.ctrlKey){
	            this.send({event:'click', country:name, id:d.id});
                return;
            }
            else {
                if (!this.model.get("enable_select")){
                    return;
                }
                var selected = this.model.get("selected").slice();
                index = selected.indexOf(d.id)
                var that2 = this;
                if(index > -1){
                    selected.splice(index, 1);
                    that2.model.set("selected", selected);
                    that2.model.save_changes();
                    d3.select(that).style("fill-opacity", 0.0).transition();
                    that2.highlight_g.selectAll(".hovered").remove();
                    var choice = "#".concat(d.id.toString());
                    $(choice).remove();
                }
                else {
                    that2.highlight_g.selectAll(".hovered").remove();
                    that2.highlight_g.append(function() {return that.cloneNode(true)}).attr("id", d.id).classed("selected", true);
                    if (that2.model.get("selected_fill")!="" && that2.model.get("selected_fill")!=null) {
                        that2.highlight_g.selectAll(".selected").style("fill-opacity", 1.0).style("fill", that2.model.get("selected_fill"));
                    }
                    if ((that2.model.get("selected_stroke")!="" && that2.model.get("selected_stroke")!=null) && (that2.model.get("selected_fill")!="" && that2.model.get("selected_fill")!=null)) {
                        that2.highlight_g.selectAll(".selected").style("stroke", that2.model.get("selected_stroke")).style("stroke-width", that2.model.get("selected_stroke_width"));
                    }
                    if((that2.model.get("selected_fill")=="" || that2.model.get("selected_fill")==null) && (that2.model.get("selected_stroke")!="" && that2.model.get("selected_stroke")!=null)){
                        that2.highlight_g.selectAll(".selected")
                            .style("stroke", that2.model.get("selected_stroke")).style("stroke-width", that2.model.get("selected_stroke_width"));
                    }
                    selected.push(d.id);
                    that2.model.set("selected", selected);
                    that2.model.save_changes();
                }
            }
        },
        change_hover: function(d){
            d.enable_hover = this.model.get("enable_hover");
            var that = this;
            that.fill_g.selectAll("path").style("fill", function(d, i) { return that.fill_g_colorfill(d, i, that); });
            return;
        },
        is_object_empty: function(object){
            var is_empty = true;
            for(keys in object){
                is_empty = false;
                break; // exiting since we found that the object is not empty
            }
            return is_empty;
        },
        hoverfill: function(d, j, that) {
            var select = this.model.get("selected").slice();
            if (select.indexOf(d.id)>-1 && that.model.get("selected_stroke")!="" && that.model.get("selected_stroke")!=null)
                return that.model.get("selected_stroke");
            else {
                return that.model.get("stroke_color");
            }
        },
        fill_g_colorfill: function(d, j, that) {
            var select = this.model.get("selected").slice();
            if (this.is_object_empty(that.color_data) && that.map_color!=undefined && that.map_color!=null){
                return that.map_color;
            }
            else if (that.color_data[d.id]==undefined || that.color_data[d.id]=="nan" || that.color_scale==undefined)
                return "Grey";
            else
                return that.color_scale.scale(that.color_data[d.id]);

        },
        colorfill: function(d, j, that) {
            var select = this.model.get("selected").slice();
            if (select.indexOf(d.id)>-1 && that.model.get("selected_fill")!="" && that.model.get("selected_fill")!=null)
                return that.model.get("selected_fill");
            else if (this.is_object_empty(that.color_data)){
                return that.map_color;
            }
            else if (that.color_data[d.id]==undefined || that.color_data[d.id]=="nan")
                return "Grey";
            else
                return that.color_scale.scale(that.color_data[d.id]);
        }
    });
    WidgetManager.WidgetManager.register_widget_view("Map", Map);
    return [Map];
});
