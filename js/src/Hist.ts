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
import * as d3 from 'd3';
import { d3GetEvent } from './utils';
import * as utils from './utils';
import { Mark } from './Mark';
import { HistModel, BinData } from './HistModel';
import { applyStyles } from './utils';

export class Hist extends Mark {
  async render() {
    const base_creation_promise = super.render();

    this.selected_indices = this.dataIndexToBarIndex(
      this.model.get('selected')
    );
    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');

    this.display_el_classes = ['rect', 'legendtext'];

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    await base_creation_promise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.draw();
    this.update_selected(this.model, this.model.get('selected'));
  }

  set_ranges() {
    const x_scale = this.scales.sample;
    if (x_scale) {
      x_scale.set_range(this.parent.padded_range('x', x_scale.model));
    }
    const y_scale = this.scales.count;
    if (y_scale) {
      y_scale.set_range(this.parent.padded_range('y', y_scale.model));
    }
  }

  set_positional_scales() {
    // In the case of Hist, a change in the "sample" scale triggers
    // a full "update_data" instead of a simple redraw.
    const x_scale = this.scales.sample,
      y_scale = this.scales.count;
    this.listenTo(x_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.model.update_data();
      }
    });
    this.listenTo(y_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw();
      }
    });
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

    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.listenTo(this.model, 'data_updated', this.draw);
    this.listenTo(this.model, 'change:colors', this.updateColors);
    this.model.on_some_change(
      ['stroke', 'opacities'],
      this.updateStrokeAndOpacities,
      this
    );
    this.listenTo(this.model, 'change:selected', this.update_selected);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.parent, 'bg_clicked', function () {
      this.event_dispatcher('parent_clicked');
    });
  }

  process_click(interaction) {
    super.process_click(interaction);
    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.resetSelection;
      this.event_listeners.element_clicked = this.barClickHandler;
    }
  }

  private updateColors() {
    this.d3el
      .selectAll('.bargroup')
      .selectAll('rect')
      .style('fill', (d: BinData) => {
        return this.get_colors(d.index);
      });
    if (this.model.get('labels')) {
      this.d3el
        .selectAll('.bargroup')
        .selectAll('text')
        .style('fill', (d: BinData) => {
          return this.get_colors(d.index);
        });
    }
    if (this.legend_el) {
      this.legend_el.selectAll('rect').style('fill', (d: BinData) => {
        return this.get_colors(d.index);
      });
      this.legend_el.selectAll('text').style('fill', (d: BinData) => {
        return this.get_colors(d.index);
      });
    }
  }

  private updateStrokeAndOpacities() {
    const stroke = this.model.get('stroke');
    const opacities = this.model.get('opacities');
    this.d3el
      .selectAll('.rect')
      .style('stroke', stroke)
      .style('opacity', (d: BinData) => {
        return opacities[d.index];
      });
  }

  private computeBarWidth() {
    const xScale = this.scales.sample;
    let width =
      (xScale.scale(this.model.maxX) - xScale.scale(this.model.minX)) /
      this.model.bins;

    if (width >= 10) {
      width -= 2;
    }

    return width;
  }

  relayout() {
    this.set_ranges();

    const x_scale = this.scales.sample,
      y_scale = this.scales.count;
    this.d3el
      .selectAll('.bargroup')
      .attr('transform', (d: BinData, i: number) => {
        return (
          'translate(' +
          x_scale.scale(d.bin.x0) +
          ',' +
          y_scale.scale(this.model.count[i]) +
          ')'
        );
      });
    const bar_width = this.computeBarWidth();
    this.d3el
      .selectAll('.bargroup')
      .select('rect')
      .transition('relayout')
      .duration(this.parent.model.get('animation_duration'))
      .attr('x', 2)
      .attr('width', bar_width)
      .attr('height', (d: BinData, i: number) => {
        return y_scale.scale(0) - y_scale.scale(this.model.count[i]);
      });
  }

  draw() {
    this.set_ranges();

    const x_scale = this.scales.sample,
      y_scale = this.scales.count;
    const bar_width = this.computeBarWidth();
    let bar_groups: d3.Selection<any, any, any, any> = this.d3el
      .selectAll('.bargroup')
      .data(this.model.mark_data);

    bar_groups.exit().remove();

    const bars_added = bar_groups.enter().append('g').attr('class', 'bargroup');

    // initial values for width and height are set for animation
    bars_added
      .append('rect')
      .attr('class', 'rect')
      .attr('x', 2)
      .attr('width', 0)
      .attr('height', 0);

    bar_groups = bars_added.merge(bar_groups);

    bar_groups.attr('transform', (d: BinData, i: number) => {
      return (
        'translate(' +
        x_scale.scale(d.bin.x0) +
        ',' +
        y_scale.scale(this.model.count[i]) +
        ')'
      );
    });

    bar_groups
      .select('.rect')
      .style('fill', (d: BinData, i) => {
        return this.get_colors(d.index);
      })
      .on('click', (d, i) => {
        return this.event_dispatcher('element_clicked', {
          data: d,
          index: d.index,
        });
      })
      .attr('id', (d, i) => {
        return 'rect' + i;
      })
      .transition('draw')
      .duration(this.parent.model.get('animation_duration'))
      .attr('width', bar_width)
      .attr('height', (d: BinData, i: number) => {
        return y_scale.scale(0) - y_scale.scale(this.model.count[i]);
      });

    //bin_pixels contains the pixel values of the start points of each
    //of the bins and the end point of the last bin.
    this.bin_pixels = this.model.xBins.map((el) => {
      return x_scale.scale(el) + x_scale.offset;
    });
    // pixel coords contains the [x0, x1] and [y0, y1] of each bin
    this.pixel_coords = this.model.mark_data.map((d, i) => {
      const x: number = x_scale.scale(d.bin.x0);
      const y0: number = y_scale.scale(0);
      const y1: number = y_scale.scale(this.model.count[i]);
      return [
        [x, x + bar_width],
        [y0, y1],
      ];
    });
    this.updateStrokeAndOpacities();
  }

  private barClickHandler(args) {
    const index = args.index;
    //code repeated from bars. We should unify the two.
    const idx = this.selected_indices;
    let selected: number[] = idx ? utils.deepCopy(idx) : [];
    // index of bar i. Checking if it is already present in the list.
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
        //bar which has been clicked
        const min_index = selected.length !== 0 ? d3.min(selected) : -1;
        const max_index =
          selected.length !== 0
            ? d3.max(selected)
            : this.model.mark_data.length;
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
        //If accel is pressed and the bar is not already selected
        //add the bar to the list of selected bars.
        selected.push(index);
      }
      // updating the array containing the bar indexes selected
      // and updating the style
      else {
        //if accel is not pressed, then clear the selected ones
        //and set the current element to the selected
        selected = [];
        selected.push(index);
      }
    }
    this.selected_indices = selected;
    this.model.set(
      'selected',
      selected.length === 0 ? null : this.computeDataIndices(selected),
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

  draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
    this.legend_el = elem
      .selectAll('.legend' + this.uuid)
      .data([this.model.mark_data[0]]);

    const rect_dim = inter_y_disp * 0.8;
    const new_legend = this.legend_el
      .enter()
      .append('g')
      .attr('class', 'legend' + this.uuid)
      .attr('transform', (d, i) => {
        return 'translate(0, ' + (i * inter_y_disp + y_disp) + ')';
      })
      .on('mouseover', () => {
        this.event_dispatcher('legend_mouse_over');
      })
      .on('mouseout', () => {
        this.event_dispatcher('legend_mouse_out');
      })
      .on('click', () => {
        this.event_dispatcher('legend_clicked');
      });

    new_legend
      .append('rect')
      .style('fill', (d, i) => {
        return this.get_colors(i);
      })
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', rect_dim)
      .attr('height', rect_dim);

    new_legend
      .append('text')
      .attr('class', 'legendtext')
      .attr('x', rect_dim * 1.2)
      .attr('y', rect_dim / 2)
      .attr('dy', '0.35em')
      .text((d, i) => {
        return this.model.get('labels')[i];
      })
      .style('fill', (d, i) => {
        return this.get_colors(i);
      });

    this.legend_el = new_legend.merge(this.legend_el);

    const max_length = d3.max(this.model.get('labels'), (d: any[]) => {
      return d.length;
    });

    this.legend_el.exit().remove();
    return [1, max_length];
  }

  update_selected(model, value) {
    this.selected_indices = this.dataIndexToBarIndex(value);
    this.apply_styles();
  }

  clear_style(style_dict, indices?) {
    let elements = this.d3el.selectAll('.bargroup');
    if (indices) {
      elements = elements.filter((d, index) => {
        return indices.indexOf(index) !== -1;
      });
    }
    const clearing_style = {};
    for (const key in style_dict) {
      clearing_style[key] = null;
    }
    applyStyles(elements.selectAll('.bar'), clearing_style);
  }

  set_default_style(indices, elements?) {
    this.updateColors();
    this.updateStrokeAndOpacities();
  }

  set_style_on_elements(style, indices) {
    // If the index array is undefined or of length=0, exit the
    // function without doing anything
    if (indices === undefined || indices === null || indices.length === 0) {
      return;
    }
    // Also, return if the style object itself is blank
    if (Object.keys(style).length === 0) {
      return;
    }
    let elements = this.d3el.selectAll('.bargroup');
    elements = elements.filter((data, index) => {
      return indices.indexOf(index) !== -1;
    });
    applyStyles(elements.selectAll('.rect'), style);
  }

  invert_point(pixel) {
    // Sets the selected to the data contained in the bin closest
    // to the value of the pixel.
    // Used by Index Selector.
    if (pixel === undefined) {
      this.model.set('selected', null);
      this.touch();
      return;
    }

    const bar_width = this.computeBarWidth();

    //adding "bar_width / 2.0" to bin_pixels as we need to select the
    //bar whose center is closest to the current location of the mouse.
    const abs_diff = this.bin_pixels.map((elem) => {
      return Math.abs(elem + bar_width / 2.0 - pixel);
    });
    const sel_index = abs_diff.indexOf(d3.min(abs_diff));
    this.model.set('selected', this.computeDataIndices([sel_index]));
    this.touch();
  }

  selector_changed(point_selector, rect_selector) {
    if (point_selector === undefined) {
      this.model.set('selected', null);
      this.touch();
      return [];
    }
    const pixels = this.pixel_coords;
    const indices = new Uint32Array(_.range(pixels.length));
    const selected_bins = indices.filter((index) => {
      return rect_selector(pixels[index]);
    });
    this.model.set('selected', this.computeDataIndices(selected_bins));
    this.touch();
  }

  private computeDataIndices(indices) {
    //input is a list of indices corresponding to the bars. Output is
    //the list of indices in the data
    const intervals = this.reduceIntervals(indices);
    if (intervals.length === 0) {
      return [];
    }

    const x_data = this.model.get('sample');
    const num_intervals = intervals.length;
    const indices_data = new Uint32Array(_.range(x_data.length));
    const selected = indices_data.filter((index) => {
      const elem = x_data[index];
      for (let iter = 0; iter < num_intervals; iter++) {
        if (elem <= intervals[iter][1] && elem >= intervals[iter][0]) {
          return true;
        }
      }
      return false;
    });
    return selected;
  }

  private reduceIntervals(indices: number[]) {
    //for a series of indices, reduces them to the minimum possible
    //intervals on which the search can be performed.
    //return value is an array of arrays containing the start and end
    //points of the intervals represented by the indices.
    const intervals = [];
    const nBins = this.model.bins;
    const barWidth = (this.model.maxX - this.model.minX) / this.model.bins;

    if (indices.length !== 0) {
      indices.sort();
      let start = indices[0];
      let end = indices[0];
      for (let iter = 1; iter < indices.length; iter++) {
        if (indices[iter] === end + 1) {
          end++;
        } else {
          intervals.push([
            this.model.xBins[start],
            end + 1 == nBins
              ? this.model.xBins[nBins - 1] + barWidth
              : this.model.xBins[end + 1],
          ]);
          start = end = indices[iter];
        }
      }
      intervals.push([
        this.model.xBins[start],
        end + 1 == nBins
          ? this.model.xBins[nBins - 1] + barWidth
          : this.model.xBins[end + 1],
      ]);
    }
    return intervals;
  }

  private dataIndexToBarIndex(selected) {
    //function to calculate bar indices for a given list of data
    //indices
    if (selected === null) {
      return null;
    }

    const x_data = this.model.get('sample');
    const data = Array.from(selected).map((idx: number) => {
      return x_data[idx];
    });
    let bar_indices = [];
    for (let iter = 0; iter < data.length; iter++) {
      //xBins is of length num_bars+1. So if the max element is
      //selected, we get a bar index which is equal to num_bars.
      let index = Math.min(
        _.indexOf(this.model.xBins, data[iter], true),
        this.model.xBins.length - 2
      );
      //if the data point is not one of the bins, then find the index
      //where it is to be inserted.
      if (index === -1) {
        index = _.sortedIndex(this.model.xBins, data[iter]) - 1;
      }
      bar_indices.push(index);
    }
    bar_indices.sort();
    bar_indices = _.uniq(bar_indices, true);
    return bar_indices;
  }

  private resetSelection() {
    this.selected_indices = [];
    this.model.set('selected', null);
    this.touch();
  }

  compute_view_padding() {}

  selected_indices: number[];
  legend_el: d3.Selection<SVGGElement, any, any, any>;
  bin_pixels: number[];
  pixel_coords: [number[], number[]][];

  model: HistModel;
}
