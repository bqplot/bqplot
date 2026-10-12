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
import { Lines } from './Lines';

export class FlexLine extends Lines {
  render(): Promise<void> {
    const base_render_promise = super.render.apply(this);

    return base_render_promise.then(() => {
      this.create_listeners();
      this.draw();
    });
  }

  set_ranges(): void {
    super.set_ranges();
    const width_scale = this.scales.width;
    if (width_scale) {
      width_scale.setRange([0.5, this.model.get('stroke_width')]);
    }
  }

  create_listeners(): void {
    super.create_listeners();
  }

  draw_legend(
    elem: d3.Selection<any, any, any, any>,
    x_disp: number,
    y_disp: number,
    inter_x_disp: number,
    inter_y_disp: number
  ): [number, number] {
    const g_elements = elem
      .selectAll('.legend' + this.uuid)
      .data(this.model.mark_data, (d: any) => d.name);

    const rect_dim = inter_y_disp * 0.8;

    const g_enter = g_elements
      .enter()
      .append('g')
      .attr('class', 'legend' + this.uuid)
      .attr('transform', (d, i) => {
        return 'translate(0, ' + (i * inter_y_disp + y_disp) + ')';
      });

    g_enter
      .append('line')
      .style('stroke', (d, i) => this.get_mark_color(d, i))
      .attr('x1', 0)
      .attr('x2', rect_dim)
      .attr('y1', rect_dim / 2)
      .attr('y2', rect_dim / 2);

    g_enter
      .append('text')
      .attr('class', 'legendtext')
      .attr('x', rect_dim * 1.2)
      .attr('y', rect_dim / 2)
      .attr('dy', '0.35em')
      .text((d, i) => this.model.get('labels')[i])
      .style('fill', (d, i) => this.get_mark_color(d, i));

    const max_length =
      d3.max(this.model.get('labels'), (d: any) => {
        return d ? d.length : 0;
      }) || 0;

    g_elements.exit().remove();
    return [this.model.mark_data.length, max_length as number];
  }

  set_positional_scales(): void {
    const x_scale = this.scales.x,
      y_scale = this.scales.y;
    this.listenTo(x_scale, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
    this.listenTo(y_scale, 'domain_changed', () => {
      if (!this.model.dirty) {
        this.draw();
      }
    });
  }

  initialize_additional_scales(): void {
    const color_scale = this.scales.color;
    if (color_scale) {
      this.listenTo(color_scale, 'domain_changed', () => {
        this.draw();
      });
      color_scale.on('color_scale_range_changed', this.draw, this);
    }
  }

  draw(): void {
    this.set_ranges();
    const xScale = this.scales.x;
    const yScale = this.scales.y;

    let curves_sel: d3.Selection<any, any, any, any> = this.d3el
      .selectAll('.curve')
      .data(this.model.mark_data, (d: any) => d.name);

    curves_sel
      .exit()
      .transition('draw')
      .duration(this.parent.model.get('animation_duration'))
      .remove();

    const newCurves = curves_sel.enter().append('g').attr('class', 'curve');
    newCurves
      .append('text')
      .attr('class', 'curve_label')
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle');

    curves_sel = newCurves.merge(curves_sel);

    curves_sel
      .select('.curve_label')
      .attr(
        'display',
        this.model.get('labels_visibility') === 'label' ? 'inline' : 'none'
      )
      .text((d: any, i: number) => this.model.get('labels')[i] || d.name)
      .attr('x', (d: any) => {
        const last = d.values[d.values.length - 1];
        return last ? xScale.scale(last.x2) - 5 : 0;
      })
      .attr('y', (d: any) => {
        const last = d.values[d.values.length - 1];
        return last ? yScale.scale(last.y2) : 0;
      });

    const x_scale = this.scales.x,
      y_scale = this.scales.y;

    curves_sel.nodes().forEach((elem, index) => {
      let lines = d3
        .select(elem)
        .selectAll<SVGLineElement, any>('line')
        .data(this.model.mark_data[index].values);
      lines = lines.enter().append('line').merge(lines);
      lines
        .attr('class', 'line-elem')
        .attr('x1', (d: any) => {
          return x_scale.scale(d.x1);
        })
        .attr('x2', (d: any) => {
          return x_scale.scale(d.x2);
        })
        .attr('y1', (d: any) => {
          return y_scale.scale(d.y1);
        })
        .attr('y2', (d: any) => {
          return y_scale.scale(d.y2);
        })
        .attr('stroke', (d: any, i: number) => this.get_mark_color(d, i))
        .attr('stroke-width', (d: any) => {
          return this.get_element_width(d);
        });
    });
  }

  get_element_width(d: { size?: number }): number {
    const width_scale = this.scales.width;
    if (width_scale !== undefined && d.size !== undefined) {
      return width_scale.scale(d.size);
    }
    return this.model.get('stroke_width');
  }

  relayout(): void {
    this.set_ranges();

    const x_scale = this.scales.x,
      y_scale = this.scales.y;

    this.d3el
      .selectAll('.curve')
      .selectAll('.line-elem')
      .transition('relayout')
      .duration(this.parent.model.get('animation_duration'))
      .attr('x1', (d: any) => x_scale.scale(d.x1))
      .attr('x2', (d: any) => x_scale.scale(d.x2))
      .attr('y1', (d: any) => y_scale.scale(d.y1))
      .attr('y2', (d: any) => y_scale.scale(d.y2));

    this.d3el
      .selectAll('.curve')
      .select('.curve_label')
      .attr('x', (d: any) => {
        const last = d.values[d.values.length - 1];
        return last ? x_scale.scale(last.x2) - 5 : 0;
      })
      .attr('y', (d: any) => {
        const last = d.values[d.values.length - 1];
        return last ? y_scale.scale(last.y2) : 0;
      });
  }

  update_labels(): void {
    const labels = this.model.get('labels');
    this.d3el
      .selectAll('.curve')
      .select('.curve_label')
      .text((d: any, i: number) => labels[i] || d.name);
  }

  update_legend_labels(): void {
    const labels_visibility = this.model.get('labels_visibility');
    const display = labels_visibility === 'label' ? 'inline' : 'none';
    this.d3el.selectAll('.curve_label').attr('display', display);
  }
}
