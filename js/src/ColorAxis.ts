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
import { ColorScale, ColorScaleModel } from 'bqscales';
// var d3 =Object.assign({}, require("d3-axis"), require("d3-scale"), require("d3-selection"), require("d3-selection-multi"));
import { Axis } from './Axis';
import { applyAttrs } from './utils';

class ColorBar extends Axis {
  async render() {
    this.parent = this.options.parent;
    this.vertical = ['left', 'right'].includes(this.model.get('side'));

    const scale_promise = this.set_scale(this.model.get('scale'));
    this.side = this.model.get('side');
    this.x_offset = 100;
    this.y_offset = 40;
    this.bar_height = 20;
    this.d3el
      .attr('class', 'ColorBar')
      .attr('display', this.model.get('visible') ? 'inline' : 'none')
      .attr('transform', this.get_topg_transform());

    this.ordinal = false;
    this.num_ticks = this.model.get('num_ticks');

    await scale_promise;

    this.create_listeners();
    this.create_axis();
    this.set_tick_values();
    this.tick_format = this.generate_tick_formatter();
    this.set_scales_range();
    this.append_axis();
  }

  create_listeners() {
    this.listenTo(this.model, 'change:scale', function (model, value) {
      this.update_scale(model.previous('scale'), value);
      // TODO: rescale_axis does too many things. Decompose
      this.axis.scale(this.axis_scale.scale); // TODO: this is in redraw_axisline
      this.rescale_axis();
    });

    this.listenTo(this.model, 'change:tick_format', this.tickformat_changed);
    this.axis_scale.on('domain_changed', this.redraw_axisline, this);
    this.axis_scale.on('color_scale_range_changed', this.redraw_axis, this);
    this.axis_scale.on('highlight_axis', this.highlight, this);
    this.axis_scale.on('unhighlight_axis', this.unhighlight, this);

    this.listenTo(this.parent, 'margin_updated', this.parent_margin_updated);
    this.listenTo(this.model, 'change:visible', this.update_visibility);
    this.listenTo(this.model, 'change:label', this.update_label);
    this.listenTo(this.model, 'change:side', this.update_display);
  }

  create_axis(): void {
    this.side = this.model.get('side');
    this.vertical = ['left', 'right'].includes(this.model.get('side'));
    if (this.vertical) {
      this.axis =
        this.side === 'right'
          ? d3.axisRight(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            )
          : d3.axisLeft(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            );
    } else {
      this.axis =
        this.side === 'top'
          ? d3.axisTop(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            )
          : d3.axisBottom(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            );
    }
  }

  update_display() {
    this.g_axisline.remove();
    this.create_axis();
    this.g_axisline = this.d3el
      .select('#colorBarG' + this.cid)
      .append('g')
      .attr('class', 'axis');
    this.rescale_axis();
    this.d3el
      .select('#colorBarG' + this.cid)
      .attr('transform', this.get_colorbar_transform());
    this.d3el
      .select('#colorBarG' + this.cid)
      .select('.g-rect')
      .attr('transform', this.vertical ? 'rotate(-90)' : '');
    this.redraw_axisline();
  }

  set_scale(model: ColorScaleModel) {
    // Sets the child scale
    const that = this;
    if (this.axis_scale) {
      this.axis_scale.remove();
    }
    return this.create_child_view(model).then((view) => {
      // Trigger the displayed event of the child view.
      that.displayed.then(() => {
        view.trigger('displayed');
      });
      that.axis_scale = view as WidgetView as ColorScale;
      // TODO: eventually removes what follows
      if (that.axis_scale.model.type === 'date_color_linear') {
        that.axis_line_scale = d3.scaleUtc().nice();
      } else if (that.axis_scale.model.type === 'ordinal') {
        that.axis_line_scale = d3.scaleBand();
        that.ordinal = true;
      } else {
        that.axis_line_scale = d3.scaleLinear();
      }
    });
  }

  append_axis() {
    // The label is allocated a space of 100px. If the label
    // occupies more than 100px then you are out of luck.
    if (
      this.model.get('label') !== undefined &&
      this.model.get('label') !== null
    ) {
      this.d3el
        .append('g')
        .attr('transform', this.get_label_transform())
        .attr('class', 'axis label_g')
        .append('text')
        .append('tspan')
        .attr('id', 'text_elem')
        .attr('dy', '0.5ex')
        .attr('class', 'axislabel')
        .style('text-anchor', this.vertical ? 'middle' : 'end')
        .text(this.model.get('label'));
    }
    const colorBar = this.d3el.append('g').attr('id', 'colorBarG' + this.cid);

    this.draw_color_bar();
    this.set_axisline_domain();

    this.g_axisline = colorBar.append('g').attr('class', 'axis');

    if (this.vertical) {
      this.axis =
        this.side === 'right'
          ? d3.axisRight(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            )
          : d3.axisLeft(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            );
    } else {
      this.axis =
        this.side === 'top'
          ? d3.axisTop(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            )
          : d3.axisBottom(
              this.axis_scale.scale as d3.ScaleLinear<
                any,
                any
              > as d3.AxisScale<d3.AxisDomain>
            );
    }
    this.axis = this.axis.tickFormat(this.tick_format);
    this.redraw_axisline();
  }

