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
    "nbextensions/widgets/widgets/js/utils",
    "./PanZoomModel",
    "jquery",
    "underscore",
    "bootstrap",
], function(widget, utils, PanZoomModel, $, _) {
    "use strict";

    var ToolbarModel = widget.DOMWidgetModel.extend({
        panzoom: function() {
            var figure = this.get("figure");
            if (this.get("panzoom")) {
                if (figure) {
                    figure.get("interaction").close();
                    figure.set("interaction", this.cached_interaction);
                    figure.save_changes();
                }
                this.set("panzoom", false);
            } else {
                if (figure) {
                    this.cached_interaction = figure.get("interaction");
                    this._create_panzoom_model(figure).then(function(model) {
                        figure.set("interaction", model);
                        figure.save_changes();
                    });
                }
                this.set("panzoom", true);
            }
        },
        reset: function() {
            var figure = this.get("figure");
            var panzoom = this.get("panzoom");
            if (figure && panzoom) {
                figure.get("interaction").reset_scales();
            }
        },
        save: function() {
            var figure = this.get("figure");
            if (figure) {
                figure.save();
            }
            // TODO: The toolbar view needs to be associated with a Figure view
            // for this to make sense.
         },
        _create_panzoom_model: function(figure) {
            /*
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
                        if (scales["x"]) {
                            x_scales.push(scales["x"]);
                        }
                        if (scales["y"]) {
                            y_scales.push(scales["y"]);
                        }
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
        }, widget.DOMWidgetModel.prototype.serializers)
    });

    var Toolbar = widget.DOMWidgetView.extend({

        render: function() {
            var that = this;
            this.el.classList.add("bqplot", "widget-hbox");

            // We use ipywidget's css (widget-*-*) to benefit from default
            // default width, shadows. Making a btn-group would break the
            // alignment.

            // Create the buttons
            this.$Panzoom = $("<button />")
                .addClass("btn btn-default widget-toggle-button")
                .appendTo(this.$el)
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.panzoom();
                });

            this.$Reset = $("<button />")
                .addClass("btn btn-default widget-button")
                .appendTo(this.$el)
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.reset();
                });

            this.$Save = $("<button />")
                .addClass("btn btn-default widget-button")
                .appendTo(this.$el)
                .on("click", function (e) {
                    e.preventDefault();
                    that.model.save();
                });

            // Font Awesome icons.
            $("<i />").addClass("fa fa-arrows").prependTo(this.$Panzoom);
            $("<i />").addClass("fa fa-refresh").prependTo(this.$Reset);
            $("<i />").addClass("fa fa-save").prependTo(this.$Save);
        },

        update: function() {
            if (this.model.get("panzoom")) {
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
