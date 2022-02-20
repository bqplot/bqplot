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
import { HeatMapModel } from './HeatMapModel';
import { Mark } from './Mark';

export class HeatMap extends Mark {
  async render() {
    const baseRenderPromise = super.render();

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    this.image = d3
      .select(this.el)
      .append('image')
      .classed('heatmap', true)
      .attr('width', this.parent.width)
      .attr('height', this.parent.height);

    this.canvas = document.createElement('canvas');

    await baseRenderPromise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
    this.draw();
  }

  set_ranges() {
    if (this.scales.x) {
      const xRange = this.parent.padded_range('x', this.scales.x.model);
      this.scales.x.setRange(xRange);
    }

    if (this.scales.y) {
      this.scales.y.setRange(
        this.parent.padded_range('y', this.scales.y.model)
      );
    }
  }

  set_positional_scales() {
    this.listenTo(this.scales.x, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
    this.listenTo(this.scales.y, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
  }

  initialize_additional_scales() {
    if (this.scales.color) {
      this.listenTo(this.scales.color, 'domain_changed', function () {
        this.draw();
      });
      this.scales.color.on('color_scale_range_changed', this.draw, this);
    }
  }

  create_listeners() {
    super.create_listeners();

    this.d3el
      .on('mouseover', () => {
        this.event_dispatcher('mouse_over');
      })
      .on('mousemove', () => {
        this.event_dispatcher('mouse_move');
      })
      .on('mouseout', () => {
        this.event_dispatcher('mouse_out');
      });
    this.listenTo(this.model, 'data_updated', this.draw);
    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.listenTo(this.parent, 'bg_clicked', () => {
      this.event_dispatcher('parent_clicked');
    });
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
  }

  relayout() {
    this.set_ranges();
    this.compute_view_padding();
    this.draw();
  }

  private drawCanvas() {
    this.image.attr('href', this.canvas.toDataURL('image/png'));
  }

  draw() {
    this.set_ranges();

    const plottingData = this.getPlottingData();

    this.canvas.setAttribute('width', plottingData.totalWidth.toString());
    this.canvas.setAttribute('height', plottingData.totalHeight.toString());

    const ctx = this.canvas.getContext('2d');
    const colors = this.model.mark_data.color;
    colors.forEach((row: number[], i: number) => {
      const height = plottingData.heights[i];
      const y = plottingData.yOrigin + plottingData.yStartPoints[i];

      row.forEach((d: number, j: number) => {
        const width = plottingData.widths[j];
        const x = plottingData.xOrigin + plottingData.xStartPoints[j];
        ctx.fillStyle = this.getElementFill(d);
        ctx.fillRect(x, y, this.expandRect(width), this.expandRect(height));
      });
    });

    this.image
      .attr('width', plottingData.totalWidth)
      .attr('height', plottingData.totalHeight)
      .attr('x', plottingData.x0)
      .attr('y', plottingData.y0);

    this.drawCanvas();
  }

  private expandRect(value: number): number {
    // Add 0.5px to width and height to fill gaps between rectangles
    return value > 0 ? value + 0.5 : value - 0.5;
  }

  private getPlottingData() {
    const xData: Array<number> = Array.from(this.model.mark_data.x).map(
      this.scales.x.scale
    );
    const yData: Array<number> = Array.from(this.model.mark_data.y).map(
      this.scales.y.scale
    );

    const xReverse = this.scales.x.model.get('reverse');
    const yReverse = this.scales.y.model.get('reverse');

    const padding = this.getPadding(xData, yData);

    const widths = this.computeRectSizes(xData, padding.left, padding.right);
    const heights = this.computeRectSizes(
      yData,
      padding.bottom,
      padding.top,
      true
    );

    const totalWidth = Math.abs(
      xData[xData.length - 1] - xData[0] + padding.left + padding.right
    );
    const totalHeight = Math.abs(
      yData[0] - yData[yData.length - 1] + padding.top + padding.bottom
    );

    const x0 = xData[0] - padding.left;
    const y0 = yData[yData.length - 1] - padding.top;

    const xStartPoints = xData.map((d, i) => {
      if (i == 0) {
        return 0;
      } else {
        return (d + xData[i - 1]) * 0.5 - x0;
      }
    });
    const yStartPoints = yData.map((d, i) => {
      if (i == yData.length - 1) {
        return 0;
      } else {
        return (d + yData[i + 1]) * 0.5 - y0;
      }
    });

    return {
      widths,
      heights,
      totalWidth,
      totalHeight,
      xOrigin: xReverse ? totalWidth : 0,
      yOrigin: yReverse ? totalHeight : 0,
      xStartPoints,
      yStartPoints,
      x0: xReverse ? x0 - totalWidth : x0,
      y0: yReverse ? y0 - totalHeight : y0,
    };
  }

  private getPadding(xData: number[], yData: number[]) {
    const numCols = xData.length;
    const numRows = yData.length;

    return {
      left: (xData[1] - xData[0]) * 0.5,
      right: (xData[numCols - 1] - xData[numCols - 2]) * 0.5,
      bottom: -(yData[1] - yData[0]) * 0.5,
      top: -(yData[numRows - 1] - yData[numRows - 2]) * 0.5,
    };
  }

  computeRectSizes(data, padding1, padding2, reversed = false) {
    const factor = reversed ? -1 : 1;

    return data.map((d, i) => {
      if (i == 0) {
        return factor * (data[1] - d) * 0.5 + padding1;
      } else if (i == data.length - 1) {
        return factor * (d - data[i - 1]) * 0.5 + padding2;
      } else {
        return factor * (data[i + 1] - data[i - 1]) * 0.5;
      }
    });
  }

  private getElementFill(color: number | null) {
    if (color === null) {
      return this.model.get('null_color');
    }

    return this.scales.color.scale(color);
  }

  clear_style(style_dict, indices?, elements?) {}

  compute_view_padding() {}

  set_default_style(indices, elements?) {}

  set_style_on_elements(style, indices, elements?) {}

  private image: d3.Selection<SVGImageElement, any, any, any>;
  private canvas: HTMLCanvasElement;

  model: HeatMapModel;
}
