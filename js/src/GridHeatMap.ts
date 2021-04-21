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
import { d3GetEvent } from './utils';
import * as _ from 'underscore';
import { Mark } from './Mark';
import { GridCellData, AxisMode, GridHeatMapModel } from './GridHeatMapModel';
import { applyStyles } from './utils';

export class GridHeatMap extends Mark {
  async render() {
    const base_render_promise = super.render();

    // TODO: create_listeners is put inside the promise success handler
    // because some of the functions depend on child scales being
    // created. Make sure none of the event handler functions make that
    // assumption.
    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    this.selected_indices = this.model.get('selected');
    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');
    this.anchorStyle = this.model.get('anchor_style');
    this.display_el_classes = ['heatmapcell'];

    await base_render_promise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
    this.draw();
  }

  initialize_additional_scales() {
    if (this.scales.color) {
      this.listenTo(
        this.scales.color,
        'domain_changed',
        this.apply_styles.bind(this)
      );
      this.scales.color.on(
        'color_scale_range_changed',
        this.apply_styles,
        this
      );
    }
  }

  set_ranges() {
    if (this.scales.row) {
      this.scales.row.set_range(
        this.parent.padded_range('y', this.scales.row.model)
      );
    }

    if (this.scales.column) {
      this.scales.column.set_range(
        this.parent.padded_range('x', this.scales.column.model)
      );
    }
  }

