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

export interface BarGroupValue {
  index: number;
  subIndex: number;
  y0: number;
  y1: number;
  x: number;
  y: number;
  colorIndex: number;
  opacityIndex: number;
  color: string;
}

export interface BarData {
  key: number;
  values: BarGroupValue[];
  posMax: number;
  negMax: number;
}

export class BarsModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'BarsModel',
      _view_name: 'Bars',
      x: [],
      y: [],
      color: null,
      scales_metadata: {
        x: { orientation: 'horizontal', dimension: 'x' },
        y: { orientation: 'vertical', dimension: 'y' },
        color: { dimension: 'color' },
      },
      color_mode: 'auto',
      opacity_mode: 'auto',
      type: 'stacked',
      colors: ['steelblue'],
      padding: 0.05,
      fill: true,
      stroke: null,
      stroke_width: 1,
      base: 0.0,
      opacities: [],
      orientation: 'vertical',
      align: 'center',
      label_display: false,
      label_display_format: '.2f',
      label_display_font_style: {},
      label_display_horizontal_offset: 0.0,
      label_display_vertical_offset: 0.0,
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);
    this.yIs2d = false;
    this.on_some_change(['x', 'y', 'base'], this.update_data, this);
    this.on_some_change(
      ['color', 'opacities', 'color_mode', 'opacity_mode'],
      function () {
        this.update_color();
        this.trigger('colors_updated');
      },
      this
    );
    // FIXME: replace this with on("change:preserve_domain"). It is not done here because
    // on_some_change depends on the GLOBAL backbone on("change") handler which
    // is called AFTER the specific handlers on("change:foobar") and we make this
    // assumption.
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.update_data();
    this.update_color();
    this.update_domains();
  }

  update_data() {
    let x_data = this.get('x');
    let y_data = this.get('y');
    y_data = y_data.length === 0 || !_.isNumber(y_data[0]) ? y_data : [y_data];

    this.baseValue = this.get('base');
    if (this.baseValue === undefined || this.baseValue === null) {
      this.baseValue = 0;
    }

    if (x_data.length === 0 || y_data.length === 0) {
      this.mark_data = [];
      this.yIs2d = false;
    } else {
      x_data = x_data.slice(0, d3.min(y_data.map((d) => d.length)));

      // since x_data may be a TypedArray, explicitly use Array.map
      this.mark_data = Array.prototype.map.call(x_data, (x_elem, index) => {
        const data: any = {};
        data.key = x_elem;

        // split bins into positive ( value > baseValue) and negative, and stack those separately
        // accumulates size/height of histogram values for stacked histograms
        let cumulativePos = this.baseValue;
        let cumulativeNeg = this.baseValue;

        // since y_data may be a TypedArray, explicitly use Array.map
        data.values = Array.prototype.map.call(y_data, (y_elem, y_index) => {
          // y0, y1 are the upper and lower bound of the bars and
          // only relevant for a stacked bar chart. grouped
          // bars only deal with baseValue and y.

          let y0, y1;
          const value = isNaN(y_elem[index])
            ? 0
            : y_elem[index] - this.baseValue;

          if (value >= 0) {
            y0 = cumulativePos;
            if (!isNaN(y_elem[index])) {
              cumulativePos += value;
            }
            y1 = cumulativePos;
          } else {
            // reverse y1 and y0 to not have negative heights
            y1 = cumulativeNeg;
            if (!isNaN(y_elem[index])) {
              cumulativeNeg += value;
            }
            y0 = cumulativeNeg;
          }

          return {
            index: index,
            subIndex: y_index,
            x: x_elem,
            y0,
            y1,
            y: y_elem[index],
          };
        });

        let extremes = [this.baseValue, cumulativeNeg, cumulativePos];
        // posMax is the maximum positive value for a group of
        // bars.
        data.posMax = d3.max(extremes);
        // negMax is the minimum negative value for a group of
        // bars.
        data.negMax = d3.min(extremes);
        return data;
      });
      this.yIs2d = this.mark_data[0].values.length > 1;
      this.update_color();
    }
    this.update_domains();
    this.trigger('data_updated');
  }

  get_data_dict(data, index) {
    return data;
  }

  update_color() {
    //Function to update the color attribute for the data. In scatter,
    //this is taken care of by the update_data itself. This is separate
    //in bars because update data does a lot more complex calculations
    //which should be avoided when possible
    if (!this.mark_data) {
      return;
    }
    const color = this.get('color') || [];
    const color_scale = this.getScales().color;
    const color_mode = this.get('color_mode');
    const apply_color_to_groups =
      color_mode === 'group' || (color_mode === 'auto' && !this.yIs2d);
    const apply_color_to_group_element =
      color_mode === 'element' || (color_mode === 'auto' && this.yIs2d);

    const opacity_mode = this.get('opacity_mode');
    const apply_opacity_to_groups =
      opacity_mode === 'group' || (opacity_mode === 'auto' && !this.yIs2d);
    const apply_opacity_to_group_element =
      opacity_mode === 'element' || (opacity_mode === 'auto' && this.yIs2d);

    let element_idx = 0;
    this.mark_data.forEach((single_bar_d, bar_grp_index) => {
      single_bar_d.values.forEach((bar_d, bar_index) => {
        bar_d.colorIndex = apply_color_to_groups
          ? bar_grp_index
          : apply_color_to_group_element
          ? bar_index
          : element_idx;
        bar_d.opacityIndex = apply_opacity_to_groups
          ? bar_grp_index
          : apply_opacity_to_group_element
          ? bar_index
          : element_idx;
        bar_d.color = color[bar_d.colorIndex];

        element_idx++;
      });
    });

    if (color_scale && color.length > 0) {
      if (!this.get('preserve_domain').color) {
        color_scale.computeAndSetDomain(color, this.model_id + '_color');
      } else {
        color_scale.delDomain([], this.model_id + '_color');
      }
    }
  }

  update_domains() {
    if (!this.mark_data) {
      return;
    }
    const scales = this.getScales();
    const dom_scale = scales.x;
    const range_scale = scales.y;

    if (!this.get('preserve_domain').x) {
      dom_scale.computeAndSetDomain(
        this.mark_data.map((elem) => {
          return elem.key;
        }),
        this.model_id + '_x'
      );
    } else {
      dom_scale.delDomain([], this.model_id + '_x');
    }

    if (!this.get('preserve_domain').y) {
      if (this.get('type') === 'stacked') {
        range_scale.computeAndSetDomain(
          [
            d3.min(this.mark_data, (c: any) => {
              return c.negMax;
            }),
            d3.max(this.mark_data, (c: any) => {
              return c.posMax;
            }),
            this.baseValue,
          ],
          this.model_id + '_y'
        );
      } else {
        const min = d3.min(this.mark_data, (c: any) => {
          return d3.min(c.values, (val: any) => {
            return val.yRef;
          });
        });
        const max = d3.max(this.mark_data, (c: any) => {
          return d3.max(c.values, (val: any) => {
            return val.yRef;
          });
        });
        range_scale.computeAndSetDomain(
          [min, max, this.baseValue],
          this.model_id + '_y'
        );
      }
    } else {
      range_scale.delDomain([], this.model_id + '_y');
    }
  }

  static serializers = {
    ...MarkModel.serializers,
    x: serialize.array_or_json_serializer,
    y: serialize.array_or_json_serializer,
    color: serialize.array_or_json_serializer,
  };

  yIs2d: boolean;
  baseValue: number;
  mark_data: BarData[];
}
