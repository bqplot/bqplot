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

import * as d3 from 'd3';
import * as _ from 'underscore';
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export class BoxplotModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'BoxplotModel',
      _view_name: 'Boxplot',
      x: [],
      y: [],
      scales_metadata: {
        x: { orientation: 'horizontal', dimension: 'x' },
        y: { orientation: 'vertical', dimension: 'y' },
      },
      stroke: null,
      box_fill_color: 'dodgerblue',
      outlier_fill_color: 'gray',
      opacities: [],
      box_width: null, // auto calculate box width
      auto_detect_outliers: true,
    };
  }

  initialize(): void {
    super.initialize.apply(this, arguments);

    this.on_some_change(['x', 'y'], this.update_data, this);
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.update_data();
    this.update_domains();
  }

  get_data_dict(data, index) {
    return data.dataDict;
  }

  update_data() {
    let xData = this.get('x');
    let yData = this.get('y');

    yData.forEach((elm) => {
      elm.sort((a, b) => {
        return a - b;
      });
    });

    if (xData.length > yData.length) {
      xData = xData.slice(0, yData.length);
    } else if (xData.length < yData.length) {
      yData = yData.slice(0, xData.length);
    }

    this.mark_data = _.zip(xData, yData);

    this.update_domains();
    this.trigger('data_updated');
  }

  update_domains() {
    // color scale needs an issue in DateScaleModel to be fixed. It
    // should be moved here as soon as that is fixed.
    const scales = this.getScales();

    if (!this.get('preserve_domain').x && this.mark_data) {
      scales.x.computeAndSetDomain(
        this.mark_data.map((elem) => {
          return elem[0];
        }),
        this.model_id + '_x'
      );
    } else {
      scales.x.delDomain([], this.model_id + '_x');
    }

    if (!this.get('preserve_domain').y && this.mark_data) {
      //The values are sorted, so we are using that to calculate the min/max

      const min = d3.min(
        this.mark_data.map((d) => {
          return d[1][0];
        })
      );
      const max = d3.max(
        this.mark_data.map((d) => {
          const values = d[1];
          return values[values.length - 1];
        })
      );

      scales.y.setDomain([min, max], this.model_id + '_y');
    } else {
      scales.y.delDomain([], this.model_id + '_y');
    }
  }

  static serializers = {
    ...MarkModel.serializers,
    x: serialize.array_or_json_serializer,
    y: serialize.array_or_json_serializer,
  };
}
