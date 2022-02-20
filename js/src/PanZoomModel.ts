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

import { ScaleModel } from 'bqscales';
import { WidgetModel, unpack_models, Dict } from '@jupyter-widgets/base';
import { semver_range } from './version';
import * as _ from 'underscore';

export class PanZoomModel extends WidgetModel {
  defaults() {
    return {
      ...WidgetModel.prototype.defaults(),
      _model_name: 'PanZoomModel',
      _view_name: 'PanZoom',
      _model_module: 'bqplot',
      _view_module: 'bqplot',
      _model_module_version: semver_range,
      _view_module_version: semver_range,
      scales: {},
      allow_pan: true,
      allow_zoom: true,
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);
    this.on('change:scales', this.snapshot_scales, this);
    this.snapshot_scales();
  }

  reset_scales() {
    const scales = this.getScales();

    _.each(
      Object.keys(scales),
      (k) => {
        _.each(
          scales[k],
          (s: any, i) => {
            s.set_state(this.scales_states[k][i]);
          },
          this
        );
      },
      this
    );
  }

  snapshot_scales() {
    // Save the state of the scales.
    const scales = this.getScales();

    this.scales_states = Object.keys(scales).reduce((obj, key) => {
      obj[key] = scales[key].map((s) => {
        return s.get_state(false);
      });
      return obj;
    }, {});
  }

  getScales(): Dict<ScaleModel[]> {
    return this.get('scales');
  }

  static serializers = {
    ...WidgetModel.serializers,
    scales: { deserialize: unpack_models },
  };

  scales_states: { [key: string]: any[] };
}
