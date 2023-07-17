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

import { WidgetView } from '@jupyter-widgets/base';
import {
  Scale,
  ScaleModel,
  isOrdinalScale,
  isDateScale,
  isLogScale,
  isLinearScale,
  isDateColorScale,
  isColorScale,
} from 'bqscales';
import * as d3 from 'd3';
// const d3 =Object.assign({}, require("d3-axis"), require("d3-format"), require("d3-selection"), require("d3-selection-multi"), require("d3-time"), require("d3-time-format"));
import * as utils from './utils';
import * as _ from 'underscore';
import { applyAttrs, applyStyles } from './utils';
import { Figure } from './Figure';

// Polyfill for Math.log10 in IE11
Math.log10 =
  Math.log10 ||
  function (x) {
    return Math.log(x) / Math.LN10;
  };

const DATESCALE_WIDTH_THRESHOLD = 500;
const UNITS_ARRAY = ['em', 'ex', 'px'];

export class Axis extends WidgetView {
  initialize() {
    this.setElement(
      document.createElementNS(d3.namespaces.svg, 'g') as HTMLElement
    );
    this.d3el = d3.select(this.el);
    super.initialize.apply(this, arguments);
  }

  async render() {
    this.d3el.style('display', this.model.get('visible') ? 'inline' : 'none');
    this.parent = this.options.parent;

    const scale_promise = this.set_scale_promise(this.model.get('scale'));
    const offset_promise = this.get_offset_promise();

    return await Promise.all([scale_promise, offset_promise]).then(() => {
      this.create_listeners();
      this.create_axis();
      this.set_scales_range();
      this.update_scales();
      this.set_tick_values();
      this.tickformat_changed();
      this.append_axis();
    });
  }
  create_listeners() {
    // Creates all event listeners

    this.listenTo(this.model, 'change:scale', (model, value) => {
      this.update_scale(model.previous('scale'), value);
      // TODO: rescale_axis does too many things. Decompose
      this.axis.scale(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>); // TODO: this is in redraw_axisline
      this.rescale_axis();
    });

    // Tick attributes
    this.listenTo(this.model, 'change:tick_values', this.set_tick_values);
    this.listenTo(this.model, 'change:tick_format', this.tickformat_changed);
    this.listenTo(this.model, 'change:tick_labels', this.tick_labels_changed);
    this.listenTo(this.model, 'change:num_ticks', this.set_tick_values);
    this.listenTo(this.model, 'change:tick_rotate', this.apply_tick_styling);
    this.listenTo(this.model, 'change:tick_style', this.apply_tick_styling);

    // Label attributes
    this.model.on_some_change(
      ['label', 'label_color'],
      this.update_label,
      this
    );

    // Axis attributes
    this.listenTo(this.model, 'change:color', this.update_color);
    this.model.on_some_change(
      ['grid_color', 'grid_lines'],
      this.update_grid_lines,
      this
    );
    this.listenTo(
      this.model,
      'change:label_location',
      this.update_label_location
    );
    this.listenTo(this.model, 'change:label_offset', this.update_label_offset);
    this.listenTo(this.model, 'change:visible', this.update_visibility);
    this.listenTo(this.model, 'change:side', this.update_display);
    this.listenTo(this.model, 'change:offset', this.update_offset);
    this.listenTo(this.parent, 'margin_updated', this.parent_margin_updated);
  }

  update_offset() {
    const offset_creation_promise = this.get_offset_promise();
    offset_creation_promise.then(() => {
      this.set_scales_range();
      this.update_offset_scale_domain();
      this.g_axisline.attr('transform', this.get_axis_transform());
      this.update_grid_lines();
    });
  }

  update_display() {
    this.g_axisline.remove();
    this.create_axis();
    this.set_tick_values();
    this.set_scales_range();
    this.tickformat_changed();
    this.append_axis();
  }

