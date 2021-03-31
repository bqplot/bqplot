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
const d3GetEvent = function () {
  return require('d3-selection').event;
}.bind(this);
import * as _ from 'underscore';
import { Mark } from './Mark';
import { BoxplotModel } from './BoxplotModel';
import { applyStyles } from './utils';

interface BoxPlotData {
  whiskerMax: number;
  whiskerMin: number;
  x: number;
  boxUpper: number;
  boxLower: number;
  boxMedian: number;
  dataDict: {
    x: number;
    q1: number;
    q3: number;
    median: number;
  };
}

interface PointType {
  x: number;
  y: number;
}

export class Boxplot extends Mark {
  async render() {
    const base_creation_promise = super.render.apply(this);

    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');

    this.display_el_classes = ['box'];

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    await base_creation_promise;

    this.event_listeners = {};
    this.create_listeners();
    this.process_interactions();
    this.draw();
  }

  set_ranges() {
    const xScale = this.scales.x;
    if (xScale) {
      xScale.set_range(this.parent.padded_range('x', xScale.model));
    }

    const yScale = this.scales.y;
    if (yScale) {
      yScale.set_range(this.parent.padded_range('y', yScale.model));
    }
  }

  set_positional_scales() {
    const x_scale = this.scales.x;
    this.listenTo(x_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw();
      }
    });

    const y_scale = this.scales.y;
    this.listenTo(y_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw();
      }
    });
  }

  create_listeners() {
    super.create_listeners.apply(this);

    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.listenTo(this.model, 'change:stroke', this.updateStroke);
    this.listenTo(this.model, 'change:opacities', this.updateOpacities);
    this.listenTo(
      this.model,
      'change:outlier_fill_color',
      this.updateOutlierFillColor
    );
    this.listenTo(this.model, 'change:box_fill_color', this.updateBoxFillColor);
    this.listenTo(this.model, 'data_updated', this.draw);
    this.listenTo(this.model, 'change:box_width', this.updateBoxWidth);
    this.listenTo(this.model, 'change:selected', this.updateSelected);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.parent, 'bg_clicked', () => {
      this.event_dispatcher('parent_clicked');
    });
  }

  private updateStroke() {
    const stroke = this.model.get('stroke');

    this.d3el
      .selectAll('.boxplot')
      .selectAll('path, rect')
      .style('stroke', stroke);

    this.d3el.selectAll('.outlier').style('stroke', stroke);

    if (this.legendEl) {
      this.legendEl.selectAll('path').attr('stroke', stroke);
      this.legendEl.selectAll('text').style('fill', stroke);
    }
  }

  private updateOutlierFillColor() {
    this.d3el
      .selectAll('.outlier')
      .style('fill', this.model.get('outlier_fill_color'));
  }

  private updateBoxFillColor() {
    this.d3el.selectAll('.box').style('fill', this.model.get('box_fill_color'));
  }

  private updateOpacities() {
    this.d3el
      .selectAll('.boxplot')
      .style('opacity', (d, i: number) => this.get_mark_opacity(d, i));

    if (this.legendEl) {
      this.legendEl
        .selectAll('path')
        .attr('opacity', (d, i: number) => this.get_mark_opacity(d, i));
    }
  }

  private getBoxWidth() {
    let width = this.model.get('box_width');

    // null box_width means auto calculated box width
    if (!width) {
      const plotWidth = this.parent.plotarea_width;
      const maxWidth = plotWidth / 10.0;
      width = plotWidth / (this.model.mark_data.length + 1) / 1.5;
      width = Math.min(width, maxWidth);
    }

    return width;
  }

  compute_view_padding() {
    //This function sets the padding for the view through the constiables
    //xPadding and y_padding which are view specific paddings in pixel
    const xPadding = this.getBoxWidth() / 2.0 + 1;
    if (xPadding !== this.xPadding) {
      this.xPadding = xPadding;
      this.trigger('mark_padding_updated');
    }
  }

  private updateBoxWidth() {
    this.compute_view_padding();
    this.draw();
  }

  set_style_on_elements(style, indices) {
    if (indices === undefined || indices.length === 0) {
      return;
    }
    let elements = this.d3el.selectAll('.box');
    elements = elements.filter((data, index) => {
      return indices.indexOf(index) != -1;
    });
    applyStyles(elements, style);
  }

  set_default_style(indices) {
    // For all the elements with index in the list indices, the default
    // style is applied.
    this.updateOutlierFillColor();
    this.updateBoxFillColor();
    this.updateStroke();
    this.updateOpacities();
  }

  clear_style(style_dict, indices) {
    let elements = this.d3el.selectAll('.boxplot');
    if (indices !== undefined) {
      elements = elements.filter((d, index) => {
        return indices.indexOf(index) != -1;
      });
    }

    const clearingStyle = {};
    for (const key in style_dict) {
      clearingStyle[key] = null;
    }

    applyStyles(elements, clearingStyle);
  }

  style_updated(new_style, indices) {
    this.set_default_style(indices);
    this.set_style_on_elements(new_style, indices);
  }

  selected_style_updated(model, style) {
    this.selected_style = style;
    this.style_updated(style, this.selected_indices);
  }

  unselected_style_updated(model, style) {
    this.unselected_style = style;

    const unselectedIndices = this.selected_indices
      ? _.range(this.model.mark_data.length).filter((index) => {
          return this.selected_indices.indexOf(index) == -1;
        })
      : [];
    this.style_updated(style, unselectedIndices);
  }

  //FIXME: should use the selected_style logic
  private updateSelectedColors(selected_indices) {
    this.d3el.selectAll('.boxplot').style('stroke', this.model.get('stroke'));
  }

  selector_changed(point_selector, rect_selector) {
    if (point_selector === undefined) {
      this.model.set('selected', null);
      this.touch();
      this.updateSelectedColors([]);
      return [];
    }

    const indices = new Uint32Array(_.range(this.pixelCoords.length));
    const selected = indices.filter((index) =>
      rect_selector(this.pixelCoords[index])
    );
    this.updateSelectedColors(selected);
    this.model.set('selected', selected);
    this.touch();
  }

  invert_point(pixel) {
    if (pixel === undefined) {
      this.updateSelectedColors([]);
      this.model.set('selected', null);
      this.touch();
      return;
    }

    const absDiff = this.xPixels.map((elem) => {
      return Math.abs(elem - pixel);
    });
    const selIndex = absDiff.indexOf(d3.min(absDiff));

    this.model.set('selected', new Uint32Array([selIndex]));
    this.updateSelectedColors([selIndex]);
    this.touch();
    return selIndex;
  }

  private prepareBoxPlots() {
    // Sets plot data on this.plotData and this.outlierData
    const autoDetectOutliers = this.model.get('auto_detect_outliers') !== false;

    // convert the domain data to the boxes to be drawn on the screen
    // find the quantiles, min/max and outliers for the box plot
    this.plotData = [];
    this.outlierData = [];
    for (let i = 0; i < this.model.mark_data.length; ++i) {
      const values = this.model.mark_data[i];

      const dataDict = {
        x: values[0],
        q1: d3.quantile(values[1], 0.25),
        q3: d3.quantile(values[1], 0.75),
        median: d3.quantile(values[1], 0.5),
      };

      const x = this.scales.x.scale(dataDict.x);
      const boxUpper = this.scales.y.scale(dataDict.q3);
      const boxLower = this.scales.y.scale(dataDict.q1);
      const boxMedian = this.scales.y.scale(dataDict.median);

      // The domain Y to screen Y is an inverse scale, so be aware of that
      // The max from the domain Y becomes min on the screen (display) scale
      const iqr = boxLower - boxUpper;
      const lowerBound = boxLower + 1.5 * iqr;
      const upperBound = boxUpper - 1.5 * iqr;

      let whiskerMax = Number.MAX_VALUE;
      let whiskerMin = Number.MIN_VALUE;

      for (let j = 0; j < values[1].length; ++j) {
        const plotY = this.scales.y.scale(values[1][j]);

        // Find the outlier
        if (autoDetectOutliers && (plotY > lowerBound || plotY < upperBound)) {
          this.outlierData.push({
            x: this.scales.x.scale(values[0]),
            y: plotY,
          });
        } else {
          // Find the whisker points max and min from normal data.
          // ( exclude the outliers )
          if (plotY > whiskerMin) {
            whiskerMin = plotY;
          }

          if (plotY < whiskerMax) {
            whiskerMax = plotY;
          }
        }
      }

      this.plotData.push({
        x,
        boxLower,
        boxMedian,
        boxUpper,
        whiskerMin,
        whiskerMax,
        dataDict,
      });
    }
  }

  process_click(interaction: string) {
    super.process_click(interaction);

    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.resetSelection;
      this.event_listeners.element_clicked = this.boxClickHandler;
    }
  }

  private boxClickHandler(args) {
    const index = args.index;
    const that = this;
    const idx = this.model.get('selected') || [];
    let selected: number[] = Array.from(idx);
    // index of box i. Checking if it is already present in the list.
    const elem_index = selected.indexOf(index);
    // Replacement for "Accel" modifier.
    const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;
    if (elem_index > -1 && accelKey) {
      // if the index is already selected and if accel key is
      // pressed, remove the element from the list
      selected.splice(elem_index, 1);
    } else {
      if (d3GetEvent().shiftKey) {
        //If shift is pressed and the element is already
        //selected, do not do anything
        if (elem_index > -1) {
          return;
        }
        //Add elements before or after the index of the current
        //box which has been clicked
        const min_index = selected.length !== 0 ? d3.min(selected) : -1;
        const max_index =
          selected.length !== 0
            ? d3.max(selected)
            : that.model.mark_data.length;
        if (index > max_index) {
          _.range(max_index + 1, index + 1).forEach((i) => {
            selected.push(i);
          });
        } else if (index < min_index) {
          _.range(index, min_index).forEach((i) => {
            selected.push(i);
          });
        }
      } else if (accelKey) {
        //If accel is pressed and the box is not already selected
        //add the box to the list of selected boxes.
        selected.push(index);
      }
      // updating the array containing the box indexes selected
      // and updating the style
      else {
        //if accel is not pressed, then clear the selected ones
        //and set the current element to the selected
        selected = [];
        selected.push(index);
      }
    }
    this.model.set(
      'selected',
      selected.length === 0 ? null : new Uint32Array(selected),
      { updated_view: this }
    );
    this.touch();
    const e = d3GetEvent();
    if (e.cancelBubble !== undefined) {
      // IE
      e.cancelBubble = true;
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();
  }

  private resetSelection() {
    this.model.set('selected', null);
    this.selected_indices = null;
    this.touch();
  }

  private updateSelected(model, value) {
    this.selected_indices = value;
    this.apply_styles();
  }

  draw() {
    this.set_ranges();
    // get the visual representation of boxplots, set as state
    this.prepareBoxPlots();

    // Draw the visual elements with data which was bound
    this.drawMarkPaths('.boxplot', this.d3el);
    // Keep the pixel coordinates of the boxes, for interactions.
    this.xPixels = this.model.mark_data.map(
      (el) => this.scales.x.scale(el[0]) + this.scales.x.offset
    );

    const width = this.getBoxWidth() / 2;
    this.pixelCoords = this.plotData.map((d) => {
      return [
        [d.x - width, d.x + width],
        [d.boxLower, d.boxUpper],
      ];
    });
  }

  private drawMarkPaths(parentClass, selector) {
    const color = this.model.get('color');
    const boxplot = this.d3el.selectAll(parentClass).data(this.plotData);

    const fillcolor = this.model.get('box_fill_color');
    // Create new
    const newBoxplots = boxplot
      .enter()
      .append('g')
      .attr('class', 'boxplot')
      .attr('id', (d, i) => {
        return 'boxplot' + i;
      });

    ///////////////////////////////////////////////////////////////////
    //
    //  We translate the whole element of 'boxplot' to the x location
    //  and then scale each of these elements with Y scale.
    //
    //       ( )    <--- outliers (as circles)
    //       ( )
    //
    //     -------  <--- whisker_max_end (path as the max)
    //        |
    //        |     <--- whisker_max (path from top of the box to max)
    //        |
    //    ---------
    //    |       |
    //    |       |
    //    |       | <--- box (as a rect)
    //    |       |
    //    |       |
    //    ---------
    //        |
    //        |     <--- whisker_min (path from bottom of the box to min)
    //        |
    //     -------  <--- whisker_min_end (path at min value)
    //
    ///////////////////////////////////////////////////////////////////

    newBoxplots.append('path').attr('class', 'whisker_max');
    newBoxplots.append('path').attr('class', 'whisker_max_end');
    newBoxplots.append('path').attr('class', 'whisker_min');
    newBoxplots.append('path').attr('class', 'whisker_min_end');
    newBoxplots.append('rect').attr('class', 'box');
    newBoxplots.append('path').attr('class', 'median_line');
    newBoxplots.append('g').attr('class', 'outliers');

    const scaleX = this.scales.x;
    const xOffset =
      scaleX.model.type === 'ordinal' ? scaleX.scale.bandwidth() / 2 : 0;

    selector
      .selectAll('.boxplot')
      .data(this.plotData)
      .style('stroke', this.model.get('stroke'))
      .style('opacity', color)
      .attr('transform', (d, i) => {
        return 'translate(' + (d.x + xOffset) + ', 0)';
      });

    //Box
    const width = this.getBoxWidth();

    selector
      .selectAll('.box')
      .data(this.plotData)
      .style('fill', fillcolor)
      .attr('x', -width / 2)
      .attr('width', width)
      .attr('y', (d: BoxPlotData) => d.boxUpper)
      .attr('height', (d: BoxPlotData) => d.boxLower - d.boxUpper)
      .on('click', (d: BoxPlotData, i: number) => {
        return this.event_dispatcher('element_clicked', { data: d, index: i });
      })
      .on('mouseover', (d: BoxPlotData, i: number) => {
        return this.event_dispatcher('mouse_over', { data: d, index: i });
      })
      .on('mousemove', (d: BoxPlotData, i: number) => {
        return this.event_dispatcher('mouse_move');
      })
      .on('mouseout', (d: BoxPlotData, i: number) => {
        return this.event_dispatcher('mouse_out');
      });

    //Median line
    selector
      .selectAll('.median_line')
      .data(this.plotData)
      .style('stroke-width', 2)
      .attr('d', (d: BoxPlotData) => {
        const x = 0;
        const medianY = d.boxMedian;

        return (
          'M' +
          (x - width / 2) +
          ',' +
          medianY +
          ' L' +
          (x + width / 2) +
          ',' +
          medianY
        );
      });

    //Max and Min Whiskers
    //Max to top of the Box
    selector
      .selectAll('.whisker_max')
      .data(this.plotData)
      .attr('d', (d: BoxPlotData) => {
        const x = 0;
        // The price points are sorted so the last element is the max
        const maxY = d.whiskerMax;
        const boxY = d.boxUpper;

        return 'M' + x + ',' + maxY + ' L' + x + ',' + boxY;
      })
      .attr('stroke-dasharray', () => '5,5');

    selector
      .selectAll('.whisker_max_end')
      .data(this.plotData)
      .attr('d', (d: BoxPlotData) => {
        const x = 0;
        // The price points are sorted, so 1st element is min
        const maxY = d.whiskerMax;

        return (
          'M' +
          (x - width / 2) +
          ',' +
          maxY +
          ' L' +
          (x + width / 2) +
          ',' +
          maxY
        );
      });

    //Min to the bottom of the box
    //Max to top of the Box
    selector
      .selectAll('.whisker_min')
      .data(this.plotData)
      .attr('d', (d: BoxPlotData) => {
        const x = 0;
        // The price points are sorted, so 1st element is min
        const minY = d.whiskerMin;
        const boxY = d.boxLower;

        return 'M' + x + ',' + minY + ' L' + x + ',' + boxY;
      })
      .attr('stroke-dasharray', () => '5,5');

    selector
      .selectAll('.whisker_min_end')
      .data(this.plotData)
      .attr('d', (d: BoxPlotData) => {
        const x = 0;
        // The price points are sorted, so 1st element is min
        const minY = d.whiskerMin;

        return (
          'M' +
          (x - width / 2) +
          ',' +
          minY +
          ' L' +
          (x + width / 2) +
          ',' +
          minY
        );
      });

    boxplot.exit().remove();

    // Add the outliers group
    const outliers = selector.selectAll('.outlier').data(this.outlierData);

    // Add/remove elements as needed
    outliers.enter().append('circle').attr('class', 'outlier');
    outliers.exit().remove();

    // Set outlier data
    selector
      .selectAll('.outlier')
      .data(this.outlierData)
      .style('fill', this.model.get('outlier_fill_color'))
      .attr('cx', (d: PointType) => d.x + xOffset)
      .attr('r', 3)
      .attr('cy', (d: PointType) => d.y);

    this.apply_styles(this.selected_indices);
  }

  relayout() {
    this.set_ranges();
    this.compute_view_padding();

    // We have to redraw every time that we relayout
    this.draw();
  }

  draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
    const stroke = this.model.get('stroke');
    this.rectDim = inter_y_disp * 0.8;

    this.legendEl = elem
      .selectAll('.legend' + this.uuid)
      .data([this.model.mark_data]);

    const leg = this.legendEl
      .enter()
      .append('g')
      .attr('transform', (d, i) => {
        return 'translate(0, ' + (i * inter_y_disp + y_disp) + ')';
      })
      .attr('class', 'legend' + this.uuid)
      .on('mouseover', _.bind(this.highlight_axes, this))
      .on('mouseout', _.bind(this.unhighlight_axes, this));

    // Add stroke color and set position
    leg
      .selectAll('path')
      .attr('stroke', stroke)
      .attr('transform', 'translate(' + this.rectDim / 2 + ',0)');

    // Draw icon and text
    // this.draw_legend_icon(that.rectDim, leg);
    this.legendEl
      .append('text')
      .attr('class', 'legendtext')
      .attr('x', this.rectDim * 1.2)
      .attr('y', this.rectDim / 2)
      .attr('dy', '0.35em')
      .text((d, i: number) => this.model.get('labels')[i])
      .style('fill', stroke);

    this.legendEl = leg.merge(this.legendEl);

    const max_length = d3.max(this.model.get('labels'), (d: any[]) => {
      return d.length;
    });

    this.legendEl.exit().remove();

    return [1, max_length];
  }

  private xPixels: number[];
  private legendEl: d3.Selection<any, any, any, any>;
  private outlierData: PointType[];
  private pixelCoords: [[number, number], [number, number]][];
  private plotData: BoxPlotData[];
  private rectDim: number;

  model: BoxplotModel;
}
