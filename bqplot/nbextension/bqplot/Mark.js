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

define(["widgets/js/manager", "widgets/js/widget", "d3", "base/js/utils"], function(WidgetManager, widget, d3, utils) {
    var min_size = 10;
    var Mark = widget.WidgetView.extend({
        render: function() {
            this.parent = this.options.parent;
            this.uuid = utils.uuid();
            var scale_creation_promise = this.set_scale_models();
            this.model.on("scales_updated", this.set_scale_models, this);

            this.colors = this.model.get("colors");

            this.el = d3.select(document.createElementNS(d3.ns.prefix.svg, "g"));
            if(this.options.clip_id && this.model.get("apply_clip")) {
                this.el.attr("clip-path", "url(#" + this.options.clip_id + ")");
            }

            this.help_text = this.model.get("help_text");
            this.div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            this.bisect = d3.bisector(function(d) { return d; }).left;
            this.el.style("display", (this.model.get("visible") ? "inline" : "none"));
            return scale_creation_promise;
        },
        set_scale_models: function() {
            // first, if this.scales was already define, unregister to any
            // event on the old one.
            for (var key in this.scales) {
                this.stopListening(this.scales[key]);
            }

            this.scales = {};

            var scale_models = this.model.get("scales");
            var that = this;
            var scale_promises = {}
            _.each(scale_models, function(model, key) {
                scale_promises[key] = that.create_child_view(model);
            });
            return utils.resolve_promises_dict(scale_promises).then(function(d) {
                that.scales = d;
                that.x_scale = that.scales["x"];
                that.y_scale = that.scales["y"];

                that.listenTo(that.x_scale, "domain_changed", function() {
                    if (!that.model.dirty) { that.draw(); }
                });
                that.listenTo(that.y_scale, "domain_changed", function() {
                    if (!that.model.dirty) { that.draw(); }
                });
                that.set_ranges();
                that.rescale();
            });
        },
        set_ranges: function() {
            this.x_scale.set_range(this.parent.get_padded_xrange(this.x_scale.model));
            this.y_scale.set_range(this.parent.get_padded_yrange(this.y_scale.model));

            this.x_offset = this.x_scale.offset;
            this.y_offset = this.y_scale.offset;

            var size_scale = this.scales["size"];
            if(size_scale) {
                // I don't know how to set the lower bound on the range of the
                // values that the size scale takes. I guess a reasonable
                // approximation is that the area should be proportional to the
                // value. But I also want to set a lower bound of 10px area on
                // the size. This is what I do in the step below.

                // I don't know how to handle for ordinal scale.
                var size_domain = size_scale.scale.domain();
                var ratio = d3.min(size_domain) / d3.max(size_domain);
                size_scale.set_range([d3.max([(this.model.get("default_size") * ratio), min_size]), this.model.get("default_size")]);
            }
            var color_scale = this.scales["color"];
            if(color_scale) {
                color_scale.set_range();
            }
            var opacity_scale = this.scales["opacity"];
            if(opacity_scale) {
                opacity_scale.set_range([0.2, 1]);
            }
        },
        create_listeners: function() {
            this.model.on("change:visible", this.update_visibility, this);

            this.parent.on("margin_updated", this.rescale, this);
            this.model.on_some_change(["labels", "display_legend"], function() { this.model.trigger("redraw_legend"); }, this);
        },
        set_internal_scales: function() {
            // Some marks such as Bars need to create additional scales
            // to draw themselves. In this case, the set_internal_scales
            // is overloaded.
        },
        remove: function() {
            this.model.off(null, null, this);
            this.el.remove();
            Mark.__super__.remove.apply(this);
        },
        draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
            elem.selectAll(".legend" + this.uuid).remove();
            elem.append("g")
                .attr("transform", "translate(" + x_disp + ", " + y_disp + ")")
                .attr("class", "legend" + this.uuid)
                .on("mouseover", $.proxy(this.highlight_axis, this))
                .on("mouseout", $.proxy(this.unhighlight_axis, this))
              .append("text")
                .text(this.model.get("labels")[0]);
            return [1, 1];
        },
        highlight_axis: function() {
            this.x_scale.model.trigger("highlight_axis");
            this.y_scale.model.trigger("highlight_axis");
        },
        unhighlight_axis: function() {
            this.x_scale.model.trigger("unhighlight_axis");
            this.y_scale.model.trigger("unhighlight_axis");
        },
        rescale: function() {
            this.width = this.parent.get_mark_plotarea_width(this.x_scale.model);
            this.height = this.parent.get_mark_plotarea_height(this.y_scale.model);
        },
        invert_range: function(start_pxl, end_pxl) {
            return [start_pxl, end_pxl];
        },
        invert_point: function(pxl) {
            return [start_pxl, end_pxl];
        },
        // is the following function really required?
        invert_multi_range: function(array_pixels) {
            return array_pixels;
        },
        update_visibility: function(model, visible) {
            this.el.style("display", visible ? "inline" : "none");
        },
        get_colors: function(index) {
            //function to cycle colors when number of children are more than
            //number of colors.
            this.colors = this.model.get("colors");
            var len = this.colors.length;
            return this.colors[index % len];
        },
        // Style related functions
        selected_style_updated: function(model, style) {
            this.selected_style = style;
            this.style_updated(style, this.selected_indices);
        },
        unselected_style_updated: function(model, style) {
            this.unselected_style = style;
            var sel_indices = this.selected_indices;
            var unselected_indices = (sel_indices) ? _.range(this.model.mark_data.length).filter(function(index){ return sel_indices.indexOf(index) == -1; })
                                                             : [];
            this.style_updated(style, unselected_indices);
        },
        style_updated: function(new_style, indices) {
            // reset the style of the elements and apply the new style
            this.set_default_style(indices);
            this.set_style_on_elements(new_style, indices);
        },
        apply_styles: function(indices) {
            var all_indices = _.range(this.model.mark_data.length);
            this.clear_style(this.selected_style);
            this.clear_style(this.unselected_style);

            this.set_default_style(all_indices);

            this.set_style_on_elements(this.selected_style, this.selected_indices);
            var unselected_indices = (indices == undefined) ? [] : _.difference(all_indices, indices);
            this.set_style_on_elements(this.unselected_style, unselected_indices);
        },
        // Abstract functions which have to be overridden by the specific mark
        clear_style: function(style_dict, indices) {
        },
        set_default_style:function(indices) {
        },
        set_style_on_elements: function(style, indices) {
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.Mark", Mark);
    return [Mark];
});