  set_tick_values(animate?: boolean) {
    // Sets specific tick values from "tick_values" parameter

    let useticks = [];
    const tick_values = this.model.get('tick_values');
    const num_ticks = this.model.get('num_ticks');

    if (
      tick_values !== undefined &&
      tick_values !== null &&
      tick_values.length > 0
    ) {
      this.axis.tickValues(this.get_ticks_from_array_or_length(tick_values));
    } else if (num_ticks !== undefined && num_ticks !== null) {
      this.axis.tickValues(this.get_ticks_from_array_or_length());
    } else {
      if (isDateScale(this.axis_scale)) {
        // Reduce number of suggested ticks if figure width is below the
        // threshold. Note: "undefined" will result in the D3 default
        // setting
        const numDateTicks =
          this.width < DATESCALE_WIDTH_THRESHOLD ? 5 : undefined;
        const scale = this.axis_scale.scale;
        this.axis.tickValues(scale.ticks(numDateTicks));
      } else if (isOrdinalScale(this.axis_scale)) {
        this.axis.tickValues(this.axis_scale.scale.domain());
      } else if (isLogScale(this.axis_scale)) {
        let i, r;
        const scale = this.axis_scale.scale;
        const allticks = scale.ticks();
        const oom = Math.abs(Math.log10(scale.domain()[1] / scale.domain()[0]));
        if (oom < 2) {
          this.axis.tickValues(allticks);
        } else if (oom < 7) {
          useticks = [];
          for (i = 0; i < allticks.length; i++) {
            r = Math.abs(Math.log10(allticks[i]) % 1);
            if (
              Math.abs(r) < 0.001 ||
              Math.abs(r - 1) < 0.001 ||
              Math.abs(r - 0.30103) < 0.001 ||
              Math.abs(r - 0.69897) < 0.001
            ) {
              useticks.push(allticks[i]);
            }
          }
          this.axis.tickValues(useticks);
        } else {
          useticks = [];
          const s = Math.round(oom / 10);
          for (i = 0; i < allticks.length; i++) {
            r = Math.abs(Math.log10(allticks[i]) % s);
            if (Math.abs(r) < 0.001 || Math.abs(r - s) < 0.001) {
              useticks.push(allticks[i]);
            }
          }
          this.axis.tickValues(useticks);
        }
      } else if (
        isLinearScale(this.axis_scale) ||
        isColorScale(this.axis_scale)
      ) {
        this.axis.tickValues(this.axis_scale.scale.ticks());
      }
    }
    if (this.g_axisline) {
      this.g_axisline
        .transition('set_tick_values')
        .duration(
          animate === true ? this.parent.model.get('animation_duration') : 0
        )
        .call(this.axis);

      this.apply_tick_styling();
    }
  }

  tickformat_changed() {
    this.tick_format = this.generate_tick_formatter();
    this.axis.tickFormat(this.tick_format);
    if (this.g_axisline) {
      this.g_axisline.call(this.axis);
    }
    this.apply_tick_styling();
  }

  tick_labels_changed() {
    this.tickformat_changed();
  }

  apply_tick_styling() {
    // Applies current tick styling to all displayed ticks
    if (this.g_axisline) {
      const tickText = this.g_axisline.selectAll('.tick text');
      applyStyles(tickText, this.model.get('tick_style'));
      tickText.attr('transform', this.get_tick_transforms());
    }
  }

  get_tick_transforms() {
    // parses object and returns a string that can be passed to a D3 as a
    // set of options
    // Note: Currently, only the `tick_rotate` attribute uses .transform()

    const rotation = this.model.get('tick_rotate');
    return `rotate(${rotation})`;
  }

  update_scales() {
    // Updates the domains of both scales

    this.update_scale_domain();
    this.update_offset_scale_domain();
  }

