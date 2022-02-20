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

import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

interface HeatMapData {
  x: number[];
  y: number[];
  color: number[][];
}

export class HeatMapModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'HeatMapModel',
      _view_name: 'HeatMap',
      x: [],
      y: [],
      color: null,
      scales_metadata: {
        x: { orientation: 'horizontal', dimension: 'x' },
        y: { orientation: 'vertical', dimension: 'y' },
        color: { dimension: 'color' },
      },
      null_color: 'black',
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);

    this.on_some_change(['x', 'y', 'color'], this.update_data, this);
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.update_data();
    this.update_domains();
  }

  update_data() {
    this.dirty = true;
    // Handling data updates
    this.mark_data = {
      x: this.get('x'),
      y: this.get('y'),
      color: this.get('color'),
    };
    this.update_domains();
    this.dirty = false;
    this.trigger('data_updated');
  }

  update_domains() {
    if (!this.mark_data) {
      return;
    }

    const scales = this.getScales();
    const flat_colors = [].concat.apply(
      [],
      this.mark_data.color.map((x) => Array.prototype.slice.call(x, 0))
    );

    if (!this.get('preserve_domain').x) {
      scales.x.computeAndSetDomain(this.mark_data.x, this.model_id + '_x');
    } else {
      scales.x.delDomain([], this.model_id + '_x');
    }

    if (!this.get('preserve_domain').y) {
      scales.y.computeAndSetDomain(this.mark_data.y, this.model_id + '_y');
    } else {
      scales.y.delDomain([], this.model_id + '_y');
    }
    if (scales.color !== null && scales.color !== undefined) {
      if (!this.get('preserve_domain').color) {
        scales.color.computeAndSetDomain(flat_colors, this.model_id + '_color');
      } else {
        scales.color.delDomain([], this.model_id + '_color');
      }
    }
  }

  mark_data: HeatMapData;

  static serializers = {
    ...MarkModel.serializers,
    x: serialize.array_or_json_serializer,
    y: serialize.array_or_json_serializer,
    color: serialize.array_or_json_serializer,
  };
}
