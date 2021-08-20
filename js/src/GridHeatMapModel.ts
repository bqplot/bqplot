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

import * as _ from 'underscore';
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export interface GridCellData {
  rowNum: number;
  row: number;
  column: number;
  columnNum: number;
  color: number;
  cellNum: number;
}

export enum AxisMode {
  Middle,
  Boundaries,
  ExpandOne,
  ExpandTwo,
}

export class GridHeatMapModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'GridHeatMapModel',
      _view_name: 'GridHeatMap',
      row: null,
      column: null,
      color: null,
      scales_metadata: {
        row: { orientation: 'vertical', dimension: 'y' },
        column: { orientation: 'horizontal', dimension: 'x' },
        color: { dimension: 'color' },
      },
      row_align: 'start',
      column_align: 'start',
      null_color: 'black',
      stroke: 'black',
      opacity: 1.0,
      anchor_style: {},
      display_format: null,
      font_style: {},
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);
    this.on_some_change(['row', 'column', 'color'], this.update_data, this);
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.update_data();
    this.update_domains();
  }

  update_data() {
    this.dirty = true;
    // Handling data updates
    const numCols = this.colors[0].length;

    const flatColors = [].concat.apply(
      [],
      this.colors.map((x) => Array.prototype.slice.call(x, 0))
    );

    this.mark_data = flatColors.map((data, index) => {
      const rowNum = Math.floor(index / numCols);
      const colNum = index % numCols;

      return {
        rowNum: rowNum,
        row: this.rows[rowNum],
        column: this.columns[colNum],
        columnNum: colNum,
        color: data,
        cellNum: index,
      };
    });
    this.identifyModes();
    this.update_domains();
    this.dirty = false;
    this.trigger('data_updated');
  }

  update_domains() {
    if (!this.mark_data) {
      return;
    }
    const scales = this.getScales();
    const y_scale = scales.row,
      x_scale = scales.column;
    const color_scale = scales.color;

    if (!this.get('preserve_domain').row) {
      y_scale.computeAndSetDomain(this.rows, this.model_id + '_row');
    } else {
      y_scale.delDomain([], this.model_id + '_row');
    }

    if (!this.get('preserve_domain').column) {
      x_scale.computeAndSetDomain(this.columns, this.model_id + '_column');
    } else {
      x_scale.delDomain([], this.model_id + '_column');
    }
    if (color_scale !== null && color_scale !== undefined) {
      if (!this.get('preserve_domain').color) {
        color_scale.computeAndSetDomain(
          this.mark_data.map((elem) => elem.color),
          this.model_id + '_color'
        );
      } else {
        color_scale.delDomain([], this.model_id + '_color');
      }
    }
  }

  get_data_dict(data, index) {
    return data;
  }

  get colors(): number[][] {
    if (this.get('color')) {
      return this.get('color');
    }

    return [[]];
  }

  get rows(): number[] {
    if (this.get('row')) {
      return Array.from(this.get('row'));
    }

    return _.range(this.colors.length);
  }

  get columns(): number[] {
    if (this.get('column')) {
      return Array.from(this.get('column'));
    }

    return _.range(this.colors[0].length);
  }

  private identifyModes() {
    //based on the data, identify the mode in which the heatmap should
    //be plotted.
    const scales = this.getScales();
    const rowScale = scales.row;
    const columnScale = scales.column;
    const nRows = this.colors.length;
    const nColumns = this.colors[0].length;
    this.modes = { column: AxisMode.Middle, row: AxisMode.Middle };

    if (rowScale.type === 'ordinal') {
      this.modes.row = AxisMode.Middle;
    } else {
      if (nRows === this.rows.length - 1) {
        this.modes.row = AxisMode.Boundaries;
      } else if (nRows === this.rows.length) {
        this.modes.row = AxisMode.ExpandOne;
      } else if (nRows === this.rows.length + 1) {
        this.modes.row = AxisMode.ExpandTwo;
      }
    }
    if (columnScale.type === 'ordinal') {
      this.modes.column = AxisMode.Middle;
    } else {
      if (nColumns === this.columns.length - 1) {
        this.modes.column = AxisMode.Boundaries;
      } else if (nColumns === this.columns.length) {
        this.modes.column = AxisMode.ExpandOne;
      } else if (nColumns === this.columns.length + 1) {
        this.modes.column = AxisMode.ExpandTwo;
      }
    }
  }

  static serializers = {
    ...MarkModel.serializers,
    row: serialize.array_or_json_serializer,
    column: serialize.array_or_json_serializer,
    color: serialize.array_or_json_serializer,
  };

  modes: { column: AxisMode; row: AxisMode };
  mark_data: GridCellData[];
}
