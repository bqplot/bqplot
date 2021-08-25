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
import * as d3 from 'd3';
import * as utils from './utils';
import * as _ from 'underscore';
import { applyAttrs, applyStyles } from './utils';
import { Figure } from './Figure';
import { Scale } from './Scale';
import { isDateScale } from './DateScale';
import { isLogScale } from './LogScale';
import { isLinearScale } from './LinearScale';
import { isDateColorScale } from './DateColorScale';
import { isOrdinalScale } from './OrdinalScale';

const UNITS_ARRAY = ['em', 'ex', 'px'];

export class Axis extends WidgetView {
  initialize() {
    this.setElement(
      document.createElementNS(d3.namespaces.svg, 'g') as HTMLElement
    );
    this.d3el = d3.select(this.el);
    super.initialize.apply(this, arguments);
  }

  render() {
    this.d3el.style('display', this.model.get('visible') ? 'inline' : 'none');
    this.parent = this.options.parent;

    const scale_promise = this.set_scale_promise(this.model.get('scale'));
    const offset_promise = this.get_offset_promise();

    Promise.all([scale_promise, offset_promise]).then(() => {
      this.create_listeners();
      this.set_scales_range();
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
    this.model.on_some_change(
      ['side', 'orientation'],
      this.update_display,
      this
    );
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
    this.set_scales_range();
    this.append_axis();
  }

  set_tick_values(animate?: boolean) {
    const tick_values = this.model.get('tick_values');
    const num_ticks = this.model.get('num_ticks');

    if (
      tick_values !== undefined &&
      tick_values !== null &&
      tick_values.length > 0
    ) {
      this.axis.tickValues(tick_values);
    } else if (num_ticks !== undefined && num_ticks !== null) {
      // Here we don't rely on this.axis.ticks, because d3 does not always (almost never) respect it
      this.axis.tickValues(this.compute_tick_values(num_ticks));
    }
    this.axis.tickFormat(this.get_formatter());

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

  compute_tick_values(num_ticks) {
    const scale_domain = this.axis_scale.scale.domain();

    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      const epoch_times = (scale_domain as Date[]).map((date: Date) =>
        date.getTime()
      );
      const step =
        (epoch_times[epoch_times.length - 1] - epoch_times[0]) /
        (num_ticks - 1);

      const range_in_times = _.range(
        epoch_times[0],
        epoch_times[epoch_times.length - 1] + step * 0.5,
        step
      );
      return range_in_times.map((elem) => new Date(elem));
    }

    if (isOrdinalScale(this.axis_scale)) {
      if (num_ticks >= scale_domain.length) {
        return scale_domain;
      }

      // The ticks are only a subset of the domain
      const indices = _.range(
        0,
        scale_domain.length,
        scale_domain.length / num_ticks
      );
      return indices.map((index) => scale_domain[Math.floor(index)]);
    }

    // Continuous scale
    // @ts-ignore
    const step = (scale_domain[1] - scale_domain[0]) / (num_ticks - 1);
    // @ts-ignore
    return _.range(scale_domain[0], scale_domain[1] + step * 0.5, step);
  }

  get_formatter() {
    const tick_format = this.model.get('tick_format');

    if (tick_format === null) {
      return this.default_formatter();
    }

    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      return d3.utcFormat(tick_format);
    }

    if (isOrdinalScale(this.axis_scale)) {
      //TODO: This may not be the best way to do this. We can
      //check the instance of the elements in the domain and
      //apply the format depending on that.
      if (utils.is_valid_time_format(tick_format)) {
        return d3.utcFormat(tick_format);
      }
    }

    return d3.format(tick_format);
  }

  default_formatter() {
    if (isDateScale(this.axis_scale) || isDateColorScale(this.axis_scale)) {
      return this.default_date_formatter();
    }

    if (isOrdinalScale(this.axis_scale)) {
      return (d) => d.toString();
    }

    // Continuous scale
    const scale_domain = this.axis_scale.scale.domain() as number[];
    const min = Math.min(Math.abs(scale_domain[0]), Math.abs(scale_domain[1]));
    const max = Math.max(Math.abs(scale_domain[0]), Math.abs(scale_domain[1]));
    if (min <= 1e-4 || max >= 1e6) {
      return d3.format('.2e');
    }
  }

  default_date_formatter() {
    const scale_domain = this.axis_scale.scale.domain() as number[];
    const diff = scale_domain[1] - scale_domain[0];

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

  tickformat_changed() {
    this.axis.tickFormat(this.get_formatter());
    if (this.g_axisline) {
      this.g_axisline.call(this.axis);
    }
    this.apply_tick_styling();
  }

  apply_tick_styling() {
    // Applies current tick styling to all displayed ticks
    const tickText = this.g_axisline.selectAll('.tick text');
    applyStyles(tickText, this.model.get('tick_style'));
    tickText.attr('transform', this.get_tick_transforms());
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

    const is_vertical = this.model.get('orientation') === 'vertical';

    const initial_range = is_vertical
      ? this.parent.padded_range('y', this.axis_scale.model)
      : this.parent.padded_range('x', this.axis_scale.model);

    const target_range = is_vertical
      ? this.parent.range('y')
      : this.parent.range('x');

    this.axis_scale.expand_domain(initial_range, target_range);
    this.axis.scale(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
  }

  update_offset_scale_domain() {
    // Sets the domain (range of input values) of the offset scale

    const is_vertical = this.model.get('orientation') === 'vertical';

    if (this.offset_scale) {
      const initial_range = !is_vertical
        ? this.parent.padded_range('y', this.offset_scale.model)
        : this.parent.padded_range('x', this.offset_scale.model);

      const target_range = !is_vertical
        ? this.parent.range('y')
        : this.parent.range('x');

      this.offset_scale.expand_domain(initial_range, target_range);
    }
  }

  set_scales_range() {
    const is_vertical = this.model.get('orientation') === 'vertical';

    this.axis_scale.set_range(is_vertical ? [this.height, 0] : [0, this.width]);
    if (this.offset_scale) {
      this.offset_scale.set_range(
        is_vertical ? [0, this.width] : [this.height, 0]
      );
    }
  }

  create_axis() {
    // Creates the initial D3 axis and sets it on this.axis

    const is_vertical = this.model.get('orientation') === 'vertical';
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
    this.create_axis();
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
    this.set_tick_values();
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
    const is_vertical = this.model.get('orientation') === 'vertical';

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
    const is_vertical = this.model.get('orientation') === 'vertical';
    const side = this.model.get('side');

    if (is_vertical) {
      return side === 'right' ? this.width : 0;
    } else {
      return side === 'top' ? 0 : this.height;
    }
  }

  get_axis_transform() {
    const is_vertical = this.model.get('orientation') === 'vertical';
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
    const is_vertical = this.model.get('orientation') === 'vertical';
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

  update_label_offset(model, offset) {
    this.label_offset = this.calculate_label_offset();
    this.g_axisline.select('text.axislabel').attr('y', this.label_offset);
  }

  calculate_label_offset() {
    // If the label offset is not defined, depending on the orientation
    // of the axis, an offset is set.

    let label_offset = this.model.get('label_offset');
    const is_vertical = this.model.get('orientation') === 'vertical';
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
    const orientation = this.model.get('orientation');
    const is_x = orientation !== 'vertical';
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    let tickSize = orientation === 'vertical' ? -this.width : -this.height;
    let tickOffset = 0;

    //apply offsets if applicable
    if (this.offset_scale) {
      const offset = this.offset_scale.scale(this.offset_value);

      if (side === 'bottom' || side == 'right') {
        tickSize = -offset;
        tickOffset = is_x ? this.height - offset : this.width - offset;
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
        is_x ? 'y1' : 'x1',
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
    this.axis_scale.expand_domain(initial_range, target_range);
    this.axis.scale(this.axis_scale.scale as d3.AxisScale<d3.AxisDomain>);
  }

  parent_margin_updated() {
    // sets the new dimensions of the g element for the axis.
    this.rescale_axis();
  }

  update_visibility(model, visible) {
    this.d3el.style('display', visible ? 'inline' : 'none');
  }

  set_scale_promise(model) {
    // Sets the child scale
    if (this.axis_scale) {
      this.axis_scale.remove();
    }
    return this.create_child_view(model).then((view) => {
      // Trigger the displayed event of the child view.
      this.displayed.then(() => {
        view.trigger('displayed');
      });
      this.axis_scale = view as WidgetView as Scale;
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

  get width(): number {
    return (
      this.parent.width - this.parent.margin.right - this.parent.margin.left
    );
  }

  get height(): number {
    return (
      this.parent.height - this.parent.margin.top - this.parent.margin.bottom
    );
  }

  get margin() {
    return this.parent.margin;
  }

  axis_scale: Scale;
  axis: d3.Axis<d3.AxisDomain>;
  d3el: d3.Selection<HTMLElement, any, any, any>;
  g_axisline: d3.Selection<SVGGElement, any, any, any>;
  label_offset: string;
  offset_scale: Scale;
  offset_value: any;
  parent: Figure;
  vertical: boolean;
}
