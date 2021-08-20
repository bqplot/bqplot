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
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"), require("d3-scale-chromatic"));
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export interface BinData {
  index: number;
  bin: d3.Bin<number, number>;
}

export class HistModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'HistModel',
      _view_name: 'Hist',
      sample: [],
      count: [],
      scales_metadata: {
        sample: { orientation: 'horizontal', dimension: 'x' },
        count: { orientation: 'vertical', dimension: 'y' },
      },
      bins: 10,
      midpoints: [],
      colors: ['steelblue'],
      stroke: null,
      opacities: [],
      normalized: false,
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);

    this.mark_data = [];
    // For the histogram, changing the "sample" scale changes the "count" values being plotted.
    // Hence, on change of the value of "preserve_domain", we must call the "update_data"
    // function, and not merely "update_domains".
    this.on_some_change(
      ['bins', 'sample', 'preserve_domain'],
      this.update_data,
      this
    );
    this.update_data();
    this.on('change:normalized', () => {
      this.normalizeData(true);
    });
    this.normalizeData(true);
  }

  update_data() {
    const xScale = this.getScales().sample;

    // TODO: This potentially triggers domain_changed and therefore a
    // Draw, while update_data is generally followed by a Draw.
    if (this.sample.length == 0) {
      this.mark_data = [];
      this.xMid = [];
      this.count = [];
      this.xBins = [];
    } else {
      if (!this.get('preserve_domain').sample) {
        xScale.computeAndSetDomain(this.sample, this.model_id + '_sample');
      } else {
        xScale.delDomain([], this.model_id + '_sample');
      }

      this.minX = xScale.domain[0];
      this.maxX = xScale.domain[1];

      const filtered_sample = this.sample.filter(
        (d) => d <= this.maxX && d >= this.minX
      );
      // since x_data may be a TypedArray, explicitly use Array.map
      const x_data_ind = Array.prototype.map.call(filtered_sample, (d, i) => {
        return { index: i, value: d };
      });

      this.xBins = d3.range(
        this.minX,
        this.maxX,
        (this.maxX - this.minX) / this.bins
      );
      this.xMid = this.xBins
        .map((d, i) => {
          return 0.5 * (d + this.xBins[i - 1]);
        })
        .slice(1);

      const bins = d3
        .histogram()
        .thresholds(this.xBins)
        .value((d: any) => {
          return d.value;
        })(x_data_ind);

      this.mark_data = bins.map((bin, index) => {
        return { bin, index };
      });
    }
    this.normalizeData(false);

    this.set('midpoints', this.xMid);
    this.set('count', new Float64Array(this.count));

    this.update_domains();
    this.save_changes();
    this.trigger('data_updated');
  }

  private normalizeData(save_and_update: boolean) {
    this.count = this.mark_data.map((d: BinData) => d.bin.length);

    if (this.get('normalized')) {
      let x_width = 1;
      if (this.mark_data.length > 0) {
        x_width = this.mark_data[0].bin.x1 - this.mark_data[0].bin.x0;
      }

      const sum = this.count.reduce((a, b) => {
        return a + b;
      }, 0);

      if (sum != 0) {
        this.count = this.count.map((a) => {
          return a / (sum * x_width);
        });
      }
    }

    if (save_and_update) {
      this.set('count', new Float64Array(this.count));
      this.update_domains();
      this.save_changes();
      this.trigger('data_updated');
    }
  }

  get_data_dict(data: BinData, index: number) {
    const return_dict: any = {};
    return_dict.midpoint = this.xMid[index];
    return_dict.bin_start = this.xBins[index];
    return_dict.bin_end = this.xBins[index + 1];
    return_dict.index = index;
    return_dict.count = this.count[index];
    return return_dict;
  }

  update_domains() {
    if (!this.mark_data) {
      return;
    }

    // For histogram, changing the x-scale domain changes a lot of
    // things including the data which is to be plotted. So the x-domain
    // change is handled by the update_data function and only the
    // y-domain change is handled by this function.
    const y_scale = this.getScales().count;
    if (!this.get('preserve_domain').count) {
      y_scale.setDomain(
        [0, d3.max(this.count) * 1.05],
        this.model_id + '_count'
      );
    }
  }

  private get sample(): number[] {
    return this.get('sample');
  }

  get bins(): number {
    return this.get('bins');
  }

  static serializers = {
    ...MarkModel.serializers,
    sample: serialize.array_or_json_serializer,
    count: serialize.array_or_json_serializer,
  };

  xBins: number[];
  xMid: number[];
  count: number[];
  minX: number;
  maxX: number;

  mark_data: BinData[];
}
