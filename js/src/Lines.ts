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
import * as d3Shape from 'd3-shape';
// var d3 =Object.assign({}, require("d3-array"), require("d3-selection"), require("d3-shape"), require("d3-transition"));
import { Mark } from './Mark';
import { LinesModel } from './LinesModel';
import { BaseSelector } from './Selector';
import { SelectorModel } from './SelectorModel';
import * as markers from './Markers';

const bqSymbol = markers.symbol;

export class Lines extends Mark {
  async render() {
    const baseRenderPromise = super.render();
    this.dot = bqSymbol().size(this.model.get('marker_size'));
    if (this.model.get('marker')) {
      this.dot.type(this.model.get('marker'));
    }

    // TODO: create_listeners is put inside the promise success handler
    // because some of the functions depend on child scales being
    // created. Make sure none of the event handler functions make that
    // assumption.
    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    this.display_el_classes = ['line', 'legendtext', 'dot'];

    await baseRenderPromise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
    this.draw(false);
  }

  set_ranges(): void {
    const xScale = this.scales.x;
    if (xScale) {
      xScale.setRange(this.parent.padded_range('x', xScale.model));
    }
    const yScale = this.scales.y;
    if (yScale) {
      yScale.setRange(this.parent.padded_range('y', yScale.model));
    }
  }

