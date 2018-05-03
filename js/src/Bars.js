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

var d3 = require("d3");
var _ = require("underscore");
var mark = require("./Mark");
var utils = require("./utils");

var Bars = mark.Mark.extend({

    render: function() {
        this.padding = this.model.get("padding");
        var base_creation_promise = Bars.__super__.render.apply(this);
        this.set_internal_scales();
        this.selected_indices = this.model.get("selected");
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");

        this.display_el_classes = ["bar", "legendtext"];

        var that = this;
        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        return base_creation_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.compute_view_padding();
            that.draw();
        });
    },

    set_scale_orientation: function() {
        var orient = this.model.get("orientation");
        this.dom_scale = this.scales.x; //(orient === "vertical") ? this.scales.x : this.scales.y;
        this.range_scale = this.scales.y; //(orient === "vertical") ? this.scales.y : this.scales.x;
    },

    set_ranges: function() {
        var orient = this.model.get("orientation");
        this.set_scale_orientation();
        var dom_scale = this.dom_scale,
            range_scale = this.range_scale;
        var dom = (orient === "vertical") ? "x" : "y",
            rang = (orient === "vertical") ? "y" : "x";
        if(dom_scale.model.type !== "ordinal") {
            dom_scale.set_range(this.parent.padded_range(dom, dom_scale.model));
        } else {
            dom_scale.set_range(this.parent.padded_range(dom, dom_scale.model), this.padding);
        }
        range_scale.set_range(this.parent.padded_range(rang, range_scale.model));
        // x_offset is set later by the adjust_offset method
        // This differs because it is not constant for a scale.
        // Changes based on the data.
        this.dom_offset = 0;
        this.range_offset = (orient === "vertical") ? range_scale.offset: -range_scale.offset;
    },

    set_positional_scales: function() {
        var x_scale = this.scales.x, y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.draw();
            }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.draw();
            }
        });
    },

    set_internal_scales: function() {
        // Two scales to draw the bars.
        this.x = d3.scale.ordinal();
        this.x1 = d3.scale.ordinal();
    },

    adjust_offset: function() {
        // In the case of a linear scale, and when plotting ordinal data,
        // the value have to be negatively offset by half of the width of
        // the bars, because ordinal scales give the values corresponding
        // to the start of the bin but linear scale gives the actual value.
        var dom_scale = this.dom_scale;
        if(dom_scale.model.type !== "ordinal") {
            if (this.model.get("align")==="center") {
                this.dom_offset = -(this.x.rangeBand() / 2).toFixed(2);
            } else if (this.model.get("align") === "left") {
                this.dom_offset = -(this.x.rangeBand()).toFixed(2);
            } else {
                this.dom_offset = 0;
            }
        } else {
            if (this.model.get("align")==="center") {
                this.dom_offset = 0;
            } else if (this.model.get("align")==="left") {
                this.dom_offset = -(this.x.rangeBand() / 2);
            } else {
                this.dom_offset = (this.x.rangeBand() / 2);
            }
        }
    },

    create_listeners: function() {
        Bars.__super__.create_listeners.apply(this);
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
            //animate bars on data update
            var animate = true;
            this.draw(animate);
        }, this);
        this.listenTo(this.model, "change:colors", this.update_colors, this);
        this.listenTo(this.model, "colors_updated", this.update_colors, this);
        this.listenTo(this.model, "change:type", this.update_type, this);
        this.listenTo(this.model, "change:align", this.realign, this);
        this.listenTo(this.model, "change:orientation", this.relayout, this)
        // FIXME: These are expensive calls for changing padding and align
        this.listenTo(this.model, "change:padding", this.relayout, this)
        this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);
        this.model.on_some_change(["stroke", "opacities"], this.update_stroke_and_opacities, this);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    },

    process_interactions: function() {
        var interactions = this.model.get("interactions");
        if(_.isEmpty(interactions)) {
            //set all the event listeners to blank functions
            this.reset_interactions();
        }
        else {
            if(interactions.click !== undefined &&
              interactions.click !== null) {
                if(interactions.click === "tooltip") {
                    this.event_listeners.element_clicked = function() {
                        return this.refresh_tooltip(true);
                    };
                    this.event_listeners.parent_clicked = this.hide_tooltip;
                } else if (interactions.click === "select") {
                    this.event_listeners.parent_clicked = this.reset_selection;
                    this.event_listeners.element_clicked = this.bar_click_handler;
                }
            } else {
                this.reset_click();
            }
            if(interactions.hover !== undefined &&
              interactions.hover !== null) {
                if(interactions.hover === "tooltip") {
                    this.event_listeners.mouse_over = this.refresh_tooltip;
                    this.event_listeners.mouse_move = this.move_tooltip;
                    this.event_listeners.mouse_out = this.hide_tooltip;
                }
            } else {
                this.reset_hover();
            }
            if(interactions.legend_click !== undefined &&
              interactions.legend_click !== null) {
                if(interactions.legend_click === "tooltip") {
                    this.event_listeners.legend_clicked = function() {
                        return this.refresh_tooltip(true);
                    };
                    this.event_listeners.parent_clicked = this.hide_tooltip;
                }
            } else {
                this.event_listeners.legend_clicked = function() {};
            }
            if(interactions.legend_hover !== undefined &&
              interactions.legend_hover !== null) {
                if(interactions.legend_hover === "highlight_axes") {
                    this.event_listeners.legend_mouse_over = _.bind(this.highlight_axes, this);
                    this.event_listeners.legend_mouse_out = _.bind(this.unhighlight_axes, this);
                }
            } else {
                this.reset_legend_hover();
            }
        }
    },

    realign: function() {
        //TODO: Relayout is an expensive call on realigning. Need to change
        //this.
        this.relayout();
    },

    draw_zero_line: function() {
        this.set_scale_orientation();
        var range_scale = this.range_scale;
        var orient = this.model.get("orientation");
        if (orient === "vertical") {
            this.d3el.select(".zeroLine")
              .attr("x1",  0)
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
    },

    relayout: function() {
        this.set_ranges();
        this.compute_view_padding();

        var range_scale = this.range_scale;

        this.draw_zero_line();

        this.x.rangeRoundBands(this.set_x_range(), this.padding);
        this.adjust_offset();
        this.x1.rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);
        this.draw_bars();
    },

    invert_point: function(pixel) {
        if(pixel === undefined) {
            this.model.set("selected", null);
            this.touch();
            return;
        }

        var abs_diff = this.x_pixels.map(function(elem) { return Math.abs(elem - pixel); });
        this.model.set("selected", [abs_diff.indexOf(d3.min(abs_diff))]);
        this.touch();
    },

    selector_changed: function(point_selector, rect_selector) {
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        var pixels = this.pixel_coords;
        var indices = _.range(pixels.length);
        // Here we only select bar groups. It shouldn't be too hard to select
        // individual bars, the `selected` attribute would then be a list of pairs.
        var selected_groups = _.filter(indices, function(index) {
            var bars = pixels[index];
            for (var i = 0; i < bars.length; i++) {
                if (rect_selector(bars[i])) { return true; }
            } return false;
        });
        this.model.set("selected", selected_groups);
        this.touch();
    },

    update_selected: function(model, value) {
        this.selected_indices = value;
        this.apply_styles();
    },

    draw: function(animate) {
        this.set_ranges();
        var colors = this.model.get("colors");
        var that = this;
        var bar_groups = this.d3el.selectAll(".bargroup")
          .data(this.model.mark_data, function(d) {
              return d.key;
          });

        var dom_scale = this.dom_scale, range_scale = this.range_scale;
        // this.x is the ordinal scale used to draw the bars. If a linear
        // scale is given, then the ordinal scale is created from the
        // linear scale.
        if(dom_scale.model.type !== "ordinal") {
            var model_domain = this.model.mark_data.map(function(elem) {
                return elem.key;
            });
            this.x.domain(model_domain);
        } else {
            this.x.domain(dom_scale.scale.domain());
        }
        this.x.rangeRoundBands(this.set_x_range(), this.padding);
        this.adjust_offset();
        this.x1.rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);

        if(this.model.mark_data.length > 0) {
            this.x1.domain(_.range(this.model.mark_data[0].values.length))
                .rangeRoundBands([0, this.x.rangeBand().toFixed(2)]);
        }
        bar_groups.enter()
          .append("g")
          .attr("class", "bargroup");
        // The below function sorts the DOM elements so that the order of
        // the DOM elements matches the order of the data they are bound
        // to. This is required to maintain integrity with selection.
        bar_groups.order();

        bar_groups.on("click", function(d, i) {
            return that.event_dispatcher("element_clicked",
                                         {"data": d, "index": i});
        });
        bar_groups.exit().remove();

        var bars_sel = bar_groups.selectAll(".bar")
          .data(function(d) {
              return d.values;
          });

        // default values for width and height are to ensure smooth
        // transitions
        bars_sel.enter()
          .append("rect")
          .attr("class", "bar")
          .attr("width", 0)
          .attr("height", 0);

        bars_sel.exit().remove();

        this.draw_bars(animate);

        this.apply_styles();

        this.d3el.selectAll(".zeroLine").remove();
        this.d3el.append("g")
          .append("line")
          .attr("class", "zeroLine");

        this.draw_zero_line();
    },

    draw_bars: function(animate) {
        var bar_groups = this.d3el.selectAll(".bargroup");
        var bars_sel = bar_groups.selectAll(".bar");
        var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;
        var that = this;
        var orient = this.model.get("orientation");

        var dom_scale = this.dom_scale, range_scale = this.range_scale;

        var dom = (orient === "vertical") ? "x" : "y",
            rang = (orient === "vertical") ? "y" : "x";

        var dom_control = (orient === "vertical") ? "width" : "height",
            rang_control = (orient === "vertical") ? "height" : "width";
        if (dom_scale.model.type === "ordinal") {
            var dom_max = d3.max(this.parent.range(dom));
            bar_groups.attr("transform", function(d) {
                if (orient === "vertical") {
                    return "translate(" + ((dom_scale.scale(d.key) !== undefined ?
                                        dom_scale.scale(d.key) : dom_max) + that.dom_offset) + ", 0)"
                } else {
                    return "translate(0, " + ((dom_scale.scale(d.key) !== undefined ?
                                        dom_scale.scale(d.key) : dom_max) + that.dom_offset) + ")"
                }
            });
        } else {
            bar_groups.attr("transform", function(d) {
                if (orient === "vertical") {
                    return "translate(" + (dom_scale.scale(d.key) + that.dom_offset) + ", 0)";
                } else {
                    return "translate(0, " + (dom_scale.scale(d.key) + that.dom_offset) + ")";
                }
            });
        }
        var is_stacked = (this.model.get("type") === "stacked");
        if (is_stacked) {
            bars_sel.transition("draw_bars").duration(animation_duration)
                .attr(dom, 0)
                .attr(dom_control, this.x.rangeBand().toFixed(2))
                .attr(rang, function(d) {
                    return (rang === "y") ? range_scale.scale(d.y1) : range_scale.scale(d.y0);
                })
                .attr(rang_control, function(d) {
                    return Math.abs(range_scale.scale(d.y1 + d.y_ref) - range_scale.scale(d.y1));
                });
        } else {
            bars_sel.transition("draw_bars").duration(animation_duration)
              .attr(dom, function(datum, index) {
                    return that.x1(index);
              })
              .attr(dom_control, this.x1.rangeBand().toFixed(2))
              .attr(rang, function(d) {
                  return d3.min([range_scale.scale(d.y), range_scale.scale(that.model.base_value)]);
              })
              .attr(rang_control, function(d) {
                  return Math.abs(range_scale.scale(that.model.base_value) - (range_scale.scale(d.y_ref)));
              });
        }

        this.pixel_coords = this.model.mark_data.map(function(d) {
            var key = d.key;
            var group_dom = dom_scale.scale(key) + that.dom_offset;
            return d.values.map(function(d) {
                var rect_coords = {};
                rect_coords[dom] = is_stacked ? group_dom : group_dom + that.x1(d.sub_index);
                rect_coords[rang] = is_stacked ?
                    (rang === "y") ? range_scale.scale(d.y1) : range_scale.scale(d.y0) :
                    d3.min([range_scale.scale(d.y), range_scale.scale(that.model.base_value)]);
                rect_coords[dom_control] = is_stacked ?
                    that.x.rangeBand() : that.x1.rangeBand();
                rect_coords[rang_control] = is_stacked ?
                    Math.abs(range_scale.scale(d.y1 + d.y_ref) - range_scale.scale(d.y1)) :
                    Math.abs(range_scale.scale(that.model.base_value) - (range_scale.scale(d.y_ref)));
                return [[rect_coords["x"], rect_coords["x"] + rect_coords["width"]],
                        [rect_coords["y"], rect_coords["y"] + rect_coords["height"]]];
            })
        })
        this.x_pixels = this.model.mark_data.map(function(el) {
            return dom_scale.scale(el.key) + dom_scale.offset;
        });
    },

    update_type: function(model, value) {
        // We need to update domains here as the y_domain needs to be
        // changed when we switch from stacked to grouped.
        this.model.update_domains();
        this.draw();
    },

    update_stroke_and_opacities: function() {
        var stroke = this.model.get("stroke");
        var opacities = this.model.get("opacities");
        this.d3el.selectAll(".bar")
            .style("stroke", stroke)
            .style("opacity", function(d, i) {
            return opacities[i];
        });
    },

    update_colors: function() {
        //the following if condition is to handle the case of single
        //dimensional data.
        //if y is 1-d, each bar should be of 1 color.
        //if y is multi-dimensional, the corresponding values should be of
        //the same color.
        var that = this;
        var color_scale = this.scales.color;
        if(this.model.mark_data.length > 0) {
            if(!(this.model.is_y_2d)) {
                this.d3el.selectAll(".bar").style("fill", function(d, i) {
                    return (d.color !== undefined && color_scale !== undefined) ?
                        color_scale.scale(d.color) : that.get_colors(d.color_index);
                });
            } else {
                this.d3el.selectAll(".bargroup")
                   .selectAll(".bar")
                   .style("fill", function(d, i) {
                   return (d.color !== undefined && color_scale !== undefined) ?
                       color_scale.scale(d.color) : that.get_colors(d.color_index);
                });
            }
        }
        //legend color update
        if(this.legend_el) {
            this.legend_el.selectAll(".legendrect")
              .style("fill", function(d, i) {
                  return (d.color && color_scale) ?
                      color_scale.scale(d.color) : that.get_colors(d.color_index);
              });
            this.legend_el.selectAll(".legendtext")
                .style("fill", function(d, i) {
                return (d.color !== undefined && color_scale !== undefined) ?
                    color_scale.scale(d.color) : that.get_colors(d.color_index);
            });
        }
    },

    draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        if(!(this.model.is_y_2d) &&
           (this.model.get("colors").length !== 1 &&
            this.model.get("color_mode") !== "element")) {
            return [0, 0];
        }

        var legend_data = this.model.mark_data[0].values.map(function(data) {
            return {
                index: data.sub_index,
                color: data.color,
                color_index: data.color_index
            };
        });
        var color_scale = this.scales.color;
        this.legend_el = elem.selectAll(".legend" + this.uuid)
            .data(legend_data);

        var that = this;
        var rect_dim = inter_y_disp * 0.8;
        this.legend_el.enter()
          .append("g")
            .attr("class", "legend" + this.uuid)
            .attr("transform", function(d, i) {
                return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
            })
            .on("mouseover", _.bind(function() {
                this.event_dispatcher("legend_mouse_over");
            }, this))
            .on("mouseout", _.bind(function() {
                this.event_dispatcher("legend_mouse_out");
            }, this))
            .on("click", _.bind(function() {
                this.event_dispatcher("legend_clicked");
            }, this))
          .append("rect")
            .classed("legendrect", true)
            .style("fill", function(d,i) {
                return (d.color !== undefined && color_scale !== undefined) ?
                    color_scale.scale(d.color) : that.get_colors(d.color_index);
            }).attr({
                x: 0,
                y: 0,
                width: rect_dim,
                height: rect_dim,
            });

        this.legend_el.append("text")
         .attr("class","legendtext")
          .attr("x", rect_dim * 1.2)
          .attr("y", rect_dim / 2)
          .attr("dy", "0.35em")
          .text(function(d, i) { return that.model.get("labels")[i]; })
          .style("fill", function(d,i) {
              return (d.color !== undefined && color_scale !== undefined) ?
                  color_scale.scale(d.color) : that.get_colors(d.color_index);
          });

        var max_length = d3.max(this.model.get("labels"), function(d) {
            return d.length;
        });

        this.legend_el.exit().remove();
        return [this.model.mark_data[0].values.length, max_length];
    },

    clear_style: function(style_dict, indices) {
        // Function to clear the style of a dict on some or all the elements of the
        // chart. If indices is null, clears the style on all elements. If
        // not, clears on only the elements whose indices are mathcing.
        //
        // This function is not used right now. But it can be used if we
        // decide to accommodate more properties than those set by default.
        // Because those have to cleared specifically.
        var elements = this.d3el.selectAll(".bargroup");
        if(indices !== undefined) {
            elements = elements.filter(function(d, index) {
                return indices.indexOf(index) !== -1;
            });
        }
        var clearing_style = {};
        for(var key in style_dict) {
            clearing_style[key] = null;
        }
        elements.selectAll(".bar").style(clearing_style);
    },

    set_style_on_elements: function(style, indices) {
        // If the index array is undefined or of length=0, exit the
        // function without doing anything
        if(indices === undefined || indices === null || indices.length === 0) {
            return;
        }
        // Also, return if the style object itself is blank
        if(Object.keys(style).length === 0) {
            return;
        }
        var elements = this.d3el.selectAll(".bargroup");
        elements = elements.filter(function(data, index) {
            return indices.indexOf(index) !== -1;
        });
        elements.selectAll(".bar").style(style);
    },

    set_default_style: function(indices) {
        // For all the elements with index in the list indices, the default
        // style is applied.
        this.update_colors();
        this.update_stroke_and_opacities();
    },

    set_x_range: function() {
        var dom_scale = this.dom_scale;
        if(dom_scale.model.type === "ordinal") {
            return dom_scale.scale.rangeExtent();
        } else {
            return [dom_scale.scale(d3.min(this.x.domain())),
                    dom_scale.scale(d3.max(this.x.domain()))];
        }
    },

    bar_click_handler: function (args) {
        var data = args.data;
        var index = args.index;
        var that = this;
        var idx = this.model.get("selected");
        var selected = idx ? utils.deepCopy(idx) : [];
        // index of bar i. Checking if it is already present in the list.
        var elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        var accelKey = d3.event.ctrlKey || d3.event.metaKey;
        if(elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the element from the list
            selected.splice(elem_index, 1);
        } else {
            if(d3.event.shiftKey) {
                //If shift is pressed and the element is already
                //selected, do not do anything
                if(elem_index > -1) {
                    return;
                }
                //Add elements before or after the index of the current
                //bar which has been clicked
                var min_index = (selected.length !== 0) ?
                    d3.min(selected) : -1;
                var max_index = (selected.length !== 0) ?
                    d3.max(selected) : that.model.mark_data.length;
                if(index > max_index){
                    _.range(max_index+1, index+1).forEach(function(i) {
                        selected.push(i);
                    });
                } else if(index < min_index){
                    _.range(index, min_index).forEach(function(i) {
                        selected.push(i);
                    });
                }
            } else if(accelKey) {
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
                       ((selected.length === 0) ? null : selected),
                       {updated_view: this});
        this.touch();
        if(!d3.event) {
            d3.event = window.event;
        }
        var e = d3.event;
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    },

    reset_selection: function() {
        this.model.set("selected", null);
        this.selected_indices = null;
        this.touch();
    },

    compute_view_padding: function() {
        // //This function returns a dictionary with keys as the scales and
        // //value as the pixel padding required for the rendering of the
        // //mark.
        var dom_scale = this.dom_scale;
        var orient = this.model.get("orientation");
        var x_padding = 0;
        var avail_space = (orient === "vertical" ) ? this.parent.plotarea_width: this.parent.plotarea_height;
        if(dom_scale) {
            if (this.x !== null && this.x !== undefined &&
                this.x.domain().length !== 0) {
                if(dom_scale.model.type !== "ordinal") {
                    if (this.model.get("align") === "center") {
                        x_padding = (avail_space / (2.0 * this.x.domain().length) + 1);
                    } else if (this.model.get("align") === "left" ||
                               this.model.get("align") === "right") {
                        x_padding = (avail_space / (this.x.domain().length) + 1);
                    }
                } else {
                    if (this.model.get("align") === "left" ||
                        this.model.get("align") === "right") {
                        x_padding = ( this.x.rangeBand() / 2 ).toFixed(2);
                    }
                }
            }
        }
        if (orient === "vertical") {
            if(x_padding !== this.x_padding) {
                this.x_padding = x_padding;
                this.trigger("mark_padding_updated");
                //dispatch the event
            }
        } else {
            if(x_padding !== this.y_padding) {
                this.y_padding = x_padding;
                this.trigger("mark_padding_updated");
                //dispatch the event
            }
        }
    }
});


module.exports = {
    Bars: Bars
};
