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
import 'd3-selection-multi';

import {
    MessageLoop
} from '@phosphor/messaging';

import {
    Widget
} from '@phosphor/widgets';

// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"), require("d3-selection-multi"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import { MarkModel } from './MarkModel'

// Check that value is defined and not null
function is_defined(value){
    return value !== null && value !== undefined;
};


export abstract class Mark extends widgets.WidgetView {

    initialize () {
        this.setElement(document.createElementNS(d3.namespaces.svg, "g"));
        this.d3el = d3.select(this.el);
        super.initialize.apply(this, arguments);
    }

    render() {
        this.x_padding = 0;
        this.y_padding = 0;
        this.parent = this.options.parent;
        this.uuid = widgets.uuid();
        const scale_creation_promise = this.set_scale_views();
        this.listenTo(this.model, "scales_updated", () => {
            this.set_scale_views().then(_.bind(this.draw, this));
        });

        this.colors = this.model.get("colors");

        if(this.options.clip_id && this.model.get("apply_clip")) {
            this.d3el.attr("clip-path", "url(#" + this.options.clip_id + ")");
        }
        this.tooltip_div = d3.select(document.createElement("div"))
            .attr("class", "mark_tooltip")
            .attr("id", "tooltip_" + this.uuid)
            .style("display", "none")
            .style("opacity", 0);

        this.bisect = d3.bisector(function(d) { return d; }).left;
        this.d3el.style("display", (this.model.get("visible") ? "inline" : "none"));
        this.display_el_classes = [];
        this.event_metadata = {
            "mouse_over": {
                "msg_name": "hover",
                "lookup_data": true,
                "hit_test": true,
            },
            "legend_clicked":  {
                "msg_name": "legend_click",
                "hit_test": true,
            },
            "element_clicked": {
                "msg_name": "element_click",
                "lookup_data": true,
                "hit_test": true,
            },
            "parent_clicked":  {
                "msg_name": "background_click",
                "hit_test": false,
            },
            "legend_mouse_over": {
                "msg_name": "legend_hover",
                "hit_test": true
            },
        };

        return scale_creation_promise;
    }

    abstract draw(animate?);
    abstract set_ranges();
    set_scale_views() {
        // first, if this.scales was already defined, unregister from the
        // old ones.
        for (var key in this.scales) {
            this.stopListening(this.scales[key]);
        }

        const scale_models = this.model.get("scales");
        const that = this;
        const scale_promises = {};
        _.each(scale_models, function(model : widgets.WidgetModel, key) {
            scale_promises[key] = that.create_child_view(model);
        });
        return widgets.resolvePromisesDict(scale_promises).then(function(scales) {
            that.scales = scales;
            that.set_positional_scales();
            that.initialize_additional_scales();
            that.set_ranges();
            that.trigger("mark_scales_updated");
        });
    }

    set_positional_scales() {
        // Positional scales are special in that they trigger a full redraw
        // when their domain is changed.
        // This should be overloaded in specific mark implementation.
    }

    initialize_additional_scales() {
        // This function is for the extra scales that are required for
        // rendering mark. The scale listeners are set up in this function.
        // This should be overloaded in the specific mark implementation.
    }

    set_internal_scales() {
        // Some marks such as Bars need to create additional scales
        // to draw themselves. In this case, the set_internal_scales
        // is overloaded.
    }

    create_listeners() {
        this.listenTo(this.model, "change:visible", this.update_visibility);
        this.listenTo(this.model, "change:selected_style", this.selected_style_updated);
        this.listenTo(this.model, "change:unselected_style", this.unselected_style_updated);

        this.parent.on("margin_updated", this.relayout, this);
        this.model.on_some_change(["labels", "display_legend"], function() {
            this.model.trigger("redraw_legend");
        }, this);
    }

    remove() {
        this.model.off(null, null, this);
        this.d3el.transition("remove").duration(0).remove();
        this.tooltip_div.remove();
        super.remove();
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        elem.selectAll(".legend" + this.uuid).remove();
        elem.append("g")
          .attr("transform", "translate(" + x_disp + ", " + y_disp + ")")
          .attr("class", "legend" + this.uuid)
          .on("mouseover", _.bind(this.highlight_axes, this))
          .on("mouseout", _.bind(this.unhighlight_axes, this))
        .append("text")
          .text(this.model.get("labels")[0]);
        return [1, 1];
    }

    highlight_axes() {
        _.each(this.model.get("scales"), function(model: any) {
            model.trigger("highlight_axis");
        });
    }

    unhighlight_axes() {
        _.each(this.model.get("scales"), function(model: any) {
            model.trigger("unhighlight_axis");
        });
    }

    relayout() {
        // Called when the figure margins are updated. To be overloaded in
        // specific mark implementation.
    }

    invert_range(start_pxl, end_pxl) {
        return [start_pxl, end_pxl];
    }

