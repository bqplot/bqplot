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
import { applyStyles, getDate } from './utils';
import { PieModel, Slice } from './PieModel';

export class Pie extends Mark {
  async render() {
    const base_creation_promise = super.render();
    this.selected_indices = this.model.get('selected');
    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');

    this.display_el_classes = ['slice', 'text'];

    this.pieSelection = this.d3el.append('g').attr('class', 'pie');
    this.pieSelection.append('g').attr('class', 'slices');
    this.pieSelection.append('g').attr('class', 'labels');
    this.pieSelection.append('g').attr('class', 'lines');

    const radius = this.model.get('radius');
    const inner_radius = this.model.get('inner_radius');

    const display_labels = this.model.get('display_labels');

    if (display_labels === 'outside') {
      this.arc = d3
        .arc()
        .outerRadius(radius * 0.8)
        .innerRadius(inner_radius * 0.8);

      this.outerArc = d3
        .arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);
    } else {
      this.arc = d3.arc().outerRadius(radius).innerRadius(inner_radius);
    }

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    await base_creation_promise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
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
    // If no scale for "x" or "y" is specified, figure scales are used.
    const x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
    const y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

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

    this.listenTo(this.model, 'data_updated', function () {
      this.draw(true);
    });
    this.listenTo(this.model, 'colors_updated', this.updateSlices);
    this.model.on_some_change(
      ['inner_radius', 'radius'],
      () => {
        this.compute_view_padding();
        this.updateRadius(true);
      },
      this
    );
    this.model.on_some_change(
      ['colors', 'stroke', 'opacities'],
      this.updateSlices,
      this
    );
    this.model.on_some_change(
      ['x', 'y'],
      () => {
        this.positionCenter(true);
      },
      this
    );
    this.model.on_some_change(
      [
        'display_labels',
        'label_color',
        'font_size',
        'font_weight',
        'display_values',
        'values_format',
      ],
      () => {
        this.updateLabels(true);
      },
      this
    );
    this.model.on_some_change(
      ['start_angle', 'end_angle', 'sort'],
      () => {
        this.draw(true);
      },
      this
    );

    this.listenTo(this.model, 'labels_updated', () => {
      this.updateLabels(true);
      this.updatePolylines(true);
    });

