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

define(["widgets/js/widget", "./d3", "base/js/utils"], function(Widget, d3, utils) {
    "use strict";

    var Mark = Widget.WidgetView.extend({
        render: function() {
            this.x_padding = 0;
            this.y_padding = 0;
            this.parent = this.options.parent;
            this.uuid = utils.uuid();
            var scale_creation_promise = this.set_scale_views();
            var self = this;
            this.model.on("scales_updated", function() {
                this.set_scale_views().then( function() { self.draw(); });
            }, this);

            this.colors = this.model.get("colors");

            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"));
            if(this.options.clip_id && this.model.get("apply_clip")) {
                this.el.attr("clip-path", "url(#" + this.options.clip_id + ")");
            }
            this.tooltip_div = d3.select(document.createElement("div"))
                .attr("class", "mark_tooltip")
                .style("opacity", 0);

            this.bisect = d3.bisector(function(d) { return d; }).left;
            this.el.style("display", (this.model.get("visible") ? "inline" : "none"));
            return scale_creation_promise;
        },
        set_scale_views: function() {
            // first, if this.scales was already defined, unregister from the
            // old ones.
            for (var key in this.scales) {
                this.stopListening(this.scales[key]);
            }

            this.scales = {};

            var scale_models = this.model.get("scales");
            var that = this;
            var scale_promises = {};
            _.each(scale_models, function(model, key) {
                scale_promises[key] = that.create_child_view(model);
            });
            return utils.resolve_promises_dict(scale_promises).then(function(scales) {
                that.scales = scales;
                that.set_positional_scales();
                that.initialize_additional_scales();
                that.set_ranges();
                that.trigger("mark_scales_updated");
            });
        },
        set_positional_scales: function() {
            // Positional scales are special in that they trigger a full redraw
            // when their domain is changed.
            // This should be overloaded in specific mark implementation.
        },
        initialize_additional_scales: function() {
            // This function is for the extra scales that are required for
            // rendering mark. The scale listeners are set up in this function.
            // This should be overloaded in the specific mark implementation.
        },
        set_internal_scales: function() {
            // Some marks such as Bars need to create additional scales
            // to draw themselves. In this case, the set_internal_scales
            // is overloaded.
        },
        create_listeners: function() {
            this.model.on("change:visible", this.update_visibility, this);
            this.model.on("change:selected_style", this.selected_style_updated, this);
            this.model.on("change:unselected_style", this.unselected_style_updated, this);

            this.parent.on("margin_updated", this.relayout, this);
            this.model.on_some_change(["labels", "display_legend"], function() {
                this.model.trigger("redraw_legend");
            }, this);
        },
        remove: function() {
            this.model.off(null, null, this);
            this.el.remove();
            this.tooltip_div.remove();
            Mark.__super__.remove.apply(this);
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            elem.selectAll(".legend" + this.uuid).remove();
            elem.append("g")
              .attr("transform", "translate(" + x_disp + ", " + y_disp + ")")
              .attr("class", "legend" + this.uuid)
              .on("mouseover", _.bind(this.highlight_axes, this))
              .on("mouseout", _.bind(this.unhighlight_axes, this))
            .append("text")
              .text(this.model.get("labels")[0]);
            return [1, 1];
        },
        highlight_axes: function() {
            _.each(this.model.get("scales"), function(model) {
               model.trigger("highlight_axis");
            });
        },
        unhighlight_axes: function() {
            _.each(this.model.get("scales"), function(model) {
               model.trigger("unhighlight_axis");
            });
        },
        relayout: function() {
            // Called when the figure margins are updated. To be overloaded in
            // specific mark implementation.
        },
        invert_range: function(start_pxl, end_pxl) {
            return [start_pxl, end_pxl];
        },
        invert_point: function(pxl) {
            return [pxl];
        },
        // is the following function really required?
        invert_multi_range: function(array_pixels) {
            return array_pixels;
        },
        update_visibility: function(model, visible) {
            this.el.style("display", visible ? "inline" : "none");
        },
        get_colors: function(index) {
            // cycles over the list of colors when too many items
            this.colors = this.model.get("colors");
            var len = this.colors.length;
            return this.colors[index % len];
        },
        // Style related functions
        selected_style_updated: function(model, style) {
            this.selected_style = style;
            this.clear_style(model.previous("selected_style"), this.selected_indices);
            this.style_updated(style, this.selected_indices);
        },
        unselected_style_updated: function(model, style) {
            this.unselected_style = style;
            var sel_indices = this.selected_indices;
            var unselected_indices = (sel_indices) ?
                _.range(this.model.mark_data.length).filter(function(index){
                    return sel_indices.indexOf(index) === -1;
                }) : [];
            this.clear_style(model.previous("unselected_style"), unselected_indices);
            this.style_updated(style, unselected_indices);
        },
        style_updated: function(new_style, indices) {
            // reset the style of the elements and apply the new style
            this.set_default_style(indices);
            this.set_style_on_elements(new_style, indices);
        },
        apply_styles: function() {
            var all_indices = _.range(this.model.mark_data.length);
            this.clear_style(this.selected_style);
            this.clear_style(this.unselected_style);

            this.set_default_style(all_indices);

            this.set_style_on_elements(this.selected_style, this.selected_indices);
            var unselected_indices = (!this.selected_indices) ?
                [] : _.difference(all_indices, this.selected_indices);
            this.set_style_on_elements(this.unselected_style, unselected_indices);
        },
        // Abstract functions which have to be overridden by the specific mark
        clear_style: function(style_dict, indices) {
        },
        set_default_style:function(indices) {
        },
        set_style_on_elements: function(style, indices) {
        },
        compute_view_padding: function() {
            //This function sets the x and y view paddings for the mark using
            //the variables x_padding and y_padding
        },
        show_tooltip: function(event, mouse_events) {
            //this function displays the tooltip at the location of the mouse
            //event is the d3 event for the data.
            //mouse_events is a boolean to enable mouse_events or not.
            //If this property has never been set, it will default to false.
            if(this.tooltip_view) {
                var mouse_pos = d3.mouse(this.parent.el.parentNode);
                if(mouse_events === undefined || mouse_events === null ||
                   (!(mouse_events))) {
                        this.tooltip_div.style("pointer-events", "none");
                } else {
                    this.tooltip_div.style("pointer-events", "all");
                }
                this.tooltip_div.transition()
                    .style(this.model.get("tooltip_style"));

                if(this.model.get("tooltip_location") === "center") {
                    //Assumption that parent.el is not a selection and is a div
                    //node
                    var parent_rect = this.parent.el.getBoundingClientRect();
                    var tooltip_div_rect = this.tooltip_div.node().getBoundingClientRect();
                    this.tooltip_div.style("left", (this.parent.el.offsetLeft + 5 + parent_rect["width"] * 0.5
                                                    - tooltip_div_rect["width"] * 0.5) + "px")
                        .style("top", (this.parent.el.offsetTop + 5 + parent_rect["height"] * 0.5
                                                    - tooltip_div_rect["height"] * 0.5) + "px");
                }
                else {
                    this.tooltip_div.style("left", (mouse_pos[0] + this.parent.el.offsetLeft + 5) + "px")
                        .style("top", (mouse_pos[1] + this.parent.el.offsetTop + 5) + "px");
                }
            }
        },
        hide_tooltip: function() {
            //this function hides the tooltip. But the location of the tooltip
            //is the last location set by a call to show_tooltip.
            this.tooltip_div.style("pointer-events", "none");
            this.tooltip_div.transition()
                .style("opacity", 0);
        },
        refresh_tooltip: function(tooltip_interactions) {
            //the argument controls pointer interactions with the tooltip. a
            //true value enables pointer interactions while a false value
            //disables them
            var el = d3.select(d3.event.target);
            if(this.is_hover_element(el)) {
                var data = el.data()[0];
                var clicked_data = this.model.get_data_dict(data, data.index);
                this.trigger("update_tooltip", data);
                this.show_tooltip(d3.event, tooltip_interactions);
            }
        },
        create_tooltip: function() {
            //create tooltip widget. To be called after mark has been displayed
            //and whenever the tooltip object changes
            var tooltip_model = this.model.get("tooltip");
            var self = this;
            if(tooltip_model) {
                var tooltip_creation_promise = this.create_child_view(tooltip_model);
                tooltip_creation_promise.then(function(view) {
                    if(self.tooltip_view) {
                        self.tooltip_view.remove();
                    }
                    //remove previous tooltip
                    self.tooltip_view = view;
                    self.tooltip_div.node().appendChild(d3.select(view.el).node());
                    view.trigger("displayed");
                });
            } else {
                if(self.tooltip_view) {
                    self.tooltip_view.remove();
                }
            }
        },
        mouse_over: function() {
            if(this.model.get("enable_hover")) {
                var el = d3.select(d3.event.target);
                if(this.is_hover_element(el)) {
                    var data = el.data()[0];
                    //make tooltip visible
                    var hovered_data = this.model.get_data_dict(data, data.index);
                    this.trigger("update_tooltip", hovered_data);
                    this.show_tooltip(d3.event);
                    this.send({event: "hover",
                            point: hovered_data});
                }
            }
        },
        mouse_out: function() {
            if(this.model.get("enable_hover")) {
                var el = d3.select(d3.event.target);
                if(this.is_hover_element(el)) {
                    var data = el.data()[0];
                    var hovered_data = this.model.get_data_dict(data, data.index);
                    // make tooltip invisible
                    this.hide_tooltip();
                    this.send({event: "hover",
                            point: hovered_data});
                }
            }
        },
        mouse_move: function() {
            if(this.model.get("enable_hover") &&
                this.is_hover_element(d3.select(d3.event.target))) {
                this.show_tooltip(d3.event);
            }
        },
        is_hover_element: function(elem) {
            var hit_check = this.model.display_el_classes.map(function(class_name) {
                                       return elem.classed(class_name); });
            return (_.compact(hit_check).length > 0);

        },
    });

    return {
        Mark: Mark,
    };
});