  update_scale_domain() {
    // Sets the scale domain (Range of input values)

    const is_vertical = ['left', 'right'].includes(this.model.get('side'));

    const initial_range = is_vertical
      ? this.parent.padded_range('y', this.axis_scale.model)
      : this.parent.padded_range('x', this.axis_scale.model);

    const target_range = is_vertical
      ? this.parent.range('y')
      : this.parent.range('x');

    this.axis_scale.expandDomain(initial_range, target_range);
    this.axis.scale(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
  }

  update_offset_scale_domain() {
    // Sets the domain (range of input values) of the offset scale

    const is_vertical = ['left', 'right'].includes(this.model.get('side'));

    if (this.offset_scale) {
      const initial_range = !is_vertical
        ? this.parent.padded_range('y', this.offset_scale.model)
        : this.parent.padded_range('x', this.offset_scale.model);

      const target_range = !is_vertical
        ? this.parent.range('y')
        : this.parent.range('x');

      this.offset_scale.expandDomain(initial_range, target_range);
    }
  }

  generate_tick_formatter() {
    const default_formatter = this.generate_default_tick_formatter();
    const tickLabels = this.model.get('tick_labels');
    if (tickLabels && Object.keys(tickLabels).length > 0) {
      const formatter = (data) => {
        let value = tickLabels[data];
        if (value === undefined) {
          return default_formatter(data);
        } else {
          return value;
        }
      };
      return formatter;
    } else {
      return default_formatter;
    }
  }

  generate_default_tick_formatter() {
    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      if (this.model.get('tick_format')) {
        return d3.utcFormat(this.model.get('tick_format'));
      } else {
        return this.guess_tick_format();
      }
    } else if (isOrdinalScale(this.axis_scale)) {
      const tick_format = this.model.get('tick_format');
      if (tick_format) {
        //TODO: This may not be the best way to do this. We can
        //check the instance of the elements in the domain and
        //apply the format depending on that.
        if (utils.is_valid_time_format(tick_format)) {
          return d3.utcFormat(tick_format);
        } else {
          return d3.format(tick_format);
        }
      }
      return (d) => {
        return d;
      };
    } else {
      // linear or log scale
      if (this.model.get('tick_format')) {
        return d3.format(this.model.get('tick_format'));
      }
      return this.guess_tick_format();
    }
  }