    invert_point(pxl) {
    }

    // TODO: is the following function really required?
    invert_multi_range(array_pixels) {
        return array_pixels;
    }

    update_visibility(model, visible) {
        this.d3el.style("display", visible ? "inline" : "none");
    }

    get_colors(index) {
        // cycles over the list of colors when too many items
        this.colors = this.model.get("colors");
        const len = this.colors.length;
        return this.colors[index % len];
    }

    // Style related functions
    selected_style_updated(model, style) {
        this.selected_style = style;
        this.clear_style(model.previous("selected_style"), this.selected_indices);
        this.style_updated(style, this.selected_indices);
    }

    unselected_style_updated(model, style) {
        this.unselected_style = style;
        const sel_indices = this.selected_indices;
        const unselected_indices = (sel_indices) ?
            _.range(this.model.mark_data.length).filter(function(index){
                return sel_indices.indexOf(index) === -1;
            }) : [];
        this.clear_style(model.previous("unselected_style"), unselected_indices);
        this.style_updated(style, unselected_indices);
    }

    style_updated(new_style, indices, elements?) {
        // reset the style of the elements and apply the new style
        this.set_default_style(indices);
        this.set_style_on_elements(new_style, indices);
    }

    apply_styles(style_arr?) {
        if(style_arr === undefined || style_arr == null) {
            style_arr = [this.selected_style, this.unselected_style];
        }
        const all_indices = _.range(this.model.mark_data.length);
        for(var i = 0; i < style_arr.length; i++) {
            this.clear_style(style_arr[i]);
        }

        this.set_default_style(all_indices);

        this.set_style_on_elements(this.selected_style, Array.from(this.selected_indices || []));
        const unselected_indices = (!this.selected_indices) ?
            [] : _.difference(all_indices, Array.from(this.selected_indices));
        this.set_style_on_elements(this.unselected_style, unselected_indices);
    }

    // Abstract functions which have to be overridden by the specific mark
    abstract clear_style(style_dict, indices?, elements?);

    abstract set_default_style(indices, elements?);

    abstract set_style_on_elements(style, indices, elements?);

    /**
     * This function sets the x and y view paddings for the mark using the
     * variables x_padding and y_padding
     */
    abstract compute_view_padding();

    show_tooltip(mouse_events?) {
        //this function displays the tooltip at the location of the mouse
        //event is the d3 event for the data.
        //mouse_events is a boolean to enable mouse_events or not.
        //If this property has never been set, it will default to false.
        if(this.tooltip_view) {
            if(mouse_events === undefined || mouse_events === null || (!(mouse_events))) {
                this.tooltip_div.style("pointer-events", "none");
            } else {
                this.tooltip_div.style("pointer-events", "all");
            }
            this.tooltip_div.styles(this.model.get("tooltip_style"))
                .style("display", null);
            MessageLoop.sendMessage(this.tooltip_view.pWidget, Widget.Msg.AfterAttach);
            this.parent.popper.enableEventListeners();
            this.move_tooltip();
        }
    }

    move_tooltip(mouse_events?) {
        if(this.tooltip_view) {
            this.parent.popper_reference.x = d3GetEvent().clientX;
            this.parent.popper_reference.y = d3GetEvent().clientY;
            this.parent.popper.scheduleUpdate();
        }
    }

    hide_tooltip() {
        //this function hides the tooltip. But the location of the tooltip
        //is the last location set by a call to show_tooltip.
        this.parent.popper.disableEventListeners();
        this.tooltip_div.style("pointer-events", "none");
        this.tooltip_div.style("opacity", 0)
            .style("display", "none");
    }

    refresh_tooltip(tooltip_interactions = false) {
        //the argument controls pointer interactions with the tooltip. a
        //true value enables pointer interactions while a false value
        //disables them
        const el = d3.select(d3GetEvent().target);
        if(this.is_hover_element(el)) {
            const data: any = el.data()[0];
            const clicked_data = this.model.get_data_dict(data, data.index);
            this.trigger("update_tooltip", clicked_data);
            this.show_tooltip(tooltip_interactions);
        }
    }

    create_tooltip() {
        //create tooltip widget. To be called after mark has been displayed
        //and whenever the tooltip object changes
        const tooltip_model = this.model.get("tooltip");
        const that = this;
        //remove previous tooltip
        if(this.tooltip_view) {
            this.tooltip_view.remove();
        }
        if(tooltip_model) {
            this.create_child_view(tooltip_model).then(function(view) {
                that.tooltip_view = view;

                MessageLoop.sendMessage(view.pWidget, Widget.Msg.BeforeAttach);
                that.tooltip_div.node().appendChild(view.el);
                MessageLoop.sendMessage(view.pWidget, Widget.Msg.AfterAttach);
            });
        }
    }