  draw_color_bar() {
    const colorBar = this.d3el.select('#colorBarG' + this.cid);
    colorBar.attr('transform', this.get_colorbar_transform());
    const that = this;
    colorBar.selectAll('.g-rect').remove();
    colorBar.selectAll('.g-defs').remove();

    this.colors = this.axis_scale.scale.range() as number[];
    const colorSpacing = 100 / (this.colors.length - 1);

    if (this.ordinal) {
      const bar_width = this.get_color_bar_width() / this.colors.length;
      let rects = colorBar
        .append('g')
        .attr('class', 'g-rect axis')
        .selectAll('rect')
        .data(this.colors);

      rects = rects
        .enter()
        .append('rect')
        .attr('y', 0)
        .attr('height', this.bar_height)
        .attr('width', bar_width)
        .style('fill', (d) => {
          return d;
        })
        .merge(rects as d3.Selection<SVGRectElement, number, SVGGElement, any>);

      if (this.vertical) {
        rects.attr('x', (d, i) => {
          return i * bar_width - (that.height - 2 * that.x_offset);
        });
      } else {
        rects.attr('x', (d, i) => {
          return i * bar_width;
        });
      }
    } else {
      const gradient = colorBar
        .append('g')
        .attr('class', 'g-defs')
        .append('defs')
        .append('linearGradient');
      applyAttrs(gradient, {
        id: 'colorBarGradient' + this.cid,
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '0%',
      });
      const stop = gradient
        .selectAll('stop')
        .data(this.colors)
        .enter()
        .append('stop');
      applyAttrs(stop, {
        offset: function (d, i) {
          return colorSpacing * i + '%';
        },
        'stop-color': function (d, i) {
          return that.colors[i];
        },
        'stop-opacity': 1,
      });

      const rect = colorBar
        .append('g')
        .attr('class', 'g-rect axis')
        .append('rect');
      applyAttrs(rect, {
        width: this.get_color_bar_width(),
        height: this.bar_height,
        x: this.vertical ? -(this.height - 2 * this.x_offset) : 0,
        y: 0,
        'stroke-width': 1,
      }).style('fill', 'url(#colorBarGradient' + this.cid + ')');
    }
    if (this.vertical) {
      colorBar.select('.g-rect').attr('transform', 'rotate(-90)');
    }
  }

  get_topg_transform() {
    if (this.parent.autoLayout) {
      if (this.vertical) {
        if (this.side === 'right') {
          return (
            'translate(' + String(this.parent.width + this.autoOffset) + ', 0)'
          );
        }
        return (
          'translate(' + String(-this.bar_height - this.autoOffset) + ', 0)'
        );
      } else {
        if (this.side === 'top') {
          return (
            'translate(0, ' + String(-this.bar_height - this.autoOffset) + ')'
          );
        }
        return (
          'translate(0, ' + String(this.parent.height + this.autoOffset) + ')'
        );
      }
    }

    const em = 12;
    if (this.vertical) {
      if (this.side === 'right') {
        return (
          'translate(' +
          String(
            this.get_basic_transform() + this.margin.right / 2 - this.bar_height
          ) +
          ', 0)'
        );
      }
      return (
        'translate(' +
        String(
          this.get_basic_transform() - this.margin.left / 2 + this.bar_height
        ) +
        ', 0)'
      );
    } else {
      if (this.side === 'top') {
        return (
          'translate(0, ' +
          String(
            this.get_basic_transform() -
              this.margin.top +
              this.bar_height +
              2 * em
          ) +
          ')'
        );
      }
      return (
        'translate(0, ' +
        String(
          this.get_basic_transform() +
            this.margin.bottom -
            this.bar_height -
            2 * em
        ) +
        ')'
      );
    }
  }

  calculateAutoSize() {
    const box = this.g_axisline.node().getBoundingClientRect();
    const side = this.model.get('side');
    if (side == 'left' || side == 'right') {
      return box.width + this.bar_height;
    }
    if (side == 'bottom' || side == 'top') {
      return box.height + this.bar_height;
    }
    const axisWidth = this.g_axisline.node().getBoundingClientRect().width;
    return this.bar_height + axisWidth;
  }

