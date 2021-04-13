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
import * as utils from './utils';
import { Interaction } from './Interaction';
import { Lines } from './Lines';
import { LinesModel } from './LinesModel';

export class HandDraw extends Interaction {
  render() {
    super.render();
    this.d3el.style('cursor', 'crosshair');
    this.active = false;

    // Register the mouse callback when the mark view promises are
    // resolved.
    this.setLinesView().then(() => {
      this.d3el.on('mousedown', () => {
        return this.mousedown();
      });
      this.setLimits();
    });

    this.model.on_some_change(['min_x', 'max_x'], this.setLimits, this);
  }

  private async setLinesView(): Promise<void> {
    const fig = this.parent;

    const views = await Promise.all(fig.mark_views.views);

    const fig_mark_ids = fig.mark_views._models.map((markModel) => {
      return markModel.model_id; // Model ids of the marks in the figure
    });
    const mark_index = fig_mark_ids.indexOf(this.lines.model_id);
    this.linesView = views[mark_index] as Lines;
  }

  private mousedown(): void {
    this.active = true;
    this.mouseEntry(false);

    this.d3el.on('mousemove', this.mousemove.bind(this));
    this.d3el.on('mouseleave', this.mouseup.bind(this));
    this.d3el.on('mouseup', this.mouseup.bind(this));
  }

  private mouseup(): void {
    if (this.active) {
      this.mouseEntry(true);

      this.lines.set(
        'y',
        utils.convert_dates(utils.deepCopy(this.lines.y_data))
      );
      this.linesView.touch();
      this.active = false;
      this.d3el.on('mousemove', null);
      this.d3el.on('mouseleave', null);
      this.d3el.on('mouseup', null);
    }
  }

  private mousemove(): void {
    this.mouseEntry(true);
  }

  private mouseEntry(memory: boolean) {
    // If memory is set to true, itermediate positions between the last
    // position of the mouse and the current one will be interpolated.
    if (this.active) {
      const xindex = Math.min(this.lineIndex, this.lines.x_data.length - 1);
      const mousePos = d3.mouse(this.el);
      if (!memory || !('previousPos' in this)) {
        this.previousPos = mousePos;
      }
      const scaleX = this.linesView.scales.x.scale;
      const scaleY = this.linesView.scales.y.scale;

      const newx = scaleX.invert(mousePos[0]);
      const newy = scaleY.invert(mousePos[1]);
      const oldx = scaleX.invert(this.previousPos[0]);
      scaleY.invert(this.previousPos[1]);
      const old_index = this.nearestNeighbourSearch(
        this.lines.x_data[xindex],
        oldx
      );
      const new_index = this.nearestNeighbourSearch(
        this.lines.x_data[xindex],
        newx
      );
      const min = Math.min(old_index, new_index);
      const max = Math.max(old_index, new_index);
      for (let i = min; i <= max; ++i) {
        if (
          (!this.validMin || this.lines.x_data[xindex][i] >= this.minX) &&
          (!this.validMax || this.lines.x_data[xindex][i] <= this.maxX)
        ) {
          this.lines.y_data[this.lineIndex][i] = newy;
        }
      }
      // since x_data may be a TypedArray, explicitly use Array.map
      const xy_data = Array.prototype.map.call(
        this.lines.x_data[xindex],
        (d, i) => {
          return {
            x: d,
            y: this.lines.y_data[this.lineIndex][i],
          };
        }
      );
      this.linesView.d3el
        .select('#curve' + (this.lineIndex + 1))
        .attr('d', (d) => {
          return this.linesView.line(xy_data);
        });
      this.previousPos = mousePos;
    }
  }

  private setLimits(): void {
    const is_date = this.linesView.scales.x.model.type == 'date';
    if (is_date) {
      this.minX = utils.getDate(this.model.get('min_x'));
      this.validMin = !(
        this.minX === null ||
        this.minX === undefined ||
        isNaN(this.minX.getTime())
      );
      this.maxX = utils.getDate(this.model.get('max_x'));
      this.validMax = !(
        this.maxX === null ||
        this.maxX === undefined ||
        isNaN(this.maxX.getTime())
      );
    } else {
      this.minX = this.model.get('min_x');
      this.maxX = this.model.get('max_x');
      this.validMin = !(this.minX === null || this.minX === undefined);
      this.validMax = !(this.maxX === null || this.maxX === undefined);
    }
  }

  private nearestNeighbourSearch(x_data: number[], x: number): number {
    const idx = this.linesView.bisect(x_data, x);
    if (x - x_data[idx - 1] > x_data[idx] - x) {
      return idx;
    } else {
      return idx - 1;
    }
  }

  private get lineIndex(): number {
    return this.model.get('line_index');
  }

  private get lines(): LinesModel {
    return this.model.get('lines');
  }

  private active: boolean;
  private linesView: Lines;
  private minX: number | Date;
  private maxX: number | Date;
  private validMin: boolean;
  private validMax: boolean;
  private previousPos: [number, number];
}