  set_positional_scales(): void {
    const xScale = this.scales.x,
      yScale = this.scales.y;
    this.listenTo(xScale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.update_line_xy();
      }
    });
    this.listenTo(yScale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.update_line_xy();
      }
    });
  }

  initialize_additional_scales(): void {
    const colorScale = this.scales.color;
    if (colorScale) {
      this.listenTo(colorScale, 'domain_changed', function () {
        this.update_style();
      });
      colorScale.on('color_scale_range_changed', this.update_style, this);
    }
  }

  create_listeners(): void {
    super.create_listeners();
    this.d3el
      .on(
        'mouseover',
        _.bind(() => {
          this.event_dispatcher('mouse_over');
        }, this)
      )
      .on(
        'mousemove',
        _.bind(() => {
          this.event_dispatcher('mouse_move');
        }, this)
      )
      .on(
        'mouseout',
        _.bind(() => {
          this.event_dispatcher('mouse_out');
        }, this)
      );

    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);

    // FIXME: multiple calls to update_path_style. Use on_some_change.
    this.listenTo(this.model, 'change:interpolation', this.update_path_style);
    this.listenTo(this.model, 'change:close_path', this.update_path_style);

    // FIXME: multiple calls to update_style. Use on_some_change.
    this.listenTo(this.model, 'change:colors', this.update_style);
    this.listenTo(this.model, 'change:opacities', this.update_style);
    this.listenTo(this.model, 'change:fill_opacities', this.update_style);
    this.listenTo(this.model, 'change:fill_colors', this.update_style);

    this.listenTo(this.model, 'change:fill', this.update_fill);

    this.listenTo(this.model, 'data_updated', function () {
      const animate = true;
      this.draw(animate);
    });
    this.listenTo(this.model, 'labels_updated', this.update_labels);
    this.listenTo(this.model, 'change:stroke_width', this.update_stroke_width);
    this.listenTo(
      this.model,
      'change:labels_visibility',
      this.update_legend_labels
    );
    this.listenTo(
      this.model,
      'change:curves_subset',
      this.update_curves_subset
    );
    this.listenTo(this.model, 'change:line_style', this.update_line_style);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.parent, 'bg_clicked', function () {
      this.event_dispatcher('parent_clicked');
    });

    this.listenTo(this.model, 'change:marker', this.update_marker);
    this.listenTo(this.model, 'change:marker_size', this.update_marker_size);
  }

  update_legend_labels(): void {
    if (this.model.get('labels_visibility') === 'none') {
      this.d3el.selectAll('.legend').attr('display', 'none');
      this.d3el.selectAll('.curve_label').attr('display', 'none');
    } else if (this.model.get('labels_visibility') === 'label') {
      this.d3el.selectAll('.legend').attr('display', 'none');
      this.d3el.selectAll('.curve_label').attr('display', 'inline');
    } else {
      this.d3el.selectAll('.legend').attr('display', 'inline');
      this.d3el.selectAll('.curve_label').attr('display', 'none');
    }
  }

  update_labels(): void {
    this.d3el
      .selectAll('.curve')
      .data(this.model.mark_data)
      .select('.curve_label')
      .text((d: any) => {
        return d.name;
      });
  }

  get_line_style(): string {
    switch (this.model.get('line_style')) {
      case 'solid':
        return 'none';
      case 'dashed':
        return '10,10';
      case 'dotted':
        return '2,10';
      case 'dash_dotted':
        return '10,5,2,5';
    }
  }

  // Updating the style of the curve, stroke, colors, dashed etc...
  // Could be fused in a single function for increased readability
  // and to avoid code repetition
  update_line_style(): void {
    this.d3el
      .selectAll('.curve')
      .select('.line')
      .style('stroke-dasharray', _.bind(this.get_line_style, this));
    if (this.legendEl) {
      this.legendEl
        .select('path')
        .style('stroke-dasharray', _.bind(this.get_line_style, this));
    }
  }

  update_stroke_width(model, strokeWidth): void {
    this.compute_view_padding();
    this.d3el
      .selectAll('.curve')
      .select('.line')
      .style('stroke-width', strokeWidth);
    if (this.legendEl) {
      this.legendEl.select('path').style('stroke-width', strokeWidth);
    }
  }

  update_style(): void {
    const fill = this.model.get('fill'),
      fillColor = this.model.get('fill_colors'),
      fillOpacities = this.model.get('fill_opacities');
    // update curve colors
    const curves = this.d3el.selectAll('.curve');
    curves
      .select('.line')
      .style('opacity', this.get_mark_opacity.bind(this))
      .style('stroke', (d, i) => {
        return this.get_mark_color(d, i) || fillColor[i];
      })
      .style('fill', (d, i) => {
        return fill === 'inside' ? this.get_fill_color(d, i) : '';
      })
      .style('fill-opacity', (d, i) => {
        return fill === 'inside' ? fillOpacities[i] : '';
      });
    curves
      .select('.area')
      .style('fill', (d, i) => {
        return this.get_fill_color(d, i);
      })
      .style('opacity', (d, i) => {
        return fillOpacities[i];
      });
    this.update_marker_style();
    // update legend style
    if (this.legendEl) {
      this.legendEl
        .select('.line')
        .style('stroke', (d, i) => {
          return this.get_mark_color(d, i) || fillColor[i];
        })
        .style('opacity', this.get_mark_opacity.bind(this))
        .style('fill', (d, i) => {
          return this.model.get('fill') === 'none'
            ? ''
            : this.get_fill_color(d, i);
        });
      this.legendEl
        .select('.dot')
        .style('stroke', (d, i) => {
          return this.get_mark_color(d, i) || fillColor[i];
        })
        .style('opacity', this.get_mark_opacity.bind(this))
        .style('fill', (d, i) => {
          return this.get_mark_color(d, i) || fillColor[i];
        });
      this.legendEl
        .select('text')
        .style('fill', (d, i) => {
          return this.get_mark_color(d, i) || fillColor[i];
        })
        .style('opacity', this.get_mark_opacity.bind(this));
    }
    this.update_stroke_width(this.model, this.model.get('stroke_width'));
    this.update_line_style();
  }

  path_closure(): string {
    return this.model.get('close_path') ? 'Z' : '';
  }

  update_path_style(): void {
    const interpolation = this.get_interpolation();
    this.line.curve(interpolation);
    this.area.curve(interpolation);
    this.d3el
      .selectAll('.curve')
      .select('.line')
      .attr('d', (d: any) => {
        return this.line(d.values) + this.path_closure();
      });
    this.d3el
      .selectAll('.curve')
      .select('.area')
      .transition('update_path_style')
      .duration(0) //FIXME
      .attr('d', (d: any) => {
        return this.area(d.values);
      });
    if (this.legendEl) {
      this.legendLine.curve(interpolation);
      this.legendEl
        .selectAll('path')
        .attr('d', this.legendLine(this.legendPathData) + this.path_closure());
    }
  }

  relayout(): void {
    this.set_ranges();
    this.update_line_xy(false);
  }

  selector_changed(pointSelector, rectSelector): [] {
    if (pointSelector === undefined) {
      this.model.set('selected', null);
      this.touch();
      return [];
    }
    const pixels = this.pixelCoords;
    const indices = new Uint32Array(_.range(pixels.length));
    const selected = indices.filter((index) => {
      return pointSelector(pixels[index]);
    });
    this.model.set('selected', selected);
    this.touch();
  }

  invert_point(pixel): void {
    if (pixel === undefined) {
      this.model.set('selected', null);
      this.touch();
      return;
    }

    const index = Math.min(
      this.bisect(this.xPixels, pixel),
      Math.max(this.xPixels.length - 1, 0)
    );
    this.model.set('selected', new Uint32Array([index]));
    this.touch();
  }

  update_multi_range(brushExtent): void {
    const xStart = brushExtent[0];
    const xEnd = brushExtent[1];
    const data =
      this.model.x_data[0] instanceof Array
        ? this.model.x_data[0]
        : this.model.x_data;
    const idXStart = this.bisect(data, xStart);
    const idXEnd = Math.min(
      this.bisect(data, xEnd),
      Math.max(data.length - 1, 0)
    );

    this.selectorModel.set('selected', [idXStart, idXEnd]);
    this.selector.touch();
  }

  draw_legend(elem, xDisp, yDisp, interXDisp, interYDisp: number): number[] {
    const curveLabels = this.model.get_labels();
    const legendData = this.model.mark_data.map((d) => {
      return { index: d.index, name: d.name, color: d.color };
    });
    this.legendEl = elem.selectAll('.legend' + this.uuid).data(legendData);

    const rectDim = interYDisp * 0.8,
      fillColors = this.model.get('fill_colors');

    this.legendLine = d3
      .line()
      .curve(this.get_interpolation())
      .x((d) => {
        return d[0];
      })
      .y((d) => {
        return d[1];
      });

    this.legendPathData = [
      [0, rectDim],
      [rectDim / 2, 0],
      [rectDim, rectDim / 2],
    ];

    const legend = this.legendEl
      .enter()
      .append('g')
      .attr('class', 'legend' + this.uuid)
      .attr('transform', (d, i) => {
        return 'translate(0, ' + (i * interYDisp + yDisp) + ')';
      })
      .on(
        'mouseover',
        _.bind(() => {
          this.event_dispatcher('legend_mouse_over');
        }, this)
      )
      .on(
        'mouseout',
        _.bind(() => {
          this.event_dispatcher('legend_mouse_out');
        }, this)
      )
      .on(
        'click',
        _.bind(() => {
          this.event_dispatcher('legend_clicked');
        }, this)
      );

    legend
      .append('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('d', this.legendLine(this.legendPathData) + this.path_closure())
      .style('stroke', (d, i) => {
        return this.get_mark_color(d, i) || fillColors[i];
      })
      .style('fill', (d, i) => {
        return this.model.get('fill') === 'none'
          ? ''
          : this.get_fill_color(d, i);
      })
      .style('opacity', this.get_mark_opacity.bind(this))
      .style('stroke-width', this.model.get('stroke_width'))
      .style('stroke-dasharray', _.bind(this.get_line_style, this));

    if (this.model.get('marker')) {
      legend
        .append('path')
        .attr('class', 'dot')
        .attr('transform', 'translate(' + rectDim / 2 + ',0)')
        .attr('d', this.dot.size(25))
        .style('fill', (d, i) => {
          return this.get_mark_color(d, i);
        });
    }

    legend
      .append('text')
      .attr('class', 'legendtext')
      .attr('x', rectDim * 1.2)
      .attr('y', rectDim / 2)
      .attr('dy', '0.35em')
      .text((d, i) => {
        return curveLabels[i];
      })
      .style('fill', (d, i) => {
        return this.get_mark_color(d, i) || fillColors[i];
      })
      .style('opacity', this.get_mark_opacity.bind(this));

    this.legendEl = legend.merge(this.legendEl);

    const maxLength = d3.max(curveLabels, (d: any) => {
      return d.length;
    });
    this.legendEl.exit().remove();
    return [this.model.mark_data.length, maxLength];
  }

  update_curves_subset(): void {
    const displayLabels = this.model.get('labels_visibility') === 'label';
    // Show a subset of the curves
    const curvesSubset = this.model.get('curves_subset');
    if (curvesSubset.length > 0) {
      this.d3el
        .selectAll('.curve')
        .attr('display', (d, i) => {
          return curvesSubset.indexOf(i) !== -1 ? 'inline' : 'none';
        })
        .select('.curve_label')
        .attr('display', (d, i) => {
          return curvesSubset.indexOf(i) !== -1 && displayLabels
            ? 'inline'
            : 'none';
        });
      if (this.legendEl) {
        this.legendEl.attr('display', (d, i) => {
          return curvesSubset.indexOf(i) !== -1 ? 'inline' : 'none';
        });
      }
      this.d3el.selectAll('.curve');
    } else {
      //make all curves visible
      this.d3el
        .selectAll('.curve')
        .attr('display', 'inline')
        .select('.curve_label')
        .attr('display', (d) => {
          return displayLabels ? 'inline' : 'none';
        });
      if (this.legendEl) {
        this.legendEl.attr('display', 'inline');
      }
    }
  }

  update_fill(): void {
    const fill = this.model.get('fill'),
      area = fill === 'top' || fill === 'bottom' || fill === 'between';

    const yScale = this.scales.y;

    this.area.defined((d: any) => {
      return area && d.y !== null && isFinite(yScale.scale(d.y));
    });

    if (fill == 'bottom') {
      this.area.y0(this.parent.plotarea_height);
    } else if (fill == 'top') {
      this.area.y0(0);
    } else if (fill == 'between') {
      this.area.y0((d: any) => {
        return yScale.scale(d.y0) + yScale.offset;
      });
    }
    this.d3el
      .selectAll('.curve')
      .select('.area')
      .attr('d', (d: any) => {
        return this.area(d.values);
      });
    this.d3el
      .selectAll('.curve')
      .select('.line')
      .style('fill', (d, i) => {
        return fill === 'inside' ? this.get_fill_color(d, i) : '';
      });
    // update legend fill
    if (this.legendEl) {
      this.legendEl.select('path').style('fill', (d, i) => {
        return fill === 'none' ? '' : this.get_fill_color(d, i);
      });
    }
  }

  get_fill_color(data, index): string {
    const fillColors: string = this.model.get('fill_colors');
    return fillColors.length === 0
      ? this.get_mark_color(data, index)
      : fillColors[index];
  }

  update_line_xy(animate): void {
    const xScale = this.scales.x,
      yScale = this.scales.y;
    const animationDuration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    this.line
      .x((d: any) => {
        return xScale.scale(d.x) + xScale.offset;
      })
      .y((d: any) => {
        return yScale.scale(d.y) + yScale.offset;
      });

    const fill = this.model.get('fill');
    this.area
      .x((d: any) => {
        return xScale.scale(d.x) + xScale.offset;
      })
      .y1((d: any) => {
        return yScale.scale(d.y) + yScale.offset;
      });

    if (fill == 'bottom') {
      this.area.y0(this.parent.plotarea_height);
    } else if (fill == 'top') {
      this.area.y0(0);
    } else if (fill == 'between') {
      this.area.y0((d: any) => {
        return yScale.scale(d.y0) + yScale.offset;
      });
    }

    const curvesSel = this.d3el.selectAll('.curve');

    curvesSel
      .select('.line')
      .transition('update_line_xy')
      .attr('d', (d: any) => {
        return this.line(d.values) + this.path_closure();
      })
      .duration(animationDuration);

    curvesSel
      .select('.area')
      .transition('update_line_xy')
      .attr('d', (d: any, i) => {
        return this.area(d.values);
      })
      .duration(animationDuration);

    curvesSel
      .select('.curve_label')
      .transition('update_line_xy')
      .attr('transform', (d: any) => {
        const lastXy = d.values[d.values.length - 1];
        return (
          'translate(' +
          xScale.scale(lastXy.x) +
          ',' +
          yScale.scale(lastXy.y) +
          ')'
        );
      })
      .duration(animationDuration);

    this.update_dots_xy(animate);
    this.xPixels =
      this.model.mark_data.length > 0
        ? this.model.mark_data[0].values.map((el) => {
            return xScale.scale(el.x) + xScale.offset;
          })
        : [];
    this.yPixels =
      this.model.mark_data.length > 0
        ? this.model.mark_data[0].values.map((el) => {
            return yScale.scale(el.y) + yScale.offset;
          })
        : [];
    this.pixelCoords =
      this.model.mark_data.length > 0
        ? this.model.mark_data[0].values.map((el) => {
            return [
              xScale.scale(el.x) + xScale.offset,
              yScale.scale(el.y) + yScale.offset,
            ];
          })
        : [];
  }

  get_interpolation():
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory
    | d3Shape.CurveFactory {
    const curveTypes = {
      linear: d3.curveLinear,
      basis: d3.curveBasis,
      'basis-open': d3.curveBasisOpen,
      'basis-closed': d3.curveBasisClosed,
      bundle: d3.curveBundle,
      cardinal: d3.curveCardinal,
      'cardinal-open': d3.curveCardinalOpen,
      'cardinal-closed': d3.curveCardinalClosed,
      monotone: d3.curveMonotoneY,
      'step-before': d3.curveStepBefore,
      'step-after': d3.curveStepAfter
    };

    return curveTypes[this.model.get('interpolation')];
  }

  draw(animate): void {
    this.set_ranges();
    const curvesSel = this.d3el.selectAll('.curve').data(this.model.mark_data);

    const yScale = this.scales.y;

    const newCurves = curvesSel.enter().append('g').attr('class', 'curve');
    newCurves
      .append('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('id', (d, i) => 'curve' + (i + 1))
      .on('click', () => {
        this.event_dispatcher('element_clicked');
      });
    newCurves.append('path').attr('class', 'area');
    newCurves
      .append('text')
      .attr('class', 'curve_label')
      .attr('x', 3)
      .attr('dy', '.35em')
      .attr(
        'display',
        this.model.get('labels_visibility') !== 'label' ? 'none' : 'inline'
      )
      .text((d: any) => d.name);

    const fill = this.model.get('fill'),
      area = fill === 'top' || fill === 'bottom' || fill === 'between';

    this.draw_dots();

    this.line = d3
      .line()
      .curve(this.get_interpolation())
      .defined((d: any) => {
        return d.y !== null && isFinite(yScale.scale(d.y));
      });

    this.area = d3
      .area()
      .curve(this.get_interpolation())
      .defined((d: any) => {
        return area && d.y !== null && isFinite(yScale.scale(d.y));
      });

    // Having a transition on exit is complicated. Please refer to
    // Scatter.js for detailed explanation.
    curvesSel.exit().remove();
    this.update_line_xy(animate);
    this.update_style();

    // alter the display only if a few of the curves are visible
    this.update_curves_subset();
  }

  draw_dots(): void {
    if (this.model.get('marker')) {
      const dots = this.d3el
        .selectAll('.curve')
        .selectAll('.dot')
        .data((d: any, i) => {
          return d.values.map((e) => {
            return { x: e.x, y: e.y, sub_index: e.sub_index };
          });
        });
      dots.enter().append('path').attr('class', 'dot');
      dots.exit().remove();
    }
  }

  update_dots_xy(animate): void {
    if (this.model.get('marker')) {
      const xScale = this.scales.x,
        yScale = this.scales.y;
      const animationDuration =
        animate === true ? this.parent.model.get('animation_duration') : 0;
      const dots = this.d3el.selectAll('.curve').selectAll('.dot');

      dots
        .transition('update_dots_xy')
        .duration(animationDuration)
        .attr('transform', (d: any) => {
          return (
            'translate(' +
            (xScale.scale(d.x) + xScale.offset) +
            ',' +
            (yScale.scale(d.y) + yScale.offset) +
            ')'
          );
        })
        .attr(
          'd',
          this.dot
            .size(this.model.get('marker_size'))
            .type(this.model.get('marker'))
        );
    }
  }

  compute_view_padding(): void {
    //This function sets the padding for the view through the variables
    //xPadding and yPadding which are view specific paddings in pixel
    let xPadding;
    if (this.model.get('marker')) {
      const markerPadding = Math.sqrt(this.model.get('marker_size')) / 2 + 1.0;
      const linePadding = this.model.get('stroke_width') / 2.0;
      xPadding = Math.max(markerPadding, linePadding);
    } else {
      xPadding = this.model.get('stroke_width') / 2.0;
    }

    const yPadding = xPadding;
    if (xPadding !== this.xPadding || yPadding !== this.yPadding) {
      this.xPadding = xPadding;
      this.yPadding = yPadding;
      this.trigger('mark_padding_updated');
    }
  }

  update_marker_style() {
    const that = this;
    const fillColor = this.model.get('fill_colors');
    const opacities = this.model.get('opacities');
    this.d3el.selectAll('.curve').each(function (d, i) {
      const curve = d3.select(this);
      curve
        .selectAll('.dot')
        .style('opacity', opacities[i])
        .style('fill', that.get_mark_color(d, i) || fillColor[i]);
    });
  }

  update_marker(model, marker): void {
    if (marker) {
      this.draw_dots();
      this.update_dots_xy(false);
      this.update_marker_style();
      if (this.legendEl) {
        this.legendEl.select('.dot').attr('d', this.dot.type(marker).size(25));
      }
    } else {
      this.d3el.selectAll('.dot').remove();
      if (this.legendEl) {
        this.legendEl.select('.dot').attr('d', this.dot.size(0));
      }
    }
  }

  update_marker_size(model, markerSize): void {
    this.compute_view_padding();
    this.d3el.selectAll('.dot').attr('d', this.dot.size(markerSize));
  }

  clear_style(style_dict, indices?) {}

  set_default_style(indices) {}

  set_style_on_elements(style, indices) {}

  dot: any;
  legendEl: d3.Selection<any, any, any, any>;
  legendLine: d3.Line<[number, number]>;
  legendPathData: [number, number][];
  selector: BaseSelector;
  selectorModel: SelectorModel;
  area: d3.Area<[number, number]>;
  line: d3.Line<[number, number]>;
  xPixels: number[];
  yPixels: number[];
  pixelCoords: number[];

  // Overriding super class
  model: LinesModel;
}
