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

import { WidgetModel, unpack_models } from '@jupyter-widgets/base';
import { Dict } from '@jupyter-widgets/base';

import { ScaleModel } from 'bqscales';
import * as d3 from 'd3';
import * as serialize from './serialize';
import { semver_range } from './version';

export class MarketMapModel extends WidgetModel {
  defaults() {
    return {
      ...WidgetModel.prototype.defaults(),
      _model_name: 'MarketMapModel',
      _view_name: 'MarketMap',
      _model_module: 'bqplot',
      _view_module: 'bqplot',
      _model_module_version: semver_range,
      _view_module_version: semver_range,

      map_width: 1080,
      map_height: 800,

      names: [],
      groups: [],
      display_text: [],
      ref_data: undefined,
      title: '',

      tooltip_fields: [],
      tooltip_formats: [],
      show_groups: false,

      cols: 0,
      rows: 0,

      row_groups: 1,
      colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
      scales: {},
      axes: [],
      color: [],
      map_margin: {
        top: 50,
        right: 50,
        left: 50,
        bottom: 50,
      },
      preserve_aspect: false,
      stroke: 'white',
      group_stroke: 'black',
      selected_stroke: 'dodgerblue',
      hovered_stroke: 'orangered',
      font_style: {},
      title_style: {},

      selected: [],
      enable_hover: true,
      enable_select: true,
      tooltip_widget: null,
    };
  }

  getScales(): Dict<ScaleModel> {
    return this.get('scales');
  }

  static serializers = {
    ...WidgetModel.serializers,
    scales: { deserialize: unpack_models },
    axes: { deserialize: unpack_models },
    tooltip_widget: { deserialize: unpack_models },
    style: { deserialize: unpack_models },
    layout: { deserialize: unpack_models },
    names: serialize.array_or_json_serializer,
    groups: serialize.array_or_json_serializer,
    display_text: serialize.array_or_json_serializer,
    color: serialize.array_or_json_serializer,
  };
}
