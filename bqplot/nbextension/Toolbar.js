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

// npm compatibility
if (typeof define !== 'function') { var define = require('./requirejs-shim')(module); }

define([
    "nbextensions/widgets/widgets/js/widget",
    "./PanZoomModel",
    "jquery",
    "underscore"
], function(widget, PanZoomModel, $, _) {
    "use strict";

    var ToolbarModel = widget.WidgetModel.extend({
        // Backbone attributes:
        // - _panning: Bool
        //       Whether one is currently panning - zooming the specified figure.
        // - _panzoom: Instance of Panzoom or undefined:
        //       The created panzoom interaction. It is undefined at first.
        // Attributes:
        // - cached_interaction: Instance of Interaction or null or undefined.
        //   The cached interaction of the Figure. It is undefined at first
        //   and can take the value of the figure interaction, which can be
        //   null.
        panzoom: function() {
            var figure = this.get("figure");
            if (this.get("_panning")) {
                if (figure) {
                    figure.set("interaction", this.cached_interaction);
                    figure.save_changes();
                }
                this.set("_panning", false);
                this.save_changes();
            } else {
                if (figure) {
                    this.cached_interaction = figure.get("interaction");
                    var that = this;
                    var panzoom = this.get("_panzoom");
                    if (panzoom) {
                        figure.set("interaction", panzoom);
                        figure.save_changes();
                    } else {
                        this._create_panzoom_model(figure).then(function (model) {
                            that.set("_panzoom", model);
                            that.save_changes();
                            figure.set("interaction", model);
                            figure.save_changes();
                        })
                    }
                }
                this.set("_panning", true);
                this.save_changes();
            }
        },
        reset: function() {
            /**
             * Reset the scales, delete the PanZoom widget, set the figure
             * interaction back to its previous value.
             */
            var figure = this.get("figure");
            var panning = this.get("_panning");
            if (figure) {
                figure.set("interaction", this.cached_interaction);
                figure.save_changes();
                var panzoom = this.get("_panzoom");
                // Should reset_scales be part of PanZoomModel.close()?
                panzoom.reset_scales()
                panzoom.close();
                this.set("_panzoom", null);
                this.set("_panning", false);
                this.save_changes();
            }
        },
        save_png: function() {
            /**
             * Triggers the saving for all the views of that figure.
             */
            // TODO: the toolbar view needs to be associated with a Figure
            // view to avoid calling a model method here.
            var figure = this.get("figure");
            if (figure) {
                figure.save_png();
            }
         },
        _create_panzoom_model: function(figure) {
            /**
             * Creates a panzoom interaction widget for the specified figure.
             *
             * It will discover the relevant scales for the specified figure.
             */
            return this.widget_manager.new_widget({
                model_name: "PanZoomModel",
                model_module: "nbextensions/bqplot/PanZoomModel",
                widget_class: "bqplot.interacts.PanZoom"
            }).then(function(model) {
                return Promise.all(figure.get("marks")).then(function(marks) {
                    var x_scales = [], y_scales = [];
                    for (var i=0; i<marks.length; ++i) {
                        var scales = marks[i].get("scales");
                        _.each(scales, function(v, k) {
                            var dimension = marks[i].get("scales_metadata")[k]["dimension"];
                            if (dimension === "x") {
                                 x_scales.push(scales[k]);
                            }
                            if (dimension === "y") {
                                 y_scales.push(scales[k]);
                            }
                        });
                    }
                    model.set("scales", {
                        "x": x_scales,
                        "y": y_scales
                    });
                    model.save_changes();
                    return model;
                });
            });
        },
    }, {
        serializers: _.extend({
            figure: {deserialize: widget.unpack_models},
            _panzoom: {deserialize: widget.unpack_models},
        }, widget.WidgetModel.prototype.serializers)
    });

    var Toolbar = widget.DOMWidgetView.extend({

        render: function() {
            var that = this;
            this.el.classList.add("bqplot", "widget-hbox");

            // We use ipywidget css classes (ipywidget and widget-*-*) to
            // benefit from default width, shadows.
            // We do not use btn-group to not break alignment with ipywidget
            // buttons.

            // Create the buttons
            this.$Panzoom = $("<button />")
                .addClass("btn btn-default")
                .addClass("ipy-widget widget-toggle-button") // ipywidgets css
                .appendTo(this.$el)
                .attr("data-toggle", "tooltip")
                .attr("title", "PanZoom")
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.panzoom();
                });

            this.$Reset = $("<button />")
                .addClass("btn btn-default")
                .addClass("ipy-widget widget-button") // ipywidgets css
                .appendTo(this.$el)
                .attr("data-toggle", "tooltip")
                .attr("title", "Reset")
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.reset();
                });

            this.$Save = $("<button />")
                .addClass("btn btn-default")
                .addClass("ipy-widget widget-button") // ipywidgets css
                .appendTo(this.$el)
                .attr("data-toggle", "tooltip")
                .attr("title", "Save")
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.save_png();
                });

            // Font Awesome icons.
            $("<i />").addClass("fa fa-arrows").prependTo(this.$Panzoom);
            $("<i />").addClass("fa fa-refresh").prependTo(this.$Reset);
            $("<i />").addClass("fa fa-save").prependTo(this.$Save);

            // Handle initial state
            this.update();
        },

        update: function() {
            if (this.model.get("_panning")) {
                this.$Panzoom.addClass("active");
            } else {
                this.$Panzoom.removeClass("active");
            }
        }
    });

    return {
        Toolbar: Toolbar,
        ToolbarModel: ToolbarModel,
    };
});
