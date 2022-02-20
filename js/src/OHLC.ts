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
import { isOrdinalScale } from 'bqscales';
import * as _ from 'underscore';
import { Mark } from './Mark';
import { OHLCModel } from './OHLCModel';
import { d3GetEvent } from './utils';

export class OHLC extends Mark {
  async render() {
    this.display_el_classes = ['stick_body'];
    const base_creation_promise = super.render();
    this.selected_indices = this.model.get('selected');
    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');

    this.display_el_classes = ['stick_body', 'stick_tail', 'stick_head'];

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    await base_creation_promise;
    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.draw();
  }

  set_ranges() {
    if (this.scales.x) {
      this.scales.x.setRange(
        this.parent.padded_range('x', this.scales.x.model)
      );
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

  /**
   * Creates event listeners and binds them to rendered d3 elements
   */
  create_listeners() {
    super.create_listeners.apply(this);
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
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.model, 'change:selected', this.update_selected);
    this.listenTo(this.model, 'change:stroke', this.updateStroke);
    this.listenTo(this.model, 'change:stroke_width', this.updateStrokeWidth);
    this.listenTo(this.model, 'change:colors', this.updateColors);
    this.listenTo(this.model, 'change:opacities', this.updateOpacities);
    this.listenTo(this.model, 'change:marker', this.updateMarker);
    this.listenTo(this.model, 'format_updated', this.draw);
    this.listenTo(this.model, 'data_updated', this.draw);
    this.listenTo(this.parent, 'bg_clicked', () => {
      this.event_dispatcher('parent_clicked');
    });
  }

  /**
   * Sets event listeners depending on the interaction typr
   * @param interaction - string representing the interaction
   */
  process_click(interaction) {
    super.process_click(interaction);

    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.reset_selection;
      this.event_listeners.element_clicked = this.ohlc_click_handler;
    }
  }

  /**
   * Resets model state for selected indices
   */
  reset_selection() {
    this.model.set('selected', null);
    this.selected_indices = null;
    this.touch();
  }

  /**
   * Updates model state with selected indices
   * @param model - model object
   * @param value - array of indices
   */
  update_selected(model, value) {
    this.selected_indices = value;
    this.apply_styles();
  }

