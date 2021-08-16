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
import { Interaction } from './Interaction';
import { PanZoomModel } from './PanZoomModel';
import * as _ from 'underscore';
export class FigureModel extends widgets.DOMWidgetModel {
  defaults() {
    return {
      ...widgets.DOMWidgetModel.prototype.defaults(),
      _model_name: 'FigureModel',
      _view_name: 'Figure',
      _model_module: 'bqplot',
      _view_module: 'bqplot',
      _model_module_version: semver_range,
      _view_module_version: semver_range,

      title: '',
      axes: [],
      marks: [],
      interaction: null,
      scale_x: undefined,
      scale_y: undefined,
      title_style: {},
      background_style: {},
      legend_style: {},
      legend_text: {},
      theme: 'classic',

      min_aspect_ratio: 0.01,
      max_aspect_ratio: 100,
      pixel_ratio: null,

      fig_margin: {
        top: 60,
        bottom: 60,
        left: 60,
        right: 60,
      },

      padding_x: 0.0,
      padding_y: 0.025,
      legend_location: 'top-right',
      animation_duration: 0,
      show_toolbar: true,
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);
    this.on('msg:custom', this.handle_custom_messages, this);
  }

  handle_custom_messages(msg) {
    if (msg.type === 'save_png') {
      this.trigger('save_png', msg.filename, msg.scale);
    } else if (msg.type === 'save_svg') {
      this.trigger('save_svg', msg.filename);
    }
  }

  save_png() {
    // TODO: Any view of this Figure model will pick up this event
    // and render a png. Remove this eventually.
    this.trigger('save_png');
  }

  /**
   * Start or stop pan zoom mode
   *
   */
  panzoom(): void {
    if (this.panzoomData.panning) {
      this.set('interaction', this.panzoomData.cached_interaction);
      this.panzoomData.panning = false;
      this.save_changes();
    } else {
      this.panzoomData.cached_interaction = this.get('interaction');
      const panzoom = this.panzoomData.panzoom;
      if (panzoom) {
        this.set('interaction', panzoom);
        this.save_changes();
      } else {
        this.create_panzoom_model().then((model) => {
          this.set('interaction', model);
          this.panzoomData.panzoom = model;
          this.save_changes();
        });
      }
      this.panzoomData.panning = true;
    }
  }

  /**
   * Creates a panzoom interaction widget for the this model.
   *
   * It will discover the relevant scales of this model.
   */
  private create_panzoom_model(): Promise<PanZoomModel> {
    return this.widget_manager
      .new_widget({
        model_name: 'PanZoomModel',
        model_module: 'bqplot',
        model_module_version: this.get('_model_module_version'),
        view_name: 'PanZoom',
        view_module: 'bqplot',
        view_module_version: this.get('_view_module_version'),
      })
      .then((model: PanZoomModel) => {
        return Promise.all(this.get('marks')).then((marks: any[]) => {
          const x_scales = [],
            y_scales = [];
          for (let i = 0; i < marks.length; ++i) {
            const preserve_domain = marks[i].get('preserve_domain');
            const scales = marks[i].get('scales');
            _.each(scales, (v, k) => {
              const dimension = marks[i].get('scales_metadata')[k]['dimension'];
              if (dimension === 'x' && !preserve_domain[k]) {
                x_scales.push(scales[k]);
              }
              if (dimension === 'y' && !preserve_domain[k]) {
                y_scales.push(scales[k]);
              }
            });
          }
          model.set('scales', {
            x: x_scales,
            y: y_scales,
          });
          model.save_changes();
          return model;
        });
      });
  }

  /**
   * Reset the scales, delete the PanZoom widget, set the figure
   * interaction back to its previous value.
   */
  reset(): void {
    this.set('interaction', this.panzoomData.cached_interaction);
    const panzoom = this.panzoomData.panzoom;
    panzoom.reset_scales();
    panzoom.close();
    this.panzoomData.panzoom = null;
    this.panzoomData.panning = false;
    this.save_changes();
  }

  static serializers = {
    ...widgets.DOMWidgetModel.serializers,
    marks: { deserialize: widgets.unpack_models },
    axes: { deserialize: widgets.unpack_models },
    interaction: { deserialize: widgets.unpack_models },
    scale_x: { deserialize: widgets.unpack_models },
    scale_y: { deserialize: widgets.unpack_models },
    layout: { deserialize: widgets.unpack_models },
  };

  private panzoomData: {
    panning: boolean;
    cached_interaction: Interaction;
    panzoom: PanZoomModel | undefined;
  } = { panning: false, cached_interaction: null, panzoom: undefined };
}
