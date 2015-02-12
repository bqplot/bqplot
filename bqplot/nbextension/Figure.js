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

define(["widgets/js/widget", "./d3", "base/js/utils", "./require-less/less!./bqplot"], function(Widget, d3, utils) {
    "use strict";

    var Figure = Widget.DOMWidgetView.extend({

        initialize : function() {
            this.setElement(document.createElementNS(d3.ns.prefix.svg, "svg"));
            this.el.classList.add("bqplot");
            Figure.__super__.initialize.apply(this, arguments);
        },

        render : function() {
            this.width = this.model.get("min_width");
            this.height = this.model.get("min_height");
            this.id = utils.uuid();

            // Dictionary which contains the mapping for each of the marks id
            // to it's padding. Dictionary is required to not recompute
            // everything when a mark is removed.
            this.x_pad_dict = {};
            this.y_pad_dict = {};

            // this is the net padding in pixel to be applied to the x and y.
            // If there is no restriction on the plottable area of the figure,
            // then these two variables are the maximum of the values in the
            // corresponding variables x_pad_dict, y_pad_dict.
            this.x_padding_arr = {};
            this.y_padding_arr = {};

            this.figure_padding_x = this.model.get("padding_x");
            this.figure_padding_y = this.model.get("padding_y");
            this.clip_id = "clip_path_" + this.id;

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
            this.margin = this.model.get("fig_margin");

            this.svg = d3.select(this.el)
                .attr("viewBox", "0 0 " + this.width + " " + this.height);
            this.update_plotarea_dimensions();
            // this.fig is the top <g> element to be impacted by a rescaling / change of margins
            this.fig = this.svg.append("g")
                .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

            var gradient_id = "gd_id" + this.id;

            var background_gradient = this.svg.append("svg:defs")
                .append("svg:linearGradient")
                  .attr("id", gradient_id)
                  .attr("x1", "50%")
                  .attr("y1", "0%")
                  .attr("x2", "50%")
                  .attr("y2", "100%")
                  .attr("spreadMethod", "pad");
            background_gradient.append("svg:stop")
                  .attr("offset", "0%")
                  .attr("stop-color", "#8fd4ff")
                  .attr("stop-opacity", 0.1);
            background_gradient.append("svg:stop")
                  .attr("offset", "100%")
                  .attr("stop-color", "black")
                  .attr("stop-opacity", 0);

            this.bg = this.fig.append("rect")
              .attr("x", 0).attr("y", 0)
              .attr("width", this.plotarea_width)
              .attr("height", this.plotarea_height)
              .attr("fill", "url(#" + gradient_id + ")");

            this.fig_axes = this.fig.append("g");
            this.fig_marks = this.fig.append("g");
            this.interaction = this.fig.append("g");

            /*
             * The following is the structure of the DOM element constructed
            <svg>
                <g class="svg-figure" transform='margin translation'>
                    <g class="svg-axes"></g>
                    <g class="svg-marks"></g>
                    <g class="svg-interaction"></g>
                </g>
            </svg>
            */

            this.clip_path = this.svg.select("defs")
              .append("svg:clipPath")
              .attr("id", this.clip_id)
              .append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", this.plotarea_width)
              .attr("height", this.plotarea_height);

            this.title = this.fig.append("text")
              .attr("class", "mainheading")
              .attr({x: (0.5 * (this.plotarea_width)), y: -(this.margin.top / 2.0), dy: "1em"})
              .text(this.model.get("title"));

            var figure_scale_promise = this.create_figure_scales();
            var that = this;
            figure_scale_promise.then(function() {
                that.mark_views = new Widget.ViewList(that.add_mark, that.remove_mark, that);
                that.mark_views.update(that.model.get("marks"));
                Promise.all(that.mark_views.views).then(function(views) {
                    that.update_marks(views);
                    that.update_legend();
                    // Update Interaction layer
                    // This has to be done after the marks are created
                    that.set_interaction(that.model.get("interaction"));
                });

                that.axis_views = new Widget.ViewList(that.add_axis, null, that);
                that.axis_views.update(that.model.get("axes"));

                // TODO: move to the model
                that.model.on_some_change(["fig_margin", "min_width", "min_height", "preserve_aspect"], that.update_layout, that);
                that.model.on_some_change(["padding_x", "padding_y"], function() {
                    this.figure_padding_x = this.model.get("padding_x");
                    this.figure_padding_y = this.model.get("padding_y");
                    this.trigger("margin_updated");
                }, that);
                that.model.on("change:axes", function(model, value, options) {
                    this.axis_views.update(value);
                }, that);
                that.model.on("change:marks", function(model, value, options) {
                    this.mark_views.update(value);
                    Promise.all(this.mark_views.views).then(function(views) {
                        that.update_marks(views);
                        that.update_legend();
                    });
                }, that);
                that.model.on("change:legend_location", that.update_legend, that);
                that.model.on("change:title", that.update_title, that);

                that.model.on("change:interaction", function(model, value) {
                    this.set_interaction(value);
                }, that);

                // that.id is added to namespace the event to this particular
                // view. This is required because we are adding the event on
                // the output cell and hence we need to unbind it when this
                // view is being removed. To identify the event listener
                // corresponding to this view, we need the id.
                $(that.options.cell).on("output_area_resize."+that.id, function() {
                    that.update_layout();
                });

                that.after_displayed(function() {
                    that.update_layout();
                });
            });
        },
        remove: function() {
            this.model.off(null, null, this);
            this.svg.remove();
            $(this.options.cell).off("output_area_resize."+this.id);
            Figure.__super__.remove.apply(this);
        },
        create_figure_scales: function() {
            // Creates the absolute scales for the figure: default domain is [0,1], range is [0,width] and [0,height].
            // See the scale_x and scale_y attributes of the python Figure
            var that = this;
            var x_scale_promise = this.create_child_view(this.model.get("scale_x")).then(function(view) {
                that.scale_x = view;
                that.scale_x.scale.clamp(true);
                that.scale_x.set_range([0, that.plotarea_width]);
            });

            var y_scale_promise = this.create_child_view(this.model.get("scale_y")).then(function(view) {
                that.scale_y = view;
                that.scale_y.scale.clamp(true);
                that.scale_y.set_range([that.plotarea_height, 0]);
            });
            return Promise.all([x_scale_promise, y_scale_promise]);
        },
        padded_range: function(direction, scale_model) {
            // Functions to be called by mark which respects padding.
            // Typically all marks do this. Axis do not do this.
            // Also, if a mark does not set the domain, it can potentially call
            // the unpadded ranges.
            if(!(scale_model.get("allow_padding"))) {
                return this.range(direction);
            }
            var scale_id = scale_model.id;

            if(direction==="x") {
                var scale_padding = (this.x_padding_arr[scale_id] !== undefined) ?
                    this.x_padding_arr[scale_id] : 0;
                var fig_padding = (this.plotarea_width) * this.figure_padding_x;
                return [(fig_padding + scale_padding), (this.plotarea_width - fig_padding - scale_padding)];
            } else if(direction==="y") {
                var scale_padding = (this.y_padding_arr[scale_id] !== undefined) ?
                    this.y_padding_arr[scale_id] : 0;
                var fig_padding = (this.plotarea_height) * this.figure_padding_y;
                return [this.plotarea_height - scale_padding - fig_padding, scale_padding + fig_padding];
            }
        },
        range: function(direction) {
            if(direction==="x") {
                return [0, this.plotarea_width];
            } else if(direction==="y") {
                return [this.plotarea_height, 0];
            }
        },
        get_mark_plotarea_height: function(scale_model) {
            if(!(scale_model.get("allow_padding"))) {
                return this.plotarea_height;
            }
            var scale_id = scale_model.id;
            var scale_padding = (this.y_padding_arr[scale_id] !== undefined) ?
                this.y_padding_arr[scale_id] : 0;
            return (this.plotarea_height) * (1 - this.figure_padding_y) - scale_padding - scale_padding;
        },
        get_mark_plotarea_width: function (scale_model) {
            if(!(scale_model.get("allow_padding"))) {
                return this.plotarea_width;
            }

            var scale_id = scale_model.id;
            var scale_padding = (this.x_padding_arr[scale_id] !== undefined) ?
                this.x_padding_arr[scale_id] : 0;
            return (this.plotarea_width) * (1 - this.figure_padding_x) - scale_padding - scale_padding;
        },
        add_axis: function(model) {
            // Called when an axis is added to the axes list.

            // If we have more than two axes, then we need to highlight corresponding axes
            // when hovering a mark legend.
            var enable = (this.model.get("axes").length > 2);
            var that = this;
            return this.create_child_view(model, {enable_highlight: enable})
              .then(function(view) {
                that.fig_axes.node().appendChild(view.el.node());
                // Trigger the displayed event of the child view.
                that.after_displayed(function() {
                    view.trigger("displayed");
                });
            });
        },
        remove_from_padding_dict: function(dict, mark_model, scale_model) {
            var scale_id = scale_model.id;
            if(dict[scale_id] !== undefined) {
                delete dict[scale_id][mark_model.id];
            }
            if(Object.keys(dict[scale_id]).length === 0) {
                delete dict[scale_id];
            }
        },
        update_padding_dict: function(dict, mark_model, scale_model, value) {
            var scale_id = scale_model.id;
            if(!(dict[scale_id])) {
                dict[scale_id]= {};
            }
            dict[scale_id][mark_model.id] = value;
        },
        /* mark_scales_updated: function(model) {
            var prev_scale_models = model.previous("scales");
            this.remove_from_padding_dict(this.x_pad_dict, model, prev_scale_models["x"]);
            this.remove_from_padding_dict(this.y_pad_dict, model, prev_scale_models["y"]);

            var scale_models = model.get("scales")
            this.update_padding_dict(this.x_pad_dict, model, scale_models["x"], model.net_x_padding);
            this.update_padding_dict(this.y_pad_dict, model, scale_models["y"], model.net_y_padding);

            this.update_paddings();
        },
        mark_padding_updated: function(model) {
            var scale_models = model.get("scales");

            this.update_padding_dict(this.x_pad_dict, model, scale_models["x"], model.net_x_padding);
            this.update_padding_dict(this.y_pad_dict, model, scale_models["y"], model.net_y_padding);

            this.update_paddings();
        },*/
        mark_scales_updated: function(view) {
            var model = view.model;
            var prev_scale_models = model.previous("scales");
            this.remove_from_padding_dict(this.x_pad_dict, model, prev_scale_models["x"]);
            this.remove_from_padding_dict(this.y_pad_dict, model, prev_scale_models["y"]);

            var scale_models = model.get("scales")
            this.update_padding_dict(this.x_pad_dict, model, scale_models["x"], model.net_x_padding);
            this.update_padding_dict(this.y_pad_dict, model, scale_models["y"], model.net_y_padding);

            this.update_paddings();
        },
        mark_padding_updated: function(view) {
            var model = view.model;
            var scale_models = model.get("scales");

            this.update_padding_dict(this.x_pad_dict, model, scale_models["x"], model.net_x_padding);
            this.update_padding_dict(this.y_pad_dict, model, scale_models["y"], model.net_y_padding);

            this.update_paddings();
        },
        update_marks: function(mark_views) {
            this.update_paddings();
        },
        remove_mark: function(view) {
           // Called when a mark is removed from the mark list.
            var model = view.model;
            model.off("redraw_legend", null, this);
            model.off("data_updated", null, this);
            model.off("scales_updated", null, this);
            model.off("mark_padding_updated", null, this);

            var scale_models = model.get("scales");
            this.remove_from_padding_dict(this.x_pad_dict, model, scale_models["x"]);
            this.remove_from_padding_dict(this.y_pad_dict, model, scale_models["y"]);
            view.remove();
        },
        add_mark: function(model) {
            var that = this;

            model.on("data_updated redraw_legend", this.update_legend, this);
            /* model.on("scales_updated", function() {
                self.mark_scales_updated(model);
            }, this);
            model.on("mark_padding_updated", function() {
                self.mark_padding_updated(model);
            }, this); */

            var child_x_scale = model.get("scales")["x"];
            var child_y_scale = model.get("scales")["y"];

            if(child_x_scale == undefined) {
                child_x_scale = this.scale_x.model;
            }
            if(child_y_scale == undefined) {
                child_y_scale = this.scale_y.model;
            }

                that.update_padding_dict(that.x_pad_dict, model, child_x_scale, model.net_x_padding);
                that.update_padding_dict(that.y_pad_dict, model, child_y_scale, model.net_y_padding);
            });
            var dummy = that.fig_marks.node().appendChild(document.createElementNS(d3.ns.prefix.svg, "g"));
                return that.create_child_view(model, {clip_id: that.clip_id}).then(function(view) {
                    dummy.parentNode.replaceChild(view.el.node(), dummy);
		            view.model.on("mark_padding_updated", function() {
		                that.mark_padding_updated(view);
		            }, that);
		            view.on("mark_scales_updated", function() {
		                that.mark_scales_updated(view);
		            }, that);
                    // Trigger the displayed event of the child view.
                    that.after_displayed(function() {
                        view.trigger("displayed");
                    });
                    return view;
            });
        },
        update_paddings: function() {
            // Iterate over the paddings of the marks for each scale and store
            // the maximum padding for each scale on the X and Y in
            // x_padding_arr and y_padding_arr
            var max = 0; // ok padding cannot be negative

            this.x_padding_arr = {};
            this.y_padding_arr = {};

            var self = this;
            _.forEach(this.x_pad_dict, function(dict, scale_id) {
                max = 0;
                _.forEach(dict, function(value, key) {
                    max = Math.max(max, value);
                });
                self.x_padding_arr[scale_id] = max;
            });

            _.forEach(this.y_pad_dict, function(dict, scale_id) {
                max = 0;
                _.forEach(dict, function(value, key) {
                    max = Math.max(max, value);
                });
                self.y_padding_arr[scale_id] = max;
            });
            // This is for the figure to relayout everything to account for the
            // updated margins.
            this.trigger("margin_updated");

        },
        update_plotarea_dimensions: function() {
            this.plotarea_width = this.width - this.margin.left - this.margin.right;
            this.plotarea_height = this.height - this.margin.top - this.margin.bottom;
        },
        update_layout: function() {
            // First, reset the natural width by resetting the viewbox, then measure the flex size, then redraw to the flex dimensions
            this.svg.attr("width", null);
            this.svg.attr("viewBox", "0 0 " + this.model.get("min_width") +
                                        " " + this.model.get("min_height"));
            setTimeout(_.bind(this.update_layout2, this), 0);
        },
        update_layout2: function() {
            var rect = this.el.getBoundingClientRect();
            this.width = rect.width > 0 ? rect.width : this.model.get("min_width");
            this.height = rect.height > 0 ? rect.height : this.model.get("min_height");
            setTimeout(_.bind(this.update_layout3, this), 0);
        },
        update_layout3: function() {
            var preserve_aspect = this.model.get("preserve_aspect");
            if (preserve_aspect === true) {
                var aspect_ratio = this.model.get("min_width") / this.model.get("min_height");
                if (this.width/this.height > aspect_ratio) {
                    this.width = this.height * aspect_ratio;
                } else {
                    this.height = this.width / aspect_ratio;
                }
            }
            this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);
            this.svg.attr("width", this.width);

            // update ranges
            this.margin = this.model.get("fig_margin");
            this.update_plotarea_dimensions();

            this.scale_x.set_range([0, this.plotarea_width]);
            this.scale_y.set_range([this.plotarea_height, 0]);
            // transform figure
            this.fig.attr("transform", "translate(" + this.margin.left + "," +
                                                      this.margin.top + ")");
            this.title.attr({x: (0.5 * (this.plotarea_width)),
                             y: -(this.margin.top / 2.0),
                             dy: "1em"});

            this.bg
              .attr("width", this.plotarea_width)
              .attr("height", this.plotarea_height);

            this.clip_path.attr("width", this.plotarea_width)
              .attr("height", this.plotarea_height);

            this.trigger("margin_updated");
            this.update_legend();
        },
        update_legend: function() {
            this.fig_marks.selectAll(".g_legend").remove();

            var num_series = this.model.get("marks").length;
            var legend_disp = 30 + num_series * 7;
            var legend_height = 14;
            var legend_width = 24;
            var legend_location = this.model.get("legend_location");

            var legend_g = this.fig_marks.append("g")
              .attr("class", "g_legend");

            var that = this;
            var count = 1;
            var max_label_len = 1;
            Promise.all(this.mark_views.views).then(function(views) {
                views.forEach(function(mark_view) {
                    if(mark_view.model.get("display_legend")) {
                        var child_count = mark_view.draw_legend(legend_g, 0, count * (legend_height + 2), 0, legend_height + 2);
                        count = count + child_count[0];
                        max_label_len = (child_count[1]) ?
                            Math.max(max_label_len, child_count[1]) : max_label_len;
                    }
                });

                var coords = that.get_legend_coords(legend_location, legend_width, (count + 1) * (legend_height + 2), 0);
                if(count !== 1) {
                    legend_g.append("g")
                      .attr("class", "axis")
                    .append("rect")
                      .attr({"y": (legend_height + 2) / 2.0,
                             "x": (-0.5 * (legend_height + 2))})
                      .attr("width", (max_label_len+2) + "em")
                      .attr("height", (count * (legend_height + 2)))
                      .style({"fill": "none"});
                }
                max_label_len = (legend_location === "top" ||
                                 legend_location === "top-right" ||
                                 legend_location === "right") ? -(max_label_len + 2) : 1;
                legend_g.style({"transform": "translate(" + (coords[0]) + "px, " +
                                                            (coords[1]) + "px) " +
                                           " translateX(" + (max_label_len) + "em)"});
            });
        },
        get_legend_coords: function(legend_location, width, height, disp) {
            var x_start = 0;
            var y_start = 0;
            var fig_width = this.plotarea_width;
            var fig_height = this.plotarea_height;

            switch (legend_location){
                case "top":
                    x_start = fig_width * 0.5 - width;
                    y_start = 0;
                    break;
                case "top-right":
                    x_start = fig_width - disp;
                    y_start = 0;
                    break;
                case "right":
                    x_start = fig_width - disp;
                    y_start = fig_height* 0.5 - height;
                    break;
                case "bottom-right":
                    x_start = fig_width - disp;
                    y_start = fig_height - height;
                    break;
                case "bottom":
                    x_start = fig_width * 0.5 - width;
                    y_start = fig_height - height;
                    break;
                case "bottom-left":
                    x_start = 0;
                    y_start = fig_height - height;
                    break;
                case "left":
                    x_start = 0;
                    y_start = fig_height * 0.5 - height;
                    break;
                default:
                    x_start = 0;
                    y_start = 0;
            }
            return [x_start, y_start];
        },
        set_interaction: function(model) {
            if (this.interaction_view) { this.interaction_view.remove(); }
            if (model) {
                // Sets the child interaction
                var self = this;
                model.state_change.then(function() {
                    // Sets the child interaction
                    self.create_child_view(model).then(function(view) {
                        self.interaction_view = view;
                        self.interaction.node().appendChild(view.el.node());
                        // Trigger the displayed event of the child view.
                        self.after_displayed(function() {
                            view.trigger("displayed");
                        }, self);
                    });
                });
            }
        },
        update_title: function(model, title) {
            this.title.text(this.model.get("title"));
        },

    });

    return {
        Figure: Figure,
    };
});