    event_dispatcher(event_name, data?) {
        //sends a custom mssg to the python side if required
        this.custom_msg_sender(event_name);
        if(this.event_listeners[event_name] !== undefined) {
            _.bind(this.event_listeners[event_name], this, data)();
        }
    }

    custom_msg_sender(event_name) {
        const event_data = this.event_metadata[event_name];
        if(event_data !== undefined) {
            let data = null;
            if(event_data.hit_test) {
                //do a hit test to check valid element
                const el = d3.select(d3GetEvent().target);
                if(this.is_hover_element(el)) {
                    data = el.data()[0];
                    if(event_data.lookup_data) {
                        data = this.model.get_data_dict(data, data.index);
                    }
                } else {
                    //do not send mssg if hit test fails
                    return;
                }
            }
            this.send({event: event_data.msg_name, data: data});
        }
    }

    reset_click() {
        this.event_listeners.element_clicked = function() {};
        this.event_listeners.parent_clicked = function() {};
    }

    private reset_hover() {
        this.event_listeners.mouse_over = function() {};
        this.event_listeners.mouse_move = function() {};
        this.event_listeners.mouse_out = function() {};
    }

    private reset_legend_click() {
        this.event_listeners.legend_clicked = function() {};
    }

    private reset_legend_hover() {
        this.event_listeners.legend_mouse_over = function() {};
        this.event_listeners.legend_mouse_out = function() {};
    }

    process_click(interaction){
        const that = this;
        if(interaction === "tooltip") {
            this.event_listeners.element_clicked = function() {
                return that.refresh_tooltip(true);
            };
            this.event_listeners.parent_clicked = this.hide_tooltip;
        }
    }

    process_hover(interaction){
        if(interaction === "tooltip") {
            this.event_listeners.mouse_over = this.refresh_tooltip;
            this.event_listeners.mouse_move = this.move_tooltip;
            this.event_listeners.mouse_out = this.hide_tooltip;
        }
    }

    process_legend_click(interaction) {
        const that = this;
        if(interaction === "tooltip") {
            this.event_listeners.legend_clicked = function() {
                return that.refresh_tooltip(true);
            };
            this.event_listeners.parent_clicked = this.hide_tooltip;
        }
    }

    process_legend_hover(interaction){
        if(interaction === "highlight_axes") {
            this.event_listeners.legend_mouse_over = _.bind(this.highlight_axes, this);
            this.event_listeners.legend_mouse_out = _.bind(this.unhighlight_axes, this);
        }
    }

    process_interactions() {
        //configure default interactions
        const interactions = this.model.get("interactions");

        if (is_defined(interactions.click)) {
            this.process_click(interactions.click);
        } else {
            this.reset_click();
        }

        if(is_defined(interactions.hover)) {
            this.process_hover(interactions.hover);
        } else {
            this.reset_hover();
        }

        if(is_defined(interactions.legend_click)) {
            this.process_legend_click(interactions.legend_click);
        } else {
            this.reset_legend_click();
        }
        if(is_defined(interactions.legend_hover)) {
            this.process_legend_hover(interactions.legend_hover);
        } else {
            this.reset_legend_hover();
        }
    }

    mouse_over() {
        if(this.model.get("enable_hover")) {
            const el = d3.select(d3GetEvent().target);
            if(this.is_hover_element(el)) {
                const data: any = el.data()[0];
                //make tooltip visible
                const hovered_data = this.model.get_data_dict(data, data.index);
                this.trigger("update_tooltip", hovered_data);
                this.show_tooltip();
                this.send({
                    event: "hover",
                    point: hovered_data,
                });
            }
        }
    }

    mouse_out() {
        if(this.model.get("enable_hover")) {
            const el = d3.select(d3GetEvent().target);
            if(this.is_hover_element(el)) {
                const data: any = el.data()[0];
                const hovered_data = this.model.get_data_dict(data, data.index);
                // make tooltip invisible
                this.hide_tooltip();
                this.send({
                    event: "hover",
                    point: hovered_data,
                });
            }
        }
    }

    mouse_move() {
        if(this.model.get("enable_hover") &&
            this.is_hover_element(d3.select(d3GetEvent().target))) {
            this.move_tooltip();
        }
    }

    //TODO: Rename function
    is_hover_element(elem) {
        const hit_check = this.display_el_classes.map(function(class_name) {
            return elem.classed(class_name);
        });
        return (_.compact(hit_check).length > 0);
    }

    bisect: any;
    colors: any;
    d3el: any;
    display_el_classes: string[];
    event_listeners: any;
    event_metadata: any;
    parent: any;
    scales: any;
    selected_indices: any;
    selected_style: any;
    tooltip_div: any;
    tooltip_view: any;
    unselected_style: any;
    uuid: any;
    x_padding: any;
    y_padding: any;

    // Overriding super class
    model: MarkModel;
}