  set_scales_range() {
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));

    this.axis_scale.setRange(is_vertical ? [this.height, 0] : [0, this.width]);
    if (this.offset_scale) {
      this.offset_scale.setRange(
        is_vertical ? [0, this.width] : [this.height, 0]
      );
    }
  }

  create_axis() {
    // Creates the initial D3 axis and sets it on this.axis

    const is_vertical = ['left', 'right'].includes(this.model.get('side'));
    const side = this.model.get('side');

    if (is_vertical) {
      this.axis =
        side === 'right'
          ? d3.axisRight(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>)
          : d3.axisLeft(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
    } else {
      this.axis =
        side === 'top'
          ? d3.axisTop(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>)
          : d3.axisBottom(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
    }
  }

  append_axis() {
    this.update_scales();

    // Create initial SVG element
    this.g_axisline = this.d3el
      .append('g')
      .attr('class', 'axis')
      .attr('transform', this.get_axis_transform())
      .call(this.axis);

    // Create element for axis label
    const lineText = this.g_axisline
      .append('text')
      .attr('class', 'axislabel')
      .text(this.model.get('label'));
    applyStyles(lineText, this.get_text_styling());
    applyAttrs(lineText, this.get_label_attributes());

    // Apply custom settings
    this.update_grid_lines();
    this.update_color();
    this.apply_tick_styling();
    this.update_label();
  }

  get_offset_promise() {
    /*
     * The offset may require the creation of a Scale, which is async
     * Hence, get_offset_promise returns a promise.
     */
    let return_promise = Promise.resolve();
    const offset = this.model.get('offset');
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));

    if (offset.value !== undefined && offset.value !== null) {
      //If scale is undefined but, the value is defined, then we have
      //to
      if (offset.scale === undefined) {
        this.offset_scale = is_vertical
          ? this.parent.scale_x
          : this.parent.scale_y;
      } else {
        return_promise = this.create_child_view(offset.scale).then((view) => {
          this.offset_scale = view as WidgetView as Scale;
          if (
            isLinearScale(this.offset_scale) ||
            isDateScale(this.offset_scale) ||
            isLogScale(this.offset_scale)
          ) {
            this.offset_scale.scale.clamp(true);
          }
          this.offset_scale.on('domain_changed', () => {
            this.update_offset_scale_domain();
            this.g_axisline.attr('transform', this.get_axis_transform());
            this.update_grid_lines();
          });
        });
      }
      this.offset_value = offset.value;
    } else {
      //required if the offset has been changed from a valid value
      //to null
      this.offset_scale = this.offset_value = undefined;
    }
    return return_promise;
  }

  highlight() {
    this.g_axisline.classed('axisbold', true);
  }

  unhighlight() {
    this.g_axisline.classed('axisbold', false);
  }

  get_basic_transform() {
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));
    const side = this.model.get('side');

    if (is_vertical) {
      return side === 'right' ? this.width + this.autoOffset : -this.autoOffset;
    } else {
      return side === 'top' ? -this.autoOffset : this.height + this.autoOffset;
    }
  }

  get_axis_transform() {
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));
    if (is_vertical) {
      return 'translate(' + this.process_offset() + ', 0)';
    } else {
      return 'translate(0, ' + this.process_offset() + ')';
    }
  }

  process_offset() {
    if (this.offset_scale === undefined || this.offset_scale === null) {
      return this.get_basic_transform();
    } else {
      let value = this.offset_scale.scale(this.offset_value);
      //The null check is required for two reasons. Value may be null
      //or the scale is ordinal which does not include the value in
      //its domain.
      value = value === undefined ? this.get_basic_transform() : value;
      return this.offset_scale.offset + value;
    }
  }

  get_label_attributes() {
    // Returns an object based on values of "label_location" and "label_offset"

    let label_x = 0;
    const label_location = this.model.get('label_location');
    const label_offset = this.calculate_label_offset();
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));
    const side = this.model.get('side');

    if (is_vertical) {
      if (label_location === 'start') {
        label_x = -this.height;
      } else if (label_location === 'middle') {
        label_x = -this.height / 2;
      }
      if (side === 'right') {
        return {
          transform: 'rotate(-90)',
          x: label_x,
          y: label_offset,
          dy: '1ex',
          dx: '0em',
        };
      } else {
        return {
          transform: 'rotate(-90)',
          x: label_x,
          y: label_offset,
          dy: '0em',
          dx: '0em',
        };
      }
    } else {
      if (label_location === 'middle') {
        label_x = this.width / 2;
      } else if (label_location === 'end') {
        label_x = this.width;
      }
      if (side === 'top') {
        return {
          x: label_x,
          y: label_offset,
          dy: '0.75ex',
          dx: '0em',
          transform: '',
        };
      } else {
        return {
          x: label_x,
          y: label_offset,
          dy: '0.25ex',
          dx: '0em',
          transform: '',
        };
      }
    }
  }

  get_text_styling() {
    // This function returns the text styling based on the attributes
    // of the axis. As of now, only the text-anchor attribute is set.
    // More can be added :)
    const label_location = this.model.get('label_location');
    if (label_location === 'start') {
      return { 'text-anchor': 'start' };
    } else if (label_location === 'end') {
      return { 'text-anchor': 'end' };
    } else {
      return { 'text-anchor': 'middle' };
    }
  }

  update_label() {
    this.g_axisline.select('text.axislabel').text(this.model.get('label'));
    this.d3el.selectAll('.axislabel').selectAll('text');
    if (
      this.model.get('label_color') !== '' &&
      this.model.get('label_color') !== null
    ) {
      this.g_axisline
        .select('text.axislabel')
        .style('fill', this.model.get('label_color'));
      this.d3el
        .selectAll('.axislabel')
        .selectAll('text')
        .style('fill', this.model.get('label_color'));
    }
  }

  update_label_location() {
    const axisLabel = this.g_axisline.select('text.axislabel');
    applyStyles(axisLabel, this.get_text_styling());
    applyAttrs(axisLabel, this.get_label_attributes());
  }

  update_label_offset() {
    this.label_offset = this.calculate_label_offset();
    this.g_axisline.select('text.axislabel').attr('y', this.label_offset);
  }

  calculate_label_offset() {
    // If the label offset is not defined, depending on the orientation
    // of the axis, an offset is set.

    let label_offset = this.model.get('label_offset');
    const is_vertical = ['left', 'right'].includes(this.model.get('side'));
    const side = this.model.get('side');

    if (!label_offset) {
      if (!is_vertical) {
        label_offset = '2em';
      } else {
        label_offset = '4ex';
      }
    }
    // Label_offset is a signed distance from the axis line. Positive
    // is away from the figure and negative is towards the figure. The
    // notion of away and towards is different for left/right and
    // top/bottom axis.
    let index = -1;
    for (let i = 0; i < UNITS_ARRAY.length && index === -1; i++) {
      index = label_offset.indexOf(UNITS_ARRAY[i]);
    }

    if (index === -1) {
      return label_offset;
    }

    if (side === 'top' || side === 'left') {
      const num = -1 * parseInt(label_offset.substring(0, index));
      label_offset = num + label_offset.substring(index);
    }
    return label_offset;
  }

  update_grid_lines(animate?: boolean) {
    const grid_type = this.model.get('grid_lines');
    const side = this.model.get('side');
    const is_vertical = ['left', 'right'].includes(side);
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    let tickSize = is_vertical ? -this.width : -this.height;
    let tickOffset = 0;

    //apply offsets if applicable
    if (this.offset_scale) {
      const offset = this.offset_scale.scale(this.offset_value);

      if (side === 'bottom' || side == 'right') {
        tickSize = -offset;
        tickOffset = !is_vertical ? this.height - offset : this.width - offset;
      } else {
        tickSize += offset;
        tickOffset = -offset;
      }
    }

    if (grid_type !== 'none') {
      this.axis.tickSizeInner(tickSize).tickSizeOuter(6);
    } else {
      this.axis.tickSize(6);
    }

    this.g_axisline.selectAll('.tick').classed('short', grid_type === 'none');

    this.g_axisline
      .transition('update_grid_lines')
      .duration(animation_duration)
      .call(this.axis)
      .selectAll('.tick line')
      .attr(
        !is_vertical ? 'y1' : 'x1',
        this.offset_scale && grid_type !== 'none' ? tickOffset : null
      )
      .style('stroke-dasharray', grid_type === 'dashed' ? '5, 5' : null);

    this.apply_tick_styling();

    if (this.model.get('grid_color')) {
      this.g_axisline
        .selectAll('.tick line')
        .style('stroke', this.model.get('grid_color'));
    }
  }

  update_color() {
    if (this.model.get('color')) {
      this.d3el
        .selectAll('.tick')
        .selectAll('text')
        .style('fill', this.model.get('color'));
      this.d3el.selectAll('.domain').style('stroke', this.model.get('color'));
    }
  }

  redraw_axisline() {
    // TODO: This call might not be necessary
    // TODO: Doesn't do what it states.
    // Has to redraw from a clean slate
    this.update_scales();

    //animate axis and grid lines on domain changes
    const animate = true;
    this.set_tick_values(animate);
    this.tickformat_changed();
    this.update_grid_lines(animate);
  }

  rescale_axis() {
    //function to be called when the range of the axis has been updated
    //or the axis has to be repositioned.
    this.set_scales_range();
    //The following calls to update domains are made as the domain
    //of the axis scale needs to be recalculated as the expansion due
    //to the padding depends on the size of the canvas because of the
    //presence of fixed pixel padding for the bounding box.
    this.update_axis_domain();
    this.update_scales();
    this.g_axisline.attr('transform', this.get_axis_transform());
    this.g_axisline.call(this.axis);
    const axisLabel = this.g_axisline.select('text.axislabel');
    applyAttrs(axisLabel, this.get_label_attributes());
    applyStyles(axisLabel, this.get_text_styling());
    // TODO: what follows is currently part of redraw_axisline
    this.set_tick_values();
    this.update_grid_lines();
    this.apply_tick_styling();
  }

  update_axis_domain() {
    const initial_range = this.vertical
      ? this.parent.padded_range('y', this.axis_scale.model)
      : this.parent.padded_range('x', this.axis_scale.model);
    const target_range = this.vertical
      ? this.parent.range('y')
      : this.parent.range('x');
    this.axis_scale.expandDomain(initial_range, target_range);
    this.axis.scale(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
  }

  parent_margin_updated() {
    // sets the new dimensions of the g element for the axis.
    this.rescale_axis();
  }

  update_visibility(model, visible) {
    this.d3el.style('display', visible ? 'inline' : 'none');
  }

  get_ticks_from_array_or_length(data_array?: any[]) {
    // This function is to be called when the ticks are passed explicitly
    // or the number of ticks to be drawn.
    // Have to do different things based on the type of the scale.
    // If an array is passed, then just scale and return equally spaced
    // points in the array. This is the way it is done for ordinal
    // scales.
    let step, max;
    const num_ticks = this.model.get('num_ticks');

    if (isOrdinalScale(this.axis_scale)) {
      data_array = this.axis_scale.scale.domain();
    }
    if (num_ticks !== undefined && num_ticks !== null && num_ticks < 2) {
      return [];
    }
    if (data_array) {
      if (
        num_ticks == undefined ||
        num_ticks == null ||
        data_array.length <= num_ticks
      ) {
        return data_array;
      } else {
        step = Math.floor(data_array.length / (num_ticks - 1));
        const indices = _.range(0, data_array.length, step);
        return indices.map((index) => {
          return data_array[index];
        });
      }
    }
    const scale_range = this.axis_scale.scale.domain();
    const max_index = this.axis_scale.scale.domain().length - 1;
    step =
      ((scale_range[max_index] as any) - (scale_range[0] as any)) /
      (num_ticks - 1);
    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      //For date scale, the dates have to be converted into milliseconds
      //since epoch time and then back.
      scale_range[0] = (scale_range[0] as Date).getTime();
      scale_range[max_index] = (scale_range[max_index] as Date).getTime();
      max = (scale_range[max_index] as any) + step * 0.5;
      const range_in_times = _.range(scale_range[0] as any, max, step);
      return range_in_times.map((elem) => {
        return new Date(elem);
      });
    } else {
      max = (scale_range[max_index] as any) + step * 0.5;
      return _.range(scale_range[0] as any, max, step);
    }
  }

  set_scale_promise(model: ScaleModel) {
    // Sets the child scale
    if (this.axis_scale) {
      this.axis_scale.remove();
    }
    // @ts-ignore
    return this.create_child_view(model).then((view: Scale) => {
      // Trigger the displayed event of the child view.
      this.displayed.then(() => {
        view.trigger('displayed');
      });
      this.axis_scale = view;
      this.axis_scale.on('domain_changed', this.redraw_axisline, this);
      this.axis_scale.on('highlight_axis', this.highlight, this);
      this.axis_scale.on('unhighlight_axis', this.unhighlight, this);
    });
  }

  update_scale(old, scale) {
    // Called when the child scale changes
    this.axis_scale.off();
    this.set_scale_promise(scale);
  }

  _get_digits(number) {
    return number === 0 ? 1 : Math.floor(Math.log10(Math.abs(number))) + 1;
  }

  _replace_trailing_zeros(str) {
    //regex to replace the trailing
    //zeros after the decimal point.
    //Handles the case of exponentially formatted string
    //TODO: Should be done in a single regex
    const e_index = str.search('e');
    if (e_index != -1) {
      return (
        str
          .substring(0, e_index)
          .replace(/(\.[0-9]*?)0+$/gi, '$1')
          .replace(/\.$/, '') + str.substring(e_index)
      );
    } else {
      return str.replace(/(\.[0-9]*?)0+$/gi, '$1').replace(/\.$/, '');
    }
  }

  get_format_func(prec: number) {
    if (prec === 0) {
      // format this as an integer
      return (number) => {
        return d3.format('d')(Math.round(number));
      };
    }
    //if it is -1, then it is a generic format
    const fmt_string = prec == -1 ? '' : '.' + prec;
    return (number) => {
      const str = d3.format(fmt_string + 'g')(number);
      const reg_str = str.replace(/-|\.|e/gi, '');
      if (reg_str.length < 6) {
        return this._replace_trailing_zeros(str);
      } else {
        //if length is more than 6, format it exponentially
        if (fmt_string === '') {
          //if fmt_string is "", then the number o/p can be
          //arbitrarily large
          let new_str = d3.format(fmt_string + 'e')(number);
          if (new_str.length >= 7) {
            //in the case of a round off error, setting the max
            //limit to be 6
            new_str = d3.format('.6e')(number);
          }
          return this._replace_trailing_zeros(new_str);
        } else {
          //Format with the precision required
          return this._replace_trailing_zeros(
            d3.format(fmt_string + 'e')(number)
          );
        }
      }
    };
  }

  _linear_scale_precision(): number {
    if (!(isLinearScale(this.axis_scale) || isColorScale(this.axis_scale))) {
      return -1;
    }
    let ticks: any[] = this.axis.tickValues();
    // Case where all data is concentrated into one point.
    if (ticks.length === 1) {
      return 1;
    }
    const diff = Math.abs(ticks[1] - ticks[0]);
    const max = Math.max(Math.abs(ticks[0]), Math.abs(ticks[ticks.length - 1]));

    const max_digits = this._get_digits(max);
    // number of digits in the max
    const diff_digits = this._get_digits(diff);
    // number of digits in the min

    const precision = Math.abs(max_digits - diff_digits);
    // difference in the number of digits. The number of digits we have
    // to display is the diff above + 1.
    if (max_digits >= 0 && diff_digits > 0) {
      if (max_digits <= 6) {
        // format the number as an integer
        return 0;
      } else {
        // precision plus 1 is returned here as they are the number of
        // digits to be displayed. Capped at 6
        return Math.min(precision, 6) + 1;
      }
    } else if (diff_digits <= 0) {
      // return math.abs(diff_digits) + max_digits + 1. Capped at 6.
      return Math.min(Math.abs(diff_digits) + max_digits, 6) + 1;
    }
  }

  linear_sc_format() {
    return this.get_format_func(this._linear_scale_precision());
  }

  date_sc_format() {
    // assumes that scale is a linear date scale
    if (!isDateScale(this.axis_scale)) {
      return;
    }
    let ticks: any[] = this.axis.tickValues();
    // diff is the difference between ticks in milliseconds
    const diff = Math.abs(ticks[1] - ticks[0]);

    const format_millisecond = d3.utcFormat('.%L'),
      format_second = d3.utcFormat(':%S'),
      format_minute = d3.utcFormat('%I:%M'),
      format_hour = d3.utcFormat('%I %p'),
      format_day = d3.utcFormat('%b %d'),
      format_month = d3.utcFormat('%b %Y'),
      format_year = d3.utcFormat('%Y');

    return (date) => {
      let div = 1000;
      if (Math.floor(diff / div) === 0) {
        //diff is less than a second
        if (d3.utcSecond(date) < date) {
          return format_millisecond(date);
        } else if (d3.utcMinute(date) < date) {
          return format_second(date);
        } else {
          return format_minute(date);
        }
      } else if (Math.floor(diff / (div *= 60)) === 0) {
        //diff is less than a minute
        if (d3.utcMinute(date) < date) {
          return format_second(date);
        } else {
          return format_minute(date);
        }
      } else if (Math.floor(diff / (div *= 60)) === 0) {
        // diff is less than an hour
        if (d3.utcHour(date) < date) {
          return format_minute(date);
        } else {
          return format_hour(date);
        }
      } else if (Math.floor(diff / (div *= 24)) === 0) {
        //diff is less than a day
        if (d3.utcDay(date) < date) {
          return format_hour(date);
        } else {
          return format_day(date);
        }
      } else if (Math.floor(diff / (div *= 27)) === 0) {
        //diff is less than a month
        if (d3.utcMonth(date) < date) {
          return format_day(date);
        } else {
          return format_month(date);
        }
      } else if (Math.floor(diff / (div *= 12)) === 0) {
        //diff is less than a year
        if (d3.utcMonth(date) < date) {
          return format_day(date);
        } else {
          return format_month(date);
        }
      } else {
        //diff is more than a year
        if (d3.utcMonth(date) < date) {
          return format_day(date);
        } else if (d3.utcYear(date) < date) {
          return format_month(date);
        } else {
          return format_year(date);
        }
      }
    };
  }

  log_sc_format() {
    return this.get_format_func(this._log_sc_precision());
  }

  _log_sc_precision(): number {
    if (!isLogScale(this.axis_scale)) {
      return -1;
    }
    let ticks: any[] = this.axis.tickValues();
    const ratio = Math.abs(Math.log10(ticks[1] / ticks[0]));

    if (ratio >= 0.301) {
      //format them as they are with the max_length of 6
      return -1;
    } else {
      //return a default of 3 digits of precision
      return 3;
    }
  }

  guess_tick_format() {
    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      return this.date_sc_format();
    } else if (
      isLinearScale(this.axis_scale) ||
      isColorScale(this.axis_scale)
    ) {
      return this.linear_sc_format();
    } else if (isLogScale(this.axis_scale)) {
      return this.log_sc_format();
    }
  }

  get width(): number {
    return this.parent.plotareaWidth;
  }

  get height(): number {
    return this.parent.plotareaHeight;
  }

  get margin() {
    return this.parent.margin;
  }

  calculateAutoSize() {
    // if offset is used, we don't take up any auto layout space
    if (this.offset_value !== undefined) {
      return 0;
    } else {
      const box = this.getBBox();
      const side = this.model.get('side');
      if (side == 'left' || side == 'right') {
        return box.width;
      }
      if (side == 'bottom' || side == 'top') {
        return box.height;
      }
    }
  }

  getBBox(): DOMRect {
    // To get the bounding box, we don't want to include the gridlines, so we disable them
    this.axis.tickSize(6); // Default value is 6
    this.g_axisline.call(this.axis);
    // we also don't use the label if the label_offset is negative
    const negativeLabelOffset =
      this.model.get('label_offset') && this.model.get('label_offset').length
        ? this.model.get('label_offset')[0] == '-'
        : false;
    if (negativeLabelOffset) {
      this.g_axisline.select('text.axislabel').style('display', 'none');
    }
    // note that we use getBoundingClientRect to take into account transformations (such as rotations)
    const box = this.d3el.node().getBoundingClientRect();
    // and restore the gridlines
    this.update_grid_lines();
    this.g_axisline.call(this.axis);
    // and restore label
    if (negativeLabelOffset) {
      this.g_axisline.select('text.axislabel').style('display', '');
    }
    return box;
  }

  setAutoOffset(autoOffset) {
    this.autoOffset = autoOffset;
  }

  autoOffset: number = 0;
  axis_scale: Scale;
  axis: d3.Axis<d3.AxisDomain>;
  d3el: d3.Selection<HTMLElement, any, any, any>;
  g_axisline: d3.Selection<SVGGElement, any, any, any>;
  label_offset: string;
  offset_scale: Scale;
  offset_value: any;
  parent: Figure;
  tick_format: (d: number) => string;
  vertical: boolean;
}
