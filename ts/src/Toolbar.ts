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
import { semver_range } from './version';
import * as _ from 'underscore';

export class ToolbarModel extends widgets.DOMWidgetModel {

    defaults() {
        return {...widgets.DOMWidgetModel.prototype.defaults(),
            _model_name: "ToolbarModel",
            _view_name: "Toolbar",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,

            figure: undefined,
            _panning: false,
            _panzoom: null
        };
    }

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
    panzoom() {
        const figure = this.get("figure");
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
                const panzoom = this.get("_panzoom");
                if (panzoom) {
                    figure.set("interaction", panzoom);
                    figure.save_changes();
                } else {
                    this._create_panzoom_model(figure).then((model) => {
                        this.set("_panzoom", model);
                        this.save_changes();
                        figure.set("interaction", model);
                        figure.save_changes();
                    })
                }
            }
            this.set("_panning", true);
            this.save_changes();
        }
    }

    reset() {
        /**
         * Reset the scales, delete the PanZoom widget, set the figure
         * interaction back to its previous value.
         */
        const figure = this.get("figure");
        if (figure) {
            figure.set("interaction", this.cached_interaction);
            figure.save_changes();
            const panzoom = this.get("_panzoom");
            // Should reset_scales be part of PanZoomModel.close()?
            panzoom.reset_scales()
            panzoom.close();
            this.set("_panzoom", null);
            this.set("_panning", false);
            this.save_changes();
        }
    }

    save_png() {
        /**
         * Triggers the saving for all the views of that figure.
         */
        // TODO: the toolbar view needs to be associated with a Figure
        // view to avoid calling a model method here.
        const figure = this.get("figure");
        if (figure) {
            figure.save_png();
        }
     }

    _create_panzoom_model(figure) {
        /**
         * Creates a panzoom interaction widget for the specified figure.
         *
         * It will discover the relevant scales for the specified figure.
         */
        return this.widget_manager.new_widget({
            model_name: "PanZoomModel",
            model_module: "bqplot",
            model_module_version: figure.get("_model_module_version"),
            view_name: "PanZoom",
            view_module: "bqplot",
            view_module_version: figure.get("_view_module_version")
        }).then(function(model) {
            return Promise.all(figure.get("marks")).then(function(marks: any[]) {
                const x_scales = [], y_scales = [];
                for (let i=0; i<marks.length; ++i) {
                    const preserve_domain = marks[i].get("preserve_domain");
                    const scales = marks[i].get("scales");
                    _.each(scales, function(v, k) {
                        const dimension = marks[i].get("scales_metadata")[k]["dimension"];
                        if (dimension === "x" && !preserve_domain[k]) {
                             x_scales.push(scales[k]);
                        }
                        if (dimension === "y" && !preserve_domain[k]) {
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
    }

    cached_interaction: any

    static serializers = {
        ...widgets.DOMWidgetModel.serializers,
        figure: { deserialize: widgets.unpack_models },
        _panzoom: { deserialize: widgets.unpack_models }
    };
};

export class Toolbar extends widgets.DOMWidgetView {

    render() {
        this.el.classList.add("jupyter-widget"); // @jupyter-widgets/controls css
        this.el.classList.add("widget-hbox"); // @jupyter-widgets/controls css

        // We use @jupyter-widgets/controls css classes (ipywidget and widget-*-*) to
        // benefit from default width, shadows.
        // We do not use btn-group to not break alignment with jupyter
        // buttons.

        // Create the buttons
        const _panzoom = document.createElement("button");
        _panzoom.classList.add("jupyter-widgets"); // @jupyter-widgets/controls css
        _panzoom.classList.add("jupyter-button"); // @jupyter-widgets/controls css
        _panzoom.classList.add("widget-toggle-button") // @jupyter-widgets/controls css
        _panzoom.setAttribute("data-toggle", "tooltip");
        _panzoom.setAttribute("title", "PanZoom");
        _panzoom.onclick = (e) => {
            e.preventDefault();
            this.model.panzoom();
        };
        const panzoomicon = document.createElement("i");
        panzoomicon.className = "fa fa-arrows";
        _panzoom.appendChild(panzoomicon);

        const _reset = document.createElement("button");
        _reset.classList.add("jupyter-widgets"); // @jupyter-widgets/controls css
        _reset.classList.add("jupyter-button"); // @jupyter-widgets/controls css
        _reset.classList.add("widget-button") // @jupyter-widgets/controls css
        _reset.setAttribute("data-toggle", "tooltip");
        _reset.setAttribute("title", "Reset");
        _reset.onclick = (e) => {
            e.preventDefault();
            this.model.reset();
        };
        const refreshicon = document.createElement("i");
        refreshicon.className = "fa fa-refresh";
        _reset.appendChild(refreshicon);

        const _save = document.createElement("button");
        _save.classList.add("jupyter-widgets"); // @jupyter-widgets/controls css
        _save.classList.add("jupyter-button"); // @jupyter-widgets/controls css
        _save.classList.add("widget-button") // @jupyter-widgets/controls css
        _save.setAttribute("data-toggle", "tooltip");
        _save.setAttribute("title", "Save");
        _save.onclick = (e) => {
            e.preventDefault();
            this.model.save_png();
        };
        const saveicon = document.createElement("i");
        saveicon.className = "fa fa-save";
        _save.appendChild(saveicon);

        this.el.appendChild(_panzoom);
        this.el.appendChild(_reset);
        this.el.appendChild(_save);

        // Handle initial state
        this._panzoom = _panzoom;
        this.update();
    }

    update() {
        if (this.model.get("_panning")) {
            this._panzoom.classList.add("mod-active");
        } else {
            this._panzoom.classList.remove("mod-active");
        }
    }

    model: ToolbarModel
    _panzoom: any
};