    this.listenTo(this.model, 'change:selected', () => {
      this.selected_indices = this.model.get('selected');
      this.apply_styles();
    });
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.parent, 'bg_clicked', () => {
      this.event_dispatcher('parent_clicked');
    });
  }

  process_click(interaction) {
    super.process_click(interaction);

    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.reset_selection;
      this.event_listeners.element_clicked = this.click_handler;
    }
  }

  relayout() {
    this.set_ranges();
    this.positionCenter();
    this.updateRadius();
  }

  private positionCenter(animate?: boolean) {
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;
    const x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
    const y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;
    const x =
      x_scale.model.type === 'date'
        ? getDate(this.model.get('x'))
        : this.model.get('x');
    const y =
      y_scale.model.type === 'date'
        ? getDate(this.model.get('y'))
        : this.model.get('y');
    const transform =
      'translate(' +
      (x_scale.scale(x) + x_scale.offset) +
      ', ' +
      (y_scale.scale(y) + y_scale.offset) +
      ')';
    this.pieSelection
      .transition('positionCenter')
      .duration(animation_duration)
      .attr('transform', transform);
  }

  private updateRadius(animate?: boolean) {
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    const radius = this.model.get('radius');
    const inner_radius = this.model.get('inner_radius');
    const display_labels = this.model.get('display_labels');

    if (display_labels === 'inside') {
      this.arc.outerRadius(radius).innerRadius(inner_radius);
    } else if (display_labels === 'outside') {
      this.arc.outerRadius(radius * 0.8).innerRadius(inner_radius * 0.8);
      this.outerArc.innerRadius(radius * 0.9).outerRadius(radius * 0.9);
    }

    const slices = this.pieSelection.select('.slices');
    const labels = this.pieSelection.select('.labels');
    const lines = this.pieSelection.select('.lines');

    const that = this;

    slices
      .selectAll('.slice')
      .transition('update_radius')
      .duration(animation_duration)
      .attr('d', this.arc);

    if (display_labels === 'inside') {
      labels
        .selectAll('text')
        .transition('update_radius')
        .duration(animation_duration)
        .attr('transform', (d: d3.DefaultArcObject) => {
          return 'translate(' + that.arc.centroid(d) + ')';
        });
    } else if (display_labels === 'outside') {
      labels
        .selectAll('text')
        .transition('update_radius')
        .duration(animation_duration)
        .attr('transform', (d: d3.DefaultArcObject) => {
          const pos = that.outerArc.centroid(d);
          pos[0] = radius * (that.midAngleLocation(d) === 'left' ? -1 : 1);
          return 'translate(' + pos + ')';
        });

      lines
        .selectAll('polyline')
        .transition('update_radius')
        .duration(animation_duration)
        .attr('points', (d: d3.DefaultArcObject) => {
          const pos = that.outerArc.centroid(d);
          pos[0] =
            radius * 0.95 * (that.midAngleLocation(d) === 'left' ? -1 : 1);
          return [
            that.arc.centroid(d),
            that.outerArc.centroid(d),
            pos,
          ].toString();
        });
    }
  }

  private midAngleLocation(arc_data) {
    // decides if the location of the mid angle of the arc is toward left or right (to aid the
    // placement of label text)
    const mid_angle = (arc_data.startAngle + arc_data.endAngle) / 2;
    return mid_angle > Math.PI || (mid_angle < 0 && mid_angle > -Math.PI)
      ? 'left'
      : 'right';
  }

  draw(animate?: boolean) {
    this.set_ranges();
    this.positionCenter(animate);

    this.d3Pie = d3
      .pie<Slice>()
      .startAngle((this.model.get('start_angle') * 2 * Math.PI) / 360)
      .endAngle((this.model.get('end_angle') * 2 * Math.PI) / 360)
      .value((d: Slice) => {
        return d.size;
      });

    if (!this.model.get('sort')) {
      this.d3Pie.sort(null);
    }

    this.updateSlices(animate);
    this.updateLabels(animate);
    this.updatePolylines(animate);
  }

  private updateSlices(animate?: boolean) {
    const that = this;
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    // update pie slices
    const slices = this.pieSelection
      .select('.slices')
      .selectAll('.slice')
      .data(this.d3Pie(this.model.mark_data));

    const stroke = this.model.get('stroke');

    slices
      .enter()
      .append('path')
      .attr('class', 'slice')
      .each(function (d) {
        this._current = d;
      })
      .on('click', (d, i) => {
        return that.event_dispatcher('element_clicked', { data: d, index: i });
      })
      .merge(slices)
      .transition('draw')
      .duration(animation_duration)
      .style('fill', (d, i) => that.get_mark_color(d.data, i))
      .style('stroke', stroke)
      .style('opacity', (d, i) => that.get_mark_opacity(d.data, i))
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = d;
        return function (t) {
          return that.arc(interpolate(t));
        };
      });

    slices
      .exit()
      .transition('remove')
      .duration(animation_duration)
      .style('opacity', 0)
      .remove();

    this.apply_styles();
  }

  private updateLabels(animate?: boolean) {
    const that = this;
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    // Update labels
    const display_labels = this.model.get('display_labels');
    const display_values = this.model.get('display_values');

    const values_format = d3.format(this.model.get('values_format'));

    const labels = this.pieSelection
      .select('.labels')
      .selectAll('text')
      .data(this.d3Pie(this.model.mark_data));

    const labelsTransition = labels
      .enter()
      .append('text')
      .classed('pie_label', true)
      .attr('dy', '.35em')
      .style('opacity', 0)
      .each(function (d) {
        this._current = d;
      })
      .merge(labels)
      .transition('draw')
      .duration(animation_duration)
      .text((d) => {
        if (d.data.label === '') {
          return '';
        }

        if (display_values) {
          return d.data.label + ': ' + values_format(d.data.size);
        }

        return d.data.label;
      })
      .style('font-weight', this.model.get('font_weight'))
      .style('font-size', this.model.get('font_size'))
      .style('opacity', (d) =>
        display_labels === 'none' || d.value == 0 ? 0 : 1
      );

    const color = this.model.get('label_color');
    if (color !== undefined) {
      labelsTransition.style('fill', color);
    }

    if (display_labels === 'inside') {
      labelsTransition
        .attr('transform', (d) => 'translate(' + this.arc.centroid(d) + ')')
        .style('text-anchor', 'middle');
    } else if (display_labels === 'outside') {
      labelsTransition
        .attrTween('transform', function (d) {
          const interpolate = d3.interpolate(this._current, d);
          const _this = this;
          return function (t) {
            const d2 = interpolate(t);
            _this._current = d2;
            const pos = that.outerArc.centroid(d2);
            pos[0] =
              that.model.get('radius') *
              (that.midAngleLocation(d) === 'left' ? -1 : 1);
            return 'translate(' + pos + ')';
          };
        })
        .styleTween('text-anchor', function (d) {
          const interpolate = d3.interpolate(this._current, d);
          return function (t) {
            const d2 = interpolate(t);
            return that.midAngleLocation(d2) === 'left' ? 'end' : 'start';
          };
        });
    }

    labels.exit().remove();
  }

  updatePolylines(animate?: boolean) {
    const that = this;
    const animation_duration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    const display_labels = this.model.get('display_labels');

    const polylines = this.pieSelection
      .select('.lines')
      .selectAll('polyline')
      .data(this.d3Pie(this.model.mark_data));

    const polylinesTransition = polylines
      .enter()
      .append('polyline')
      .each(function (d) {
        this._current = d;
      })
      .merge(polylines)
      .transition('draw')
      .duration(animation_duration)
      .style('opacity', (d: any) =>
        display_labels !== 'outside' || d.value == 0 || d.data.label === ''
          ? 0
          : 1
      );

    if (display_labels === 'outside') {
      polylinesTransition.attrTween('points', function (d: any) {
        const interpolate = d3.interpolate(this._current, d);
        const _this = this;
        return function (t) {
          const d2 = interpolate(t);
          _this._current = d2;
          const pos = that.outerArc.centroid(d2);
          pos[0] =
            that.model.get('radius') *
            0.95 *
            (that.midAngleLocation(d2) === 'left' ? -1 : 1);
          return [
            that.arc.centroid(d2),
            that.outerArc.centroid(d2),
            pos,
          ].toString();
        };
      });
    }

    polylines.exit().remove();
  }

  clear_style(style_dict, indices?) {
    // Function to clear the style of a dict on some or all the elements of the
    // chart. If indices is null, clears the style on all elements. If
    // not, clears on only the elements whose indices are matching.
    let elements = this.pieSelection.selectAll('.slice');
    if (indices) {
      elements = elements.filter((d, index) => {
        return indices.indexOf(index) !== -1;
      });
    }
    const clearing_style = {};
    for (const key in style_dict) {
      clearing_style[key] = null;
    }
    applyStyles(elements, clearing_style);
  }

  set_style_on_elements(style, indices?) {
    // If the index array is undefined or of length=0, exit the
    // function without doing anything
    if (indices === undefined || indices === null || indices.length === 0) {
      return;
    }
    let elements = this.pieSelection.selectAll('.slice');
    elements = elements.filter((data, index) => {
      return indices.indexOf(index) !== -1;
    });
    applyStyles(elements, style);
  }

  set_default_style(indices?) {
    // For all the elements with index in the list indices, the default
    // style is applied.
    const stroke = this.model.get('stroke');

    // Update pie slices
    this.pieSelection
      .select('.slices')
      .selectAll('.slice')
      .style('fill', (d, i) => this.get_mark_color(d.data, i))
      .style('stroke', stroke)
      .style('opacity', (d, i) => this.get_mark_opacity(d.data, i));
  }

  click_handler(args) {
    const index = args.index;
    const that = this;
    const idx = this.model.get('selected') || [];
    let selected: number[] = Array.from(idx);
    // index of slice i. Checking if it is already present in the list.
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
        //slice which has been clicked
        const min_index = selected.length !== 0 ? d3.min(selected) : -1;
        const max_index =
          selected.length !== 0
            ? d3.max(selected)
            : that.model.mark_data.length;
        if (index > max_index) {
          _.range(max_index + 1, index).forEach((i) => {
            selected.push(i);
          });
        } else if (index < min_index) {
          _.range(index + 1, min_index).forEach((i) => {
            selected.push(i);
          });
        }
      } else if (!accelKey) {
        selected = [];
      }
      // updating the array containing the slice indexes selected
      // and updating the style
      selected.push(index);
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
    this.selected_indices = selected;
    this.apply_styles();
  }

  reset_selection() {
    this.model.set('selected', null);
    this.touch();
    this.selected_indices = null;
    this.clear_style(this.selected_style);
    this.clear_style(this.unselected_style);
    this.set_default_style();
  }

  compute_view_padding() {
    const scales = this.model.getScales();
    const r = d3.max([
      this.model.get('radius'),
      this.model.get('inner_radius'),
    ]);

    const xPadding = scales.x ? r + 1 : 0;
    const yPadding = scales.y ? r + 1 : 0;
    if (xPadding !== this.xPadding || yPadding !== this.yPadding) {
      this.xPadding = xPadding;
      this.yPadding = yPadding;
      this.trigger('mark_padding_updated');
    }
  }

  private d3Pie: d3.Pie<any, Slice>;
  // private pieSelection: d3.Selection<SVGGElement, Slice, any, any>;
  private pieSelection: any;
  private arc: d3.Arc<any, d3.DefaultArcObject>;
  private outerArc: d3.Arc<any, d3.DefaultArcObject>;

  model: PieModel;
}