  set_positional_scales() {
    this.listenTo(this.scales.column, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
    this.listenTo(this.scales.row, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
  }

  private expandScaleDomain(
    scale,
    data: number[],
    mode: AxisMode,
    start: boolean
  ) {
    // This function expands the domain so that the heatmap has the
    // minimum area needed to draw itself.
    let currentPixels;
    let minDiff;

    if (mode === AxisMode.ExpandOne) {
      currentPixels = data.map((el) => scale.scale(el));
      const diffs = currentPixels
        .slice(1)
        .map((el: number, index: number) => el - currentPixels[index]);

      //TODO: Explain what is going on here.
      minDiff = 0;
      if (diffs[0] < 0) {
        start = !start;
        // diffs are negative. So max instead of min
        minDiff = d3.max(diffs);
      } else {
        minDiff = d3.min(diffs);
      }
      if (start) {
        const newPixel = currentPixels[currentPixels.length - 1] + minDiff;
        return [data[0], scale.invert(newPixel)];
      } else {
        const newPixel = currentPixels[0] - minDiff;
        return [scale.invert(newPixel), data[currentPixels.length - 1]];
      }
    } else if (mode === AxisMode.ExpandTwo) {
      currentPixels = data.map((el) => scale.scale(el));
      minDiff = d3.min(
        currentPixels
          .slice(1)
          .map((el: number, index: number) => el - currentPixels[index])
      );
      const newEnd = currentPixels[currentPixels.length - 1] + minDiff;
      const newStart = currentPixels[0] - minDiff;
      return [scale.invert(newStart), scale.invert(newEnd)];
    }
  }

  get numRows(): number {
    return this.model.colors.length;
  }

  get numColumns(): number {
    return this.model.colors[0].length;
  }

  create_listeners(): void {
    super.create_listeners();

    this.listenTo(this.model, 'change:stroke', this.updateStroke);
    this.listenTo(this.model, 'change:opacity', this.updateOpacity);

    this.d3el
      .on('mouseover', () => this.event_dispatcher('mouse_over'))
      .on('mousemove', () => this.event_dispatcher('mouse_move'))
      .on('mouseout', () => this.event_dispatcher('mouse_out'));
    this.listenTo(this.parent, 'bg_clicked', () =>
      this.event_dispatcher('parent_clicked')
    );

    this.listenTo(this.model, 'data_updated', this.draw);
    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.model.on_some_change(
      ['display_format', 'font_style'],
      this.updateLabels,
      this
    );
    this.listenTo(this.model, 'change:selected', this.updateSelected);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
  }

  private handleClick(args) {
    const index = args.rowNum * this.numColumns + args.columnNum;
    const row = args.rowNum;
    const column = args.columnNum;
    let idx: [number, number][] = Array.from(this.model.get('selected') || []);
    let selected = this.indicesToCellNums(idx);
    const elem_index = selected.indexOf(index);
    const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
    //TODO: This is a shim for when accelKey is supported by chrome.
    // index of slice i. Checking if it is already present in the
    // list
    if (elem_index > -1 && accelKey) {
      // if the index is already selected and if ctrl key is
      // pressed, remove the element from the list
      idx.splice(elem_index, 1);
    } else {
      if (!accelKey) {
        selected = [];
        idx = [];
      }
      idx.push([row, column]);
      selected.push(this.indicesToCellNums([[row, column]])[0]);
      if (d3GetEvent().shiftKey) {
        //If shift is pressed and the element is already
        //selected, do not do anything
        if (elem_index > -1) {
          return;
        }
        //Add elements before or after the index of the current
        //slice which has been clicked
        const row_index = selected.length !== 0 ? this.anchorCellIndex[0] : row;
        const col_index =
          selected.length !== 0 ? this.anchorCellIndex[1] : column;
        _.range(Math.min(row, row_index), Math.max(row, row_index) + 1).forEach(
          (i) => {
            _.range(
              Math.min(column, col_index),
              Math.max(column, col_index) + 1
            ).forEach((j) => {
              const cell_num = this.indicesToCellNums([[i, j]])[0];
              if (selected.indexOf(cell_num) === -1) {
                selected.push(cell_num);
                idx.push([i, j]);
              }
            });
          }
        );
      } else {
        // updating the array containing the slice indexes selected
        // and updating the style
        this.anchorCellIndex = [row, column];
      }
    }

    this.model.set('selected', idx.length === 0 ? null : idx, {
      updated_view: this,
    });
    this.touch();

    let e = d3GetEvent();
    if (!e) {
      e = window.event;
    }
    if (e.cancelBubble !== undefined) {
      // IE
      e.cancelBubble = true;
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();

    this.selected_indices = idx;
    this.apply_styles();
  }

  private updateSelected() {
    this.selected_indices = this.model.get('selected');
    this.apply_styles();
  }

  set_style_on_elements(style, indices, elements) {
    // If the index array is undefined or of length=0, exit the
    // function without doing anything
    if (
      !indices ||
      (indices.length === 0 && (!elements || elements.length === 0))
    ) {
      return;
    }
    // Also, return if the style object itself is blank
    if (Object.keys(style).length === 0) {
      return;
    }
    elements =
      !elements || elements.length === 0
        ? this.filterCellsByNum(this.indicesToCellNums(indices))
        : elements;
    applyStyles(elements, style);
  }

  set_default_style(indices, elements) {
    // For all the elements with index in the list indices, the default
    // style is applied.
    if (
      !indices ||
      (indices.length === 0 && (!elements || elements.length === 0))
    ) {
      return;
    }
    elements =
      !elements || elements.length === 0
        ? this.filterCellsByNum(this.indicesToCellNums(indices))
        : elements;
    const stroke = this.model.get('stroke');
    const opacity = this.model.get('opacity');

    elements
      .style('fill', (d) => this.get_element_fill(d))
      .style('opacity', opacity)
      .style('stroke', stroke);
  }

  clear_style(style_dict, indices?, elements?) {
    // Function to clear the style of a dict on some or all the elements of the
    // chart. If indices is null, clears the style on all elements. If
    // not, clears on only the elements whose indices are matching.
    //
    // If elements are passed, then indices are ignored and the style
    // is cleared only on the elements that are passed.
    //
    // This can be used if we decide to accommodate more properties than
    // those set by default. Because those have to cleared specifically.
    //
    if (Object.keys(style_dict).length === 0) {
      // No style to clear
      return;
    }

    if (!elements || elements.length === 0) {
      if (indices) {
        elements = this.filterCellsByNum(this.indicesToCellNums(indices));
      } else {
        elements = this.displayCells;
      }
    }

    const clearing_style = {};
    for (let key in style_dict) {
      clearing_style[key] = null;
    }
    applyStyles(elements, clearing_style);
  }

  private filterCellsByNum(
    cell_numbers: number[]
  ): d3.Selection<any, any, any, any> {
    if (cell_numbers === null || cell_numbers === undefined) {
      // FIXME: return an empty selection
      return this.d3el.selectAll('thisNameDoesntExist');
    }

    return this.displayCells.filter(
      (el: GridCellData) => cell_numbers.indexOf(el.cellNum) !== -1
    );
  }

  selected_style_updated(model, style) {
    this.selected_style = style;
    this.clear_style(
      model.previous('selected_style'),
      this.selected_indices,
      this.selectedElements
    );
    this.style_updated(style, this.selected_indices, this.selectedElements);
  }

  unselected_style_updated(model, style) {
    this.unselected_style = style;
    this.clear_style(
      model.previous('unselected_style'),
      [],
      this.unselectedElements
    );
    this.style_updated(style, [], this.unselectedElements);
  }

  apply_styles() {
    this.clear_style(this.selected_style);
    this.clear_style(this.unselected_style);
    this.clear_style(this.anchorStyle);

    this.set_default_style([], this.displayCells);

    const selected_cell_nums = this.indicesToCellNums(
      this.selected_indices as [number, number][]
    );
    const unsel_cell_nums =
      selected_cell_nums === null || selected_cell_nums.length === 0
        ? []
        : _.difference(
            _.range(this.numRows * this.numColumns),
            selected_cell_nums
          );

    this.selectedElements = this.filterCellsByNum(selected_cell_nums);
    this.set_style_on_elements(
      this.selected_style,
      this.selected_indices,
      this.selectedElements
    );

    this.unselectedElements = this.filterCellsByNum(unsel_cell_nums);
    this.set_style_on_elements(
      this.unselected_style,
      [],
      this.unselectedElements
    );

    if (this.anchorCellIndex !== null && this.anchorCellIndex !== undefined) {
      const anchorNum = this.indicesToCellNums([this.anchorCellIndex]);
      this.set_style_on_elements(
        this.anchorStyle,
        [],
        this.filterCellsByNum(anchorNum)
      );
    }
  }

  style_updated(new_style, indices, elements) {
    // reset the style of the elements and apply the new style
    this.set_default_style(indices, elements);
    this.set_style_on_elements(new_style, indices, elements);
  }

  private resetSelection() {
    this.model.set('selected', null);
    this.touch();
    this.selected_indices = null;
    this.clear_style(this.selected_style);
    this.clear_style(this.unselected_style);
    this.clear_style(this.anchorStyle);

    this.set_default_style([], this.displayCells);
  }

  relayout() {
    this.set_ranges();
    this.compute_view_padding();
    //TODO: The call to draw has to be changed to something less
    //expensive.
    this.draw();
  }

  private indicesToCellNums(indices: [number, number][]): number[] {
    if (indices === null || indices === undefined) {
      return null;
    }

    return indices.map((i) => i[0] * this.numColumns + i[1]);
  }

  invert_point(pixel) {
    // For now, an index selector is not supported for the heatmap
  }

  selector_changed(point_selector, rect_selector) {
    if (point_selector === undefined) {
      this.model.set('selected', null);
      this.touch();
      return [];
    }
    const rowIndices = _.range(this.numRows);
    const colIndices = _.range(this.numColumns);
    const selCols = _.filter(colIndices, (index) => {
      return rect_selector([this.columnPixels[index], []]);
    });
    const selRows = _.filter(rowIndices, (index) => {
      return rect_selector([[], this.rowPixels[index]]);
    });
    let selected = selCols.map((s) => {
      return selRows.map((r) => [r, s]);
    });
    // @ts-ignore
    selected = _.flatten(selected, true);
    this.model.set('selected', selected);
    this.touch();
  }

  draw() {
    this.set_ranges();

    const rowScale = this.scales.row;
    const columnScale = this.scales.column;

    const rowStartAligned = this.model.get('row_align') === 'start';
    const colStartAligned = this.model.get('column_align') === 'start';
    let new_domain;

    if (
      this.model.modes.row !== AxisMode.Middle &&
      this.model.modes.row !== AxisMode.Boundaries
    ) {
      new_domain = this.expandScaleDomain(
        rowScale,
        this.model.rows,
        this.model.modes.row,
        rowStartAligned
      );
      if (
        d3.min(new_domain) < d3.min(rowScale.model.domain) ||
        d3.max(new_domain) > d3.max(rowScale.model.domain)
      ) {
        // Update domain if domain has changed
        rowScale.model.compute_and_set_domain(
          new_domain,
          rowScale.model.model_id
        );
      }
    }

    if (
      this.model.modes.column !== AxisMode.Middle &&
      this.model.modes.column !== AxisMode.Boundaries
    ) {
      new_domain = this.expandScaleDomain(
        columnScale,
        this.model.columns,
        this.model.modes.column,
        colStartAligned
      );
      if (
        d3.min(new_domain) < d3.min(columnScale.model.domain) ||
        d3.max(new_domain) > d3.max(columnScale.model.domain)
      ) {
        // Update domain if domain has changed
        columnScale.model.compute_and_set_domain(
          new_domain,
          columnScale.model.model_id
        );
      }
    }

    const rowPlotData = this.getTilePlottingData(
      rowScale,
      this.model.rows,
      this.model.modes.row,
      rowStartAligned
    );
    const columnPlotData = this.getTilePlottingData(
      columnScale,
      this.model.columns,
      this.model.modes.column,
      colStartAligned
    );

    this.rowPixels = rowPlotData.start.map((d, i) => [
      d,
      d + rowPlotData.widths[i],
    ]);
    this.columnPixels = columnPlotData.start.map((d, i) => [
      d,
      d + columnPlotData.widths[i],
    ]);

    this.displayRows = this.d3el
      .selectAll('.heatmaprow')
      .data(_.range(this.numRows))
      .join('g')
      .attr('class', 'heatmaprow')
      .attr('transform', (d: number) => {
        return 'translate(0, ' + rowPlotData.start[d] + ')';
      });

    const dataArray = _.range(this.numRows).map((row) => {
      return _.range(this.numColumns).map(
        (col) => this.model.mark_data[row * this.numColumns + col]
      );
    });

    this.displayCells = this.displayRows
      .selectAll('.heatmapcell')
      .data((d, i: number) => dataArray[i])
      .join('rect')
      .attr('class', 'heatmapcell')
      .on('click', () => this.event_dispatcher('element_clicked'));

    this.displayCells
      .attr('x', (d, i: number) => columnPlotData.start[i])
      .attr('y', 0)
      .attr('width', (d, i: number) => columnPlotData.widths[i])
      .attr('height', (d: GridCellData) => rowPlotData.widths[d.rowNum]);

    // cell labels
    this.displayRows
      .selectAll('.heatmapcell_label')
      .data((d, i: number) => dataArray[i])
      .join('text')
      .attr('class', 'heatmapcell_label')
      .attr(
        'x',
        (d, i) => columnPlotData.start[i] + columnPlotData.widths[i] / 2
      )
      .attr('y', (d: GridCellData) => rowPlotData.widths[d.rowNum] / 2)
      .style('text-anchor', 'middle')
      .style('fill', 'black')
      .style('pointer-events', 'none')
      .style('dominant-baseline', 'central');

    this.apply_styles();
    this.updateLabels();

    this.displayCells.on('click', (d: GridCellData, i: number) => {
      return this.event_dispatcher('element_clicked', {
        data: d.color,
        index: i,
        rowNum: d.rowNum,
        columnNum: d.columnNum,
      });
    });
  }

  private updateStroke() {
    this.displayCells.style('stroke', this.model.get('stroke'));
  }

  private updateOpacity() {
    this.displayCells.style('opacity', this.model.get('opacity'));
  }

  private updateLabels() {
    const displayFormatStr = this.model.get('display_format');
    const displayFormat = displayFormatStr ? d3.format(displayFormatStr) : null;

    let fonts = this.d3el
      .selectAll('.heatmapcell_label')
      .text((d: GridCellData, i) => {
        return displayFormat ? displayFormat(d.color) : null;
      });

    const fontStyle = this.model.get('font_style');
    for (const styleKey in fontStyle) {
      fonts = fonts.style(styleKey, fontStyle[styleKey]);
    }
  }

  private getTilePlottingData(
    scale,
    data: number[],
    mode: AxisMode,
    start: boolean
  ): { start: number[]; widths: number[] } {
    // This function returns the starting points and widths of the
    // cells based on the parameters passed.
    //
    // scale is the scale and data is the data for which the plot data
    // is to be generated. mode refers to the expansion of the data to
    // generate the plotting data and start is a boolean indicating the
    // alignment of the data w.r.t the cells.
    let startPoints = data.map((d) => scale.scale(d));
    let widths = [];
    data = Array.from(data); // copy to Array

    if (mode === AxisMode.Middle) {
      widths = data.map((d) => scale.scale.bandwidth());
    }

    if (mode === AxisMode.Boundaries) {
      const pixelPoints = data.map((d) => scale.scale(d));

      for (let i = 1; i < pixelPoints.length; ++i) {
        widths[i - 1] = Math.abs(pixelPoints[i] - pixelPoints[i - 1]);
      }

      startPoints =
        pixelPoints[1] > pixelPoints[0]
          ? pixelPoints.slice(0, -1)
          : pixelPoints.slice(1);
    }

    if (mode === AxisMode.ExpandOne) {
      let bounds;

      if (start) {
        widths = startPoints.slice(1).map((d, ind) => {
          // Absolute value is required as the order of the data
          // can be increasing or decreasing in terms of pixels
          return Math.abs(d - startPoints[ind]);
        });

        // Now we have n-1 widths. We have to add the last or the
        // first width depending on scale is increasing or
        // decreasing.
        bounds = d3.max(scale.scale.range());
        if (startPoints[0] < startPoints[1]) {
          widths = Array.prototype.concat(widths, [
            Math.abs(bounds - d3.max(startPoints)),
          ]);
        } else {
          widths = Array.prototype.concat(
            [Math.abs(bounds - d3.max(startPoints))],
            widths
          );
        }
      } else {
        widths = startPoints.slice(1).map((d, ind) => {
          // Absolute value is required as the order of the data
          // can be increasing or decreasing in terms of pixels
          return Math.abs(d - startPoints[ind]);
        });

        bounds = d3.min(scale.scale.range());
        bounds = d3.min(scale.scale.range());
        if (startPoints[1] > startPoints[0]) {
          // The point corresponding to the bounds is added at
          // the start of the array. Hence it has to be added to
          // the startPoints and the last start_point can be
          // removed.
          startPoints.unshift(Math.abs(bounds));
          widths.splice(0, 0, startPoints[1] - startPoints[0]);
          startPoints.pop();
        } else {
          // The point for the bounds is added to the end of the
          // array. The first start point can now be removed as
          // this will be the last end point.
          widths = Array.prototype.concat(widths, [
            Math.abs(bounds - startPoints.slice(-1)[0]),
          ]);
          startPoints = Array.prototype.concat(startPoints, bounds);
          startPoints.splice(0, 1);
        }
      }
    }

    if (mode === AxisMode.ExpandTwo) {
      const isPositive = startPoints[1] - startPoints[0] > 0;
      let bound: number = isPositive
        ? d3.min(scale.scale.range() as number[])
        : d3.max(scale.scale.range() as number[]);

      startPoints.splice(0, 0, bound);
      widths = startPoints
        .slice(1)
        .map((d, ind) => Math.abs(d - startPoints[ind]));
      bound = isPositive
        ? d3.max(scale.scale.range() as number[])
        : d3.min(scale.scale.range() as number[]);
      widths[widths.length] = Math.abs(bound - startPoints.slice(-1)[0]);
    }

    return { start: startPoints, widths };
  }

  get_element_fill(dat) {
    if (dat.color === null) {
      return this.model.get('null_color');
    }
    return this.scales.color.scale(dat.color);
  }

  process_click(interaction) {
    super.process_click(interaction);

    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.resetSelection;
      this.event_listeners.element_clicked = this.handleClick;
    }
  }

  compute_view_padding() {}

  private anchorStyle: { [key: string]: string };
  private anchorCellIndex: [number, number];
  private displayCells: d3.Selection<any, any, any, any>;
  private displayRows: d3.Selection<any, number, HTMLElement, any>;
  private selectedElements: d3.Selection<any, any, any, any>;
  private unselectedElements: d3.Selection<any, any, any, any>;
  private rowPixels: [number, number][];
  private columnPixels: [number, number][];

  model: GridHeatMapModel;
}