  get_label_transform() {
    if (this.vertical) {
      return (
        'translate(' +
        (this.side === 'right' ? this.bar_height / 2 : -this.bar_height / 2) +
        ', ' +
        (this.x_offset - 15) +
        ')'
      );
    }
    return (
      'translate(' + (this.x_offset - 5) + ', ' + this.bar_height / 2 + ')'
    );
  }

  get_colorbar_transform() {
    if (this.vertical) {
      return 'translate(0, ' + String(this.x_offset) + ')';
    }
    return 'translate(' + String(this.x_offset) + ', 0)';
  }

  set_axisline_scale_range() {
    const range = this.vertical
      ? [this.height - 2 * this.x_offset, 0]
      : [0, this.width - 2 * this.x_offset];
    if (this.ordinal) {
      (this.axis_line_scale as d3.ScaleBand<string>)
        .rangeRound(range as [number, number])
        .padding(0.05);
    } else {
      const mid = this.axis_scale.model.mid;
      if (mid === undefined || mid === null) {
        this.axis_line_scale.range(range);
      } else {
        this.axis_line_scale.range([
          range[0],
          (range[0] + range[1]) * 0.5,
          range[1],
        ]);
      }
    }
  }

  set_scales_range() {
    //Setting the range of the color scale
    this.axis_scale.setRange();
    this.set_axisline_scale_range();
  }

  get_color_bar_width() {
    const width = this.vertical
      ? this.height - 2 * this.x_offset
      : this.width - 2 * this.x_offset;

    return width >= 0 ? width : 0;
  }

  update_label() {
    this.d3el.select('#text_elem').text(this.model.get('label'));
  }

  rescale_axis() {
    // rescale the axis
    this.set_axisline_scale_range();
    // shifting the entire g of the color bar first.
    this.d3el.attr('transform', this.get_topg_transform());
    const that = this;
    const bar_width = this.get_color_bar_width() / this.colors.length;
    if (this.ordinal) {
      const rectangles = this.d3el
        .select('#colorBarG' + this.cid)
        .select('.g-rect')
        .selectAll('rect')
        .attr('width', bar_width);
      if (this.vertical) {
        rectangles.attr('x', (d, i) => {
          return i * bar_width - (that.height - 2 * that.x_offset);
        });
      } else {
        rectangles.attr('x', (d, i) => {
          return i * bar_width;
        });
      }
    } else {
      this.d3el
        .select('#colorBarG' + this.cid)
        .select('.g-rect')
        .selectAll('rect')
        .attr('width', this.get_color_bar_width())
        .attr('x', this.vertical ? -(this.height - 2 * this.x_offset) : 0);
    }
    if (
      this.model.get('label') !== undefined &&
      this.model.get('label') !== null
    ) {
      this.d3el
        .select('.label_g')
        .attr('transform', this.get_label_transform())
        .select('#text_elem')
        .style('text-anchor', this.vertical ? 'middle' : 'end');
    }
    this.redraw_axisline();
  }

  redraw_axisline() {
    if (this.axis) {
      this.set_axisline_domain();
      // We need to set the range of the axis line scale here again.
      // Only because, if the domain has changed from a two element
      // array to a three element one, the range of the axis has to
      // be changed accordingly.
      this.set_axisline_scale_range();
      this.axis.scale(this.axis_line_scale);
      this.set_tick_values();

      let transform;
      if (this.vertical) {
        transform =
          'translate(' + (this.side === 'right' ? this.bar_height : 0) + ', 0)';
      } else {
        transform =
          'translate(0, ' + (this.side === 'top' ? 0 : this.bar_height) + ')';
      }
      if (this.g_axisline) {
        this.g_axisline.attr('transform', transform).call(this.axis);
      }
    }
  }

  set_axisline_domain() {
    const domain = this.axis_scale.scale.domain();
    if (this.ordinal) {
      this.axis_line_scale.domain(domain);
    } else {
      const mid = this.axis_scale.model.mid;
      if (mid === undefined || mid === null) {
        this.axis_line_scale.domain([domain[0], domain[domain.length - 1]]);
      } else {
        this.axis_line_scale.domain([
          domain[0],
          mid,
          domain[domain.length - 1],
        ]);
      }
    }
  }

  redraw_axis() {
    this.draw_color_bar();
    this.redraw_axisline();
  }

  axis_scale: ColorScale;
  axis_line_scale:
    | d3.ScaleLinear<number, number>
    | d3.ScaleTime<number, number>
    | d3.ScaleBand<string>;
  ordinal: boolean;
  bar_height: number;
  side: string;
  x_offset: number;
  y_offset: number;
  num_ticks: number;
  colors: number[];
}

export { ColorBar as ColorAxis };