  /**
   * Updates model state with selected indices (adapted from Bars.ts)
   * @param args - data object of {x, y, index}
   */
  ohlc_click_handler(args) {
    const index = args.index;
    const idx = this.model.get('selected') || [];
    let selected: number[] = Array.from(idx);

    // index of candle i. Checking if it is already present in the list.
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
        //candle which has been clicked
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
        //If accel is pressed and the candle is not already selected
        //add the candle to the list of selected candles.
        selected.push(index);
      }
      // updating the array containing the candle indexes selected
      // and updating the style
      else {
        //if accel is not pressed, then clear the selected ones
        //and set the current element to the selected
        selected = [];
        selected.push(index);
      }
    }
    this.model.set('selected', selected.length === 0 ? null : selected, {
      updated_view: this,
    });
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

  private updateStroke() {
    const stroke = this.model.get('stroke');
    this.d3el.selectAll('.stick').style('stroke', stroke);

    if (this.legendEl) {
      this.legendEl.selectAll('path').style('stroke', stroke);
      this.legendEl.selectAll('text').style('fill', stroke);
    }
  }

  private updateStrokeWidth() {
    const stroke_width = this.model.get('stroke_width');
    this.d3el.selectAll('.stick').attr('stroke-width', stroke_width);
  }

  private updateColors() {
    const colors = this.model.get('colors');
    const up_color = colors[0] ? colors[0] : 'none';
    const down_color = colors[1] ? colors[1] : 'none';

    // Fill candles based on the opening and closing values
    this.d3el.selectAll('.stick').style('fill', (d: any) => {
      return d.y[this.model.px.o] > d.y[this.model.px.c]
        ? down_color
        : up_color;
    });

    if (this.legendEl) {
      this.legendEl.selectAll('path').style('fill', up_color);
    }
  }

  private updateOpacities() {
    const opacities = this.model.get('opacities');
    this.d3el.selectAll('.stick').style('opacity', (d, i) => {
      return opacities[i];
    });

    if (this.legendEl) {
      this.legendEl.selectAll('path').attr('opacity', (d, i) => {
        return opacities[i];
      });
    }
  }

  private updateMarker() {
    const marker = this.model.get('marker');

    if (this.legendEl && this.rectDim) {
      this.draw_legend_icon(this.rectDim, this.legendEl);
    }

    // Redraw existing marks
    this.drawMarkPaths(
      marker,
      this.d3el,
      this.model.mark_data.map((d, index) => {
        return d[1];
      })
    );
  }

  private updateSelectedColors(idx_start, idx_end) {
    let current_range = _.range(idx_start, idx_end + 1);
    if (current_range.length == this.model.mark_data.length) {
      current_range = [];
    }
    const stroke = this.model.get('stroke');
    const colors = this.model.get('colors');
    const up_color = colors[0] ? colors[0] : stroke;
    const down_color = colors[1] ? colors[1] : stroke;
    const px = this.model.px;

    _.range(0, this.model.mark_data.length).forEach((d) => {
      this.d3el.selectAll('#stick' + d).style('stroke', stroke);
    });

    current_range.forEach((d) => {
      this.d3el.selectAll('#stick' + d).style('stroke', (d) => {
        return d[px.o] > d[px.c] ? down_color : up_color;
      });
    });
  }

  invert_range(start_pxl, end_pxl) {
    if (
      start_pxl === undefined ||
      end_pxl === undefined ||
      this.model.mark_data.length === 0
    ) {
      this.updateSelectedColors(-1, -1);
      return [];
    }

    const indices = new Uint32Array(_.range(this.model.mark_data.length));
    const selected = indices.filter((index) => {
      const elem = this.xPixels[index];
      return elem >= start_pxl && elem <= end_pxl;
    });

    let idx_start = -1;
    let idx_end = -1;
    if (
      selected.length > 0 &&
      (start_pxl !== this.scales.x.scale.range()[0] ||
        end_pxl !== this.scales.x.scale.range()[1])
    ) {
      idx_start = selected[0];
      idx_end = selected[selected.length - 1];
    }
    this.updateSelectedColors(idx_start, idx_end);
    this.model.set('selected', selected);
    this.touch();
    return super.invert_range(start_pxl, end_pxl);
  }

  invert_point(pixel) {
    const abs_diff = this.xPixels.map((elem) => {
      return Math.abs(elem - pixel);
    });
    const sel_index = abs_diff.indexOf(d3.min(abs_diff));
    this.updateSelectedColors(sel_index, sel_index);
    this.model.set('selected', [sel_index]);
    this.touch();
    return;
  }

  draw() {
    const x_scale = this.scales.x,
      y_scale = this.scales.y;
    this.set_ranges();
    const colors = this.model.get('colors');
    const opacities = this.model.get('opacities');
    const up_color = colors[0] ? colors[0] : 'none';
    const down_color = colors[1] ? colors[1] : 'none';
    const px = this.model.px;
    const stick = this.d3el.selectAll('.stick').data(
      this.model.mark_data.map((data, index) => {
        return {
          x: data[0],
          y: data[1],
          index: index,
        };
      })
    );

    // Create new
    const new_sticks = stick
      .enter()
      .append('g')
      .attr('class', 'stick')
      .attr('id', (d, i) => {
        return 'stick' + i;
      })
      .style('stroke', this.model.get('stroke'))
      .style('opacity', (d, i) => {
        return opacities[i];
      });

    new_sticks.append('path').attr('class', 'stick_head');
    new_sticks.append('path').attr('class', 'stick_tail');
    new_sticks.append('path').attr('class', 'stick_body');

    stick.exit().remove();

    // Determine offset to use for translation
    let y_index = px.h;
    if (px.h === -1) {
      y_index = px.o;
    }
    // Update all of the marks
    this.d3el
      .selectAll('.stick')
      .style('fill', (d: any, i) => {
        return d.y[px.o] > d.y[px.c] ? down_color : up_color;
      })
      .attr('stroke-width', this.model.get('stroke_width'));
    if (isOrdinalScale(x_scale)) {
      // If we are out of range, we just set the mark in the final
      // bucket's range band. FIXME?
      const x_max = d3.max(this.parent.range('x'));
      this.d3el.selectAll('.stick').attr('transform', (d: any, i) => {
        return (
          'translate(' +
          ((x_scale.scale(this.model.mark_data[i][0]) !== undefined
            ? x_scale.scale(this.model.mark_data[i][0])
            : x_max) +
            x_scale.scale.bandwidth() / 2) +
          ',' +
          (y_scale.scale(d.y[y_index]) + y_scale.offset) +
          ')'
        );
      });
    } else {
      this.d3el.selectAll('.stick').attr('transform', (d: any, i) => {
        return (
          'translate(' +
          (x_scale.scale(this.model.mark_data[i][0]) + x_scale.offset) +
          ',' +
          (y_scale.scale(d.y[y_index]) + y_scale.offset) +
          ')'
        );
      });
    }

    this.d3el.selectAll('.stick').on('click', (d, i) => {
      return this.event_dispatcher('element_clicked', { data: d, index: i });
    });

    // Draw the mark paths
    this.drawMarkPaths(
      this.model.get('marker'),
      this.d3el,
      this.model.mark_data.map((d) => {
        return d[1];
      })
    );

    this.xPixels = this.model.mark_data.map((el) => {
      return x_scale.scale(el[0]) + x_scale.offset;
    });
  }

  private drawMarkPaths(type: string, selector, dat) {
    /* Calculate some values so that we can draw the marks
     *      | <----- high (0,0)
     *      |
     *  --------- <- headline_top (open or close)
     *  |       |
     *  |       |
     *  |       |
     *  --------- <- headline_bottom (open or close)
     *      |
     *      | <----- low
     *
     *
     *      | <----- high (0,0)
     *  ____| <----- open
     *      |
     *      |
     *      |
     *      |____ <- close
     *      | <----- low
     */

    const px = this.model.px;
    const open = [];
    const high = [];
    const low = [];
    const close = [];
    const headline_top = [];
    const headline_bottom = [];
    const to_left_side = [];
    const scaled_mark_widths = [];

    let min_x_difference = this.calculateMarkWidth();
    const x_scale = this.scales.x;
    const y_scale = this.scales.y;
    let offset_in_x_units;
    let data_point;

    for (let i = 0; i < dat.length; i++) {
      if (px.o === -1) {
        open[i] = undefined;
      } else {
        open[i] = y_scale.scale(dat[i][px.o]);
      }
      if (px.c === -1) {
        close[i] = undefined;
      } else {
        close[i] = y_scale.scale(dat[i][px.c]);
      }
      // We can only compute these (and only need to compute these)
      // when we have both the open and the close values
      if (px.o !== -1 && px.c !== -1) {
        headline_top[i] = dat[i][px.o] > dat[i][px.c] ? open[i] : close[i];
        headline_bottom[i] = dat[i][px.o] < dat[i][px.c] ? open[i] : close[i];
      }

      // We never have high without low and vice versa, so we can
      // check everything at once
      if (px.h === -1 || px.l === -1) {
        high[i] = open[i];
        low[i] = close[i];
      } else {
        high[i] = y_scale.scale(dat[i][px.h]);
        low[i] = y_scale.scale(dat[i][px.l]);
      }

      data_point = this.model.mark_data[i][0];
      // Check for dates so that we don't concatenate
      if (min_x_difference instanceof Date) {
        min_x_difference = min_x_difference.getTime();
      }
      if (data_point instanceof Date) {
        data_point = data_point.getTime();
      }
      offset_in_x_units = data_point + min_x_difference;

      if (isOrdinalScale(x_scale)) {
        scaled_mark_widths[i] = x_scale.scale.bandwidth() * 0.75;
      } else {
        scaled_mark_widths[i] =
          (x_scale.scale(offset_in_x_units) - x_scale.scale(data_point)) * 0.75;
      }
      to_left_side[i] = (-1 * scaled_mark_widths[i]) / 2;
    }

    // Determine OHLC marker type
    // Note: if we do not have open or close data then we have to draw
    // a bar.
    if (type == 'candle' && px.o !== -1 && px.c !== -1) {
      /*
       *      | <-------- head
       *  ---------
       *  |       |
       *  |       | <---- body
       *  |       |
       *  ---------
       *      | <-------- tail
       */
      if (px.h !== -1 || px.l !== -1) {
        selector.selectAll('.stick_head').attr('d', (d, i) => {
          return this.headPathCandle(headline_top[i] - high[i]);
        });
        selector.selectAll('.stick_tail').attr('d', (d, i) => {
          return this.tailPathCandle(
            headline_bottom[i] - high[i],
            low[i] - headline_bottom[i]
          );
        });
      } else {
        selector.selectAll('.stick_head').attr('d', '');
        selector.selectAll('.stick_tail').attr('d', '');
      }
      selector.selectAll('.stick_body').attr('d', (d, i) => {
        return this.bodyPathCandle(
          to_left_side[i],
          open[i] - high[i],
          scaled_mark_widths[i],
          close[i] - open[i]
        );
      });
    } else {
      // bar
      /*
       *      |
       *  ____| <-------- head (horizontal piece)
       *      |
       *      | <-------- body (vertical piece)
       *      |
       *      |____ <---- tail (horizontal piece)
       *      |
       */
      if (px.o !== -1) {
        selector.selectAll('.stick_head').attr('d', (d, i) => {
          return this.headPathBar(
            to_left_side[i],
            open[i] - high[i],
            to_left_side[i] * -1
          );
        });
      } else {
        selector.selectAll('.stick_head').attr('d', '');
      }
      if (px.c !== -1) {
        selector.selectAll('.stick_tail').attr('d', (d, i) => {
          return this.tailPathBar(close[i] - high[i], to_left_side[i] * -1);
        });
      } else {
        selector.selectAll('.stick_tail').attr('d', '');
      }
      selector.selectAll('.stick_body').attr('d', (d, i) => {
        return this.bodyPathBar(low[i] - high[i]);
      });
    }
  }

  /* SVG path for head of candle */
  private headPathCandle(height: number) {
    return 'm0,0 l0,' + height;
  }

  /* SVG path for tail of candle */
  private tailPathCandle(yOffset: number, height: number) {
    return 'm0,' + yOffset + ' l0,' + height;
  }

  /* SVG path for body of candle */
  private bodyPathCandle(xOffset, yOffset, width, height) {
    return (
      'm' +
      xOffset +
      ',' +
      yOffset +
      ' l' +
      width +
      ',0' +
      ' l0,' +
      height +
      ' l' +
      -1 * width +
      ',0' +
      ' z'
    );
  }

  /* SVG path for head of bar */
  private headPathBar(xOffset, yOffset, width) {
    return 'm' + xOffset + ',' + yOffset + ' l' + width + ',0';
  }

  /* SVG path for tail of bar */
  private tailPathBar(yOffset, width) {
    return 'm0,' + yOffset + ' l' + width + ',0';
  }

  /* SVG path for body of bar */
  private bodyPathBar(height: number) {
    return 'm0,0 l0,' + height;
  }

  private calculateMarkWidth() {
    /*
     * Calculate the mark width for this data set based on the minimum
     * distance between consecutive points.
     */
    let min_distance: any = Number.POSITIVE_INFINITY;
    const scales = this.model.getScales();

    for (let i = 1; i < this.model.mark_data.length; i++) {
      const dist = this.model.mark_data[i][0] - this.model.mark_data[i - 1][0];
      if (dist < min_distance) {
        min_distance = dist;
      }
    }
    // Check if there are less than two data points
    if (min_distance === Number.POSITIVE_INFINITY) {
      min_distance = (scales.x.domain[1] - scales.x.domain[0]) / 2;
    }
    if (min_distance < 0) {
      min_distance = -1 * min_distance;
    }
    return min_distance;
  }

  relayout() {
    this.set_ranges();
    this.d3el
      .select('.intselmouse')
      .attr('width', this.width)
      .attr('height', this.height);

    // We have to redraw every time that we relayout
    this.draw();
  }

  draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
    const stroke = this.model.get('stroke');
    const colors = this.model.get('colors');
    const up_color = colors[0] ? colors[0] : 'none';
    this.rectDim = inter_y_disp * 0.8;

    this.legendEl = elem
      .selectAll('#legend' + this.uuid)
      .data([this.model.mark_data]);

    const leg = this.legendEl
      .enter()
      .append('g')
      .attr('transform', (d, i) => {
        return 'translate(0, ' + (i * inter_y_disp + y_disp) + ')';
      })
      .attr('class', 'legend')
      .attr('id', 'legend' + this.uuid)
      .style('fill', up_color)
      .on('mouseover', _.bind(this.highlight_axes, this))
      .on('mouseout', _.bind(this.unhighlight_axes, this));

    leg.append('path').attr('class', 'stick_head stick');
    leg.append('path').attr('class', 'stick_tail stick');
    leg
      .append('path')
      .attr('class', 'stick_body stick')
      .style('fill', up_color);

    // Add stroke color and set position
    leg
      .selectAll('path')
      .style('stroke', stroke)
      .attr('transform', 'translate(' + this.rectDim / 2 + ',0)');

    // Draw icon and text
    this.draw_legend_icon(this.rectDim, leg);
    this.legendEl
      .append('text')
      .attr('class', 'legendtext sticktext')
      .attr('x', this.rectDim * 1.2)
      .attr('y', this.rectDim / 2)
      .attr('dy', '0.35em')
      .text((d, i) => {
        return this.model.get('labels')[i];
      })
      .style('fill', stroke);

    const max_length = d3.max(this.model.get('labels'), (d: any) => {
      return Number(d.length);
    });

    this.legendEl.exit().remove();
    return [1, max_length];
  }

  draw_legend_icon(size, selector) {
    /*
     * Draw OHLC icon next to legend text
     * Drawing the icon like this means we can avoid scaling when we
     * already know what the size of the mark is in pixels
     */
    const height = size;
    const width = size / 2;
    const bottom_y_offset = (size * 3) / 4;
    const top_y_offset = size / 4;
    if (this.model.get('marker') === 'candle') {
      selector
        .selectAll('.stick_head')
        .attr('d', this.headPathCandle(width / 2));
      selector
        .selectAll('.stick_tail')
        .attr('d', this.tailPathCandle(bottom_y_offset, width / 2));
      selector
        .selectAll('.stick_body')
        .attr(
          'd',
          this.bodyPathCandle((width * -1) / 2, top_y_offset, width, height / 2)
        );
    } else {
      // bar
      selector
        .selectAll('.stick_head')
        .attr(
          'd',
          this.headPathBar((width * -1) / 2, bottom_y_offset, width / 2)
        );
      selector
        .selectAll('.stick_tail')
        .attr('d', this.tailPathBar(top_y_offset, width / 2));
      selector.selectAll('.stick_body').attr('d', this.bodyPathBar(height));
    }
  }

  clear_style() {}
  compute_view_padding() {}
  set_default_style() {}
  set_style_on_elements() {}

  model: OHLCModel;

  private legendEl: d3.Selection<d3.BaseType, any, any, any>;
  private rectDim: number;
  private xPixels: number[];
  private width: number;
  private height: number;
}
