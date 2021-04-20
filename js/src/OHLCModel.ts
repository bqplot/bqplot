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

export type OHLCData = number[][];

export class OHLCModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'OHLCModel',
      _view_name: 'OHLC',

      x: [],
      y: [],
      scales_metadata: {
        x: { orientation: 'horizontal', dimension: 'x' },
        y: { orientation: 'vertical', dimension: 'y' },
      },
      marker: 'candle',
      stroke: null,
      stroke_width: 1.0,
      colors: ['green', 'red'],
      opacities: [],
      format: 'ohlc',
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);

    this.on_some_change(['x', 'y'], this.update_data, this);
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.on('change:format', this.updateFormat, this);
    this.px = { o: -1, h: -1, l: -1, c: -1 };
    this.mark_data = [];
    this.update_data();
    this.update_domains();
    this.updateFormat();
  }

  private updateFormat() {
    this.update_data();
    this.trigger('format_updated');
  }

  update_data() {
    let x = this.get('x');
    let y = this.get('y');
    const format = this.get('format');

    // Local private function to report errors in format
    function printBadFormat(format) {
      if (console) {
        console.error("Invalid OHLC format: '" + format + "'");
      }
    }

    // Generate positional map and check for duplicate characters
    this.px = format
      .toLowerCase()
      .split('')
      .reduce(
        (dict, key, val) => {
          if (dict[key] !== -1) {
            printBadFormat(format);
            x = [];
            y = [];
          }
          dict[key] = val;
          return dict;
        },
        { o: -1, h: -1, l: -1, c: -1 }
      );

    // We cannot have high without low and vice versa
    if (
      (this.px.h !== -1 && this.px.l === -1) ||
      (this.px.h === -1 && this.px.l !== -1) ||
      format.length < 2 ||
      format.length > 4
    ) {
      printBadFormat(format);
      x = [];
      y = [];
    } else {
      // Verify that OHLC data is valid
      const px = this.px;
      if (
        (this.px.h !== -1 &&
          !y.every((d) => {
            return d[px.h] === d3.max(d) && d[px.l] === d3.min(d);
          })) ||
        !y.every((d) => {
          return d.length === format.length;
        })
      ) {
        x = [];
        y = [];
        if (console) {
          console.error('Invalid OHLC data');
        }
      }
    }

    // Make x and y data the same length
    if (x.length > y.length) {
      x = x.slice(0, y.length);
    } else if (x.length < y.length) {
      y = y.slice(0, x.length);
    }

    this.mark_data = _.zip(x, y);
    this.update_domains();
    this.trigger('data_updated');
  }

  update_domains() {
    if (!this.mark_data) {
      return;
    }
    const scales = this.get('scales');
    const xScale = scales.x,
      yScale = scales.y;
    let min_x_dist = Number.POSITIVE_INFINITY;
    let max_y_height = 0;
    let dist = 0;
    let height = 0;

    /*
     * Compute the minimum x distance between the data points. We will
     * use this to pad either side of the x domain.
     * Also compute the maximum height of all of the marks (i.e. maximum
     * distance from high to low) and use that to pad the y domain.
     */
    for (let i = 0; i < this.mark_data.length; i++) {
      if (i > 0) {
        dist = this.mark_data[i][0] - this.mark_data[i - 1][0];
        if (dist < min_x_dist) {
          min_x_dist = dist;
        }
      }
      height = this.mark_data[i][this.px.h] - this.mark_data[i][this.px.l];
      if (height > max_y_height) {
        max_y_height = height;
      }
    }
    if (this.mark_data.length < 2) {
      min_x_dist = 0;
    }

    let min;
    let max;
    // X Scale
    if (!this.get('preserve_domain').x && this.mark_data.length !== 0) {
      if (xScale.type === 'ordinal') {
        xScale.compute_and_set_domain(
          this.mark_data.map((d) => {
            return d[0];
          })
        );
      } else {
        min = d3.min(
          this.mark_data.map((d) => {
            return d[0];
          })
        );
        max = d3.max(
          this.mark_data.map((d) => {
            return d[0];
          })
        );
        if (max instanceof Date) {
          max = max.getTime();
        }
        xScale.set_domain(
          [min - min_x_dist / 2, max + min_x_dist / 2],
          this.model_id + '_x'
        );
      }
    } else {
      xScale.del_domain([], this.model_id + '_x');
    }

    // Y Scale
    if (!this.get('preserve_domain').y && this.mark_data.length !== 0) {
      // Remember that elem contains OHLC data here so we cannot use
      // compute_and_set_domain
      let top = this.px.h;
      let bottom = this.px.l;
      if (top === -1 || bottom === -1) {
        top = this.px.o;
        bottom = this.px.c;
      }
      min = d3.min(
        this.mark_data.map((d) => {
          return d[1][bottom] < d[1][top] ? d[1][bottom] : d[1][top];
        })
      );
      max = d3.max(
        this.mark_data.map((d) => {
          return d[1][top] > d[1][bottom] ? d[1][top] : d[1][bottom];
        })
      );
      if (max instanceof Date) {
        max = max.getTime();
      }
      yScale.set_domain(
        [min - max_y_height, max + max_y_height],
        this.model_id + '_y'
      );
    } else {
      yScale.del_domain([], this.model_id + '_y');
    }
  }

  get_data_dict(data, index) {
    const return_val = {
      index: index,
      x: data.x,
    };

    ['open', 'low', 'high', 'close'].forEach((str) => {
      return_val[str] = data.y[this.px[str.substr(0, 1)]];
    });

    return return_val;
  }

  static serializers = {
    ...MarkModel.serializers,
    x: serialize.array_or_json,
    y: serialize.array_or_json,
  };

  px: { o: number; h: number; l: number; c: number };

  mark_data: OHLCData;
}
