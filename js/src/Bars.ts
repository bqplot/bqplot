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
// import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"), require("d3-selection-multi"));
// Hack to fix problem with webpack providing multiple d3 objects
const d3GetEvent = function () {
  return require('d3-selection').event;
}.bind(this);

import * as _ from 'underscore';
import { Mark } from './Mark';
import { BarData, BarGroupValue, BarsModel } from './BarsModel';
import { applyStyles } from './utils';
import { LinearScale } from './LinearScale';
import { LogScale } from './LogScale';
import { OrdinalScale } from './OrdinalScale';

export class Bars extends Mark {
  async render() {
    const base_creation_promise = super.render.apply(this);

    // Two scales to draw the bars.
    this.stackedScale = d3.scaleBand();
    this.groupedScale = d3.scaleBand();

    this.selected_indices = this.model.get('selected');
    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');

    this.display_el_classes = ['bar', 'legendtext'];

    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    await base_creation_promise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
    this.draw(false);
  }

  private setScaleOrientation(): void {
    // TODO: we should probably use this.model.get("orientation")?
    // var orient = this.model.get("orientation");
    this.domScale = this.scales.x; //(orient === "vertical") ? this.scales.x : this.scales.y;
    this.rangeScale = this.scales.y; //(orient === "vertical") ? this.scales.y : this.scales.x;
  }

  set_ranges(): void {
    const orient = this.model.get('orientation');
    this.setScaleOrientation();
    const dom = orient === 'vertical' ? 'x' : 'y';
    const rang = orient === 'vertical' ? 'y' : 'x';
    if (!(this.domScale instanceof OrdinalScale)) {
      this.domScale.set_range(
        this.parent.padded_range(dom, this.domScale.model)
      );
    } else {
      this.domScale.set_range(
        this.parent.padded_range(dom, this.domScale.model),
        this.model.get('padding')
      );
    }
    this.rangeScale.set_range(
      this.parent.padded_range(rang, this.rangeScale.model)
    );
    // x_offset is set later by the adjustOffset method
    // This differs because it is not constant for a scale.
    // Changes based on the data.
    this.domOffset = 0;
  }

  set_positional_scales(): void {
    const x_scale = this.scales.x,
      y_scale = this.scales.y;
    this.listenTo(x_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw(true);
      }
    });
    this.listenTo(y_scale, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw(true);
      }
    });
  }

  private adjustOffset(): void {
    // In the case of a linear scale, and when plotting ordinal data,
    // the value have to be negatively offset by half of the width of
    // the bars, because ordinal scales give the values corresponding
    // to the start of the bin but linear scale gives the actual value.
    if (!(this.domScale instanceof OrdinalScale)) {
      if (this.align === 'center') {
        this.domOffset = -(this.stackedScale.bandwidth() / 2).toFixed(2);
      } else if (this.align === 'left') {
        this.domOffset = -this.stackedScale.bandwidth().toFixed(2);
      } else {
        this.domOffset = 0;
      }
    } else {
      if (this.align === 'center') {
        this.domOffset = 0;
      } else if (this.align === 'left') {
        this.domOffset = -(this.stackedScale.bandwidth() / 2);
      } else {
        this.domOffset = this.stackedScale.bandwidth() / 2;
      }
    }
  }

  create_listeners(): void {
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

    this.listenTo(this.model, 'data_updated', () => {
      //animate bars on data update
      const animate = true;
      this.draw(animate);
    });

    this.listenTo(this.model, 'change:colors', this.updateColors);
    this.listenTo(this.model, 'change:opacities', this.updateColors);
    this.listenTo(this.model, 'colors_updated', this.updateColors);
    this.listenTo(this.model, 'change:type', this.updateType);
    // FIXME: These are expensive calls for changing padding and align
    this.listenTo(this.model, 'change:align', this.relayout);
    this.listenTo(this.model, 'change:padding', this.relayout);
    this.listenTo(this.model, 'change:orientation', this.relayout);
    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.model.on_some_change(
      ['stroke', 'fill', 'stroke_width'],
      this.apply_styles,
      this
    );
    this.listenTo(this.model, 'change:selected', this.updateSelected);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.parent, 'bg_clicked', () => {
      this.event_dispatcher('parent_clicked');
    });

    this.model.on_some_change(
      [
        'label_display_format',
        'label_font_style',
        'label_display',
        'label_display_vertical_offset',
        'label_display_horizontal_offset',
      ],
      this.draw,
      this
    );
  }

  process_click(interaction: string): void {
    super.process_click(interaction);

    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.reset_selection;
      this.event_listeners.element_clicked = this.bar_click_handler;
    }
  }

  private drawZeroLine(): void {
    this.setScaleOrientation();

    const rangeScale = this.rangeScale.scale;
    const orient = this.model.get('orientation');

    if (orient === 'vertical') {
      this.d3el
        .select('.zeroLine')
        .attr('x1', 0)
        .attr('x2', this.parent.plotarea_width)
        .attr('y1', rangeScale(this.model.baseValue))
        .attr('y2', rangeScale(this.model.baseValue));
    } else {
      this.d3el
        .select('.zeroLine')
        .attr('x1', rangeScale(this.model.baseValue))
        .attr('x2', rangeScale(this.model.baseValue))
        .attr('y1', 0)
        .attr('y2', this.parent.plotarea_height);
    }
  }

  private updateInternalScales(): void {
    this.stackedScale.rangeRound(this.set_x_range());
    // This padding logic is duplicated from OrdinalScale
    // and should be factorized somewhere
    const padding = this.model.get('padding');
    this.stackedScale.paddingInner(padding);
    this.stackedScale.paddingOuter(padding / 2.0);
    this.adjustOffset();
    this.groupedScale.rangeRound([
      0,
      Math.round(this.stackedScale.bandwidth() * 100) / 100,
    ]);
  }

  relayout(): void {
    this.set_ranges();
    this.compute_view_padding();
    this.drawZeroLine();
    this.updateInternalScales();
    this.drawBars();
  }

  invert_point(pixel) {
    if (pixel === undefined) {
      this.model.set('selected', null);
      this.touch();
      return;
    }

    const abs_diff = this.xPixels.map((elem) => {
      return Math.abs(elem - pixel);
    });
    this.model.set(
      'selected',
      new Uint32Array([abs_diff.indexOf(d3.min(abs_diff))])
    );
    this.touch();
  }

  selector_changed(point_selector, rect_selector) {
    if (point_selector === undefined) {
      this.model.set('selected', null);
      this.touch();
      return [];
    }
    const pixels = this.pixelCoords;
    const indices = new Uint32Array(_.range(pixels.length));
    // Here we only select bar groups. It shouldn't be too hard to select
    // individual bars, the `selected` attribute would then be a list of pairs.
    const selected_groups = indices.filter((index) => {
      const bars = pixels[index];
      for (let i = 0; i < bars.length; i++) {
        if (rect_selector(bars[i])) {
          return true;
        }
      }
      return false;
    });
    this.model.set('selected', selected_groups);
    this.touch();
  }

  private updateSelected() {
    this.selected_indices = this.model.get('selected');
    this.apply_styles();
  }

  draw(animate?: boolean) {
    this.set_ranges();
    let barGroups: d3.Selection<any, any, any, any> = this.d3el
      .selectAll('.bargroup')
      .data(this.model.mark_data, (d: any) => d.key);

    // this.stackedScale is the ordinal scale used to draw the bars. If a linear
    // scale is given, then the ordinal scale is created from the
    // linear scale.
    if (!(this.domScale instanceof OrdinalScale)) {
      const modelDomain = this.model.mark_data.map((elem) => elem.key);
      this.stackedScale.domain(modelDomain);
    } else {
      this.stackedScale.domain(this.domScale.scale.domain());
    }

    this.updateInternalScales();

    if (this.model.mark_data.length > 0) {
      this.groupedScale
        .domain(_.range(this.model.mark_data[0].values.length))
        .rangeRound([0, Math.round(this.stackedScale.bandwidth() * 100) / 100]);
    }

    // Since we will assign the enter and update selection of barGroups to
    // itself, we may remove exit selection first.
    barGroups.exit().remove();

    barGroups = barGroups
      .enter()
      .append('g')
      .attr('class', 'bargroup')
      .merge(barGroups);
    // The below function sorts the DOM elements so that the order of
    // the DOM elements matches the order of the data they are bound
    // to. This is required to maintain integrity with selection.
    barGroups.order();

    barGroups.on('click', (d, i) => {
      return this.event_dispatcher('element_clicked', { data: d, index: i });
    });

    const barsSel = barGroups.selectAll('.bar').data((d) => d.values);

    // default values for width and height are to ensure smooth
    // transitions
    barsSel
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('width', 0)
      .attr('height', 0);

    barsSel.exit().remove();

    if (!this.model.get('label_display')) {
      barGroups.selectAll('text').remove();
    }

    if (this.model.get('label_display')) {
      const barLabels = barGroups.selectAll('.bar_label').data((d) => d.values);

      barLabels.exit().remove();

      barLabels
        .enter()
        .append('text')
        .attr('class', 'bar_label')
        .attr('width', 0)
        .attr('height', 0);
    }

    this.drawBars(animate);
    // this.drawBarLabels(); TODO

    this.apply_styles();

    this.d3el.selectAll('.zeroLine').remove();
    this.d3el.append('g').append('line').attr('class', 'zeroLine');

    this.drawZeroLine();
  }

  private drawBars(animate?: boolean) {
    const barGroups = this.d3el.selectAll('.bargroup');
    const barsSel = barGroups.selectAll('.bar');
    const animationDuration =
      animate === true ? this.parent.model.get('animation_duration') : 0;

    const domScale = this.domScale;
    const rangeScale = this.rangeScale.scale;

    const dom = this.orientation === 'vertical' ? 'x' : 'y';
    const rang = this.orientation === 'vertical' ? 'y' : 'x';

    const domControl = this.orientation === 'vertical' ? 'width' : 'height';
    const rangeControl = this.orientation === 'vertical' ? 'height' : 'width';

    if (domScale instanceof OrdinalScale) {
      const domMax = d3.max(this.parent.range(dom));
      barGroups.attr('transform', (d: BarData) => {
        if (this.orientation === 'vertical') {
          return (
            'translate(' +
            ((domScale.scale(d.key) !== undefined
              ? domScale.scale(d.key)
              : domMax) +
              this.domOffset) +
            ', 0)'
          );
        } else {
          return (
            'translate(0, ' +
            ((domScale.scale(d.key) !== undefined
              ? domScale.scale(d.key)
              : domMax) +
              this.domOffset) +
            ')'
          );
        }
      });
    } else {
      barGroups.attr('transform', (d: BarData) => {
        if (this.orientation === 'vertical') {
          return (
            'translate(' + (domScale.scale(d.key) + this.domOffset) + ', 0)'
          );
        } else {
          return (
            'translate(0, ' + (domScale.scale(d.key) + this.domOffset) + ')'
          );
        }
      });
    }

    const isStacked = this.model.get('type') === 'stacked';
    let bandWidth = 1.0;
    if (isStacked) {
      bandWidth = Math.max(1.0, this.stackedScale.bandwidth());
      barsSel
        .transition()
        .duration(animationDuration)
        .attr(dom, 0)
        .attr(domControl, bandWidth.toFixed(2))
        .attr(rang, (d: BarGroupValue) =>
          rang === 'y' ? rangeScale(d.y1) : rangeScale(d.y0)
        )
        .attr(rangeControl, (d: BarGroupValue) =>
          Math.abs(rangeScale(d.y1 + d.yRef) - rangeScale(d.y1))
        );
    } else {
      bandWidth = Math.max(1.0, this.groupedScale.bandwidth());
      barsSel
        .transition()
        .duration(animationDuration)
        .attr(dom, (datum, index) => this.groupedScale(index))
        .attr(domControl, bandWidth.toFixed(2))
        .attr(rang, (d: BarGroupValue) =>
          d3.min([rangeScale(d.y), rangeScale(this.model.baseValue)])
        )
        .attr(rangeControl, (d: BarGroupValue) =>
          Math.abs(rangeScale(this.model.baseValue) - rangeScale(d.y))
        );
    }

    // adding/updating bar data labels
    this.manageBarLabels(barGroups, bandWidth, dom, rang);

    this.pixelCoords = this.model.mark_data.map((d) => {
      const key = d.key;
      const groupDom = domScale.scale(key) + this.domOffset;
      return d.values.map((d) => {
        const rectCoords: {
          x: number;
          y: number;
          width: number;
          height: number;
        } = { x: 0, y: 0, width: 0, height: 0 };
        rectCoords[dom] = isStacked
          ? groupDom
          : groupDom + this.groupedScale(d.subIndex);
        rectCoords[rang] = isStacked
          ? rang === 'y'
            ? rangeScale(d.y1)
            : rangeScale(d.y0)
          : d3.min([rangeScale(d.y), rangeScale(this.model.baseValue)]);
        rectCoords[domControl] = bandWidth;
        rectCoords[rangeControl] = isStacked
          ? Math.abs(rangeScale(d.y1 + d.yRef) - rangeScale(d.y1))
          : Math.abs(rangeScale(this.model.baseValue) - rangeScale(d.yRef));
        return [
          [rectCoords.x, rectCoords.x + rectCoords.width],
          [rectCoords.y, rectCoords.y + rectCoords.height],
        ];
      });
    });
    this.xPixels = this.model.mark_data.map((el) => {
      return domScale.scale(el.key) + domScale.offset;
    });
  }

  /**
   * Get the vertical label offset from the model
   */
  get offsetVertical(): number {
    return this.model.get('label_display_vertical_offset');
  }

  /**
   * Get the horizontal label offset from the model
   */
  get offsetHorizontal(): number {
    return this.model.get('label_display_horizontal_offset');
  }

  /**
   * Get the baseline parameter from the model
   */
  get baseLine(): number {
    return this.model.get('base');
  }

  /**
   * Get the bar chart's orientation
   */
  get orientation(): 'horizontal' | 'vertical' {
    return this.model.get('orientation');
  }

  /**
   * Get the bar chart's alignment
   */
  get align(): 'center' | 'left' | 'right' {
    return this.model.get('align');
  }

  /**
   * Main entry point function for adding bar labels
   * @param barGroups - D3 selection for all bar groups
   * @param bandWidth - Bandwidth of the x or y axis
   * @param dom - X or y axis (depending on oridnetation)
   * @param rang - X or y axis (depending on orientation)
   */
  private manageBarLabels(
    barGroups: any,
    bandWidth: number,
    dom: string,
    rang: string
  ): void {
    if (!this.model.get('label_display')) {
      return;
    }

    // Ladding the labels
    if (this.model.get('type') === 'stacked') {
      this.stackedBarLabels(barGroups, bandWidth, dom, rang);
    } else {
      this.groupedBarLabels(barGroups, bandWidth);
    }

    // Styling the labels
    this.updateBarLabelsStyle();
  }

  /**
   * All bars are stacked by default. The only other value this parameter can take is 'grouped'
   * @param barGroups - D3 selection for bar groups
   * @param bandWidth - Bandwidth parameter for the bar dimensions
   * @param dom - X or y axis (depending on oridnetation)
   * @param rang - X or y axis (depending on oridnetation)
   */
  private stackedBarLabels(
    barGroups: any,
    bandWidth: number,
    dom: string,
    rang: string
  ): void {
    const barLabels = barGroups.selectAll('.bar_label');

    barLabels
      .attr(dom, (d) => 0)
      .attr(rang, (d) => {
        if (d.y <= this.baseLine) {
          return this.rangeScale.scale(d.y0);
        } else {
          return this.rangeScale.scale(d.y1);
        }
      })
      .style('font-weight', '400')
      .style('text-anchor', (d) => this.styleBarLabelTextAnchor(d))
      .style('dominant-baseline', (d) => this.styleBarLabelDominantBaseline(d))
      .attr('transform', (d, i) => {
        return this.transformBarLabel(
          d,
          this.offsetHorizontal,
          this.offsetVertical,
          bandWidth
        );
      });
  }

  /**
   * Add labels for a chart with grouped bars
   * @param barGroups - D3 selection for bar group
   * @param bandWidth - bandwidth parameter for the X axis
   */
  private groupedBarLabels(barGroups: any, bandWidth: number): void {
    const barLabels = barGroups.selectAll('.bar_label');

    barLabels
      .attr('x', (d, i) => {
        if (this.orientation === 'horizontal') {
          return this.rangeScale.scale(d.y);
        } else {
          return this.groupedScale(i);
        }
      })
      .attr('y', (d, i) => {
        if (this.orientation === 'horizontal') {
          return this.groupedScale(i);
        } else {
          return this.rangeScale.scale(d.y);
        }
      })
      .style('font-weight', '400')
      .style('text-anchor', (d) => this.styleBarLabelTextAnchor(d))
      .style('dominant-baseline', (d) => this.styleBarLabelDominantBaseline(d))
      .attr('transform', (d) =>
        this.transformBarLabel(
          d,
          this.offsetHorizontal,
          this.offsetVertical,
          bandWidth
        )
      );
  }

  /**
   * Applies CSS translate to shift label position according
   * to vertical/horizontal offsets
   * @param d - Data point
   * @param offsetHorizontal - Horizontal offset, in pixels, of the label
   * @param offsetVertical - Vertical offset, in pixels, of the label
   * @param bandWidth - Bandwidth parameter for the bar dimantions
   */
  private transformBarLabel(
    d: BarGroupValue,
    offsetHorizontal: number,
    offsetVertical: number,
    bandWidth: number
  ): string {
    if (this.orientation === 'horizontal') {
      return d.y <= this.baseLine
        ? `translate(${
            d.y0 <= this.baseLine ? 0 - offsetVertical : 0 + offsetVertical
          }, ${bandWidth / 2 + offsetHorizontal})`
        : `translate(${
            d.y1 <= this.baseLine ? 0 - offsetVertical : 0 + offsetVertical
          }, ${bandWidth / 2 + offsetHorizontal})`;
    } else {
      return d.y <= this.baseLine
        ? `translate(${bandWidth / 2 + offsetHorizontal},
                ${
                  d.y0 <= this.baseLine
                    ? 0 - offsetVertical
                    : 0 + offsetVertical
                })`
        : `translate(${bandWidth / 2 + offsetHorizontal},
                ${
                  d.y1 <= this.baseLine
                    ? 0 - offsetVertical
                    : 0 + offsetVertical
                })`;
    }
  }

  /**
   * Determines the value of the text-anchor CSS attribute
   * @param d - Data point
   * @param i - Index number
   */
  private styleBarLabelTextAnchor(d: BarGroupValue): string {
    if (this.orientation === 'horizontal') {
      return d.y <= this.baseLine ? 'start' : 'end';
    } else {
      return 'middle';
    }
  }

  /**
   * Determines the value of the dominant-base-line CSS attribute
   * @param d - Data point
   * @param i - Index number
   */
  private styleBarLabelDominantBaseline(d: BarGroupValue): string {
    if (this.orientation === 'horizontal') {
      return 'central';
    } else {
      return d.y <= this.baseLine ? 'text-after-edge' : 'text-before-edge';
    }
  }

  /**
   * Adds CSS styling to the bar labels
   */
  private updateBarLabelsStyle(): void {
    const displayFormatStr = this.model.get('label_display_format');
    const displayFormat = displayFormatStr ? d3.format(displayFormatStr) : null;

    let fonts = this.d3el
      .selectAll('.bar_label')
      .text((d: any, i) => (displayFormat ? displayFormat(d.y) : null));

    const fontStyle = this.model.get('label_font_style');

    for (const styleKey in fontStyle) {
      fonts = fonts.style(styleKey, fontStyle[styleKey]);
    }
  }

  private updateType() {
    // We need to update domains here as the y_domain needs to be
    // changed when we switch from stacked to grouped.
    this.model.update_domains();
    this.draw();
  }

  private updateColors() {
    //the following if condition is to handle the case of single
    //dimensional data.
    //if y is 1-d, each bar should be of 1 color.
    //if y is multi-dimensional, the corresponding values should be of
    //the same color.
    const stroke = this.model.get('stroke');
    if (this.model.mark_data.length > 0) {
      if (!this.model.yIs2d) {
        this.d3el
          .selectAll('.bar')
          .style('fill', this.get_mark_color.bind(this))
          .style('stroke', stroke ? stroke : this.get_mark_color.bind(this))
          .style('opacity', this.get_mark_opacity.bind(this));
      } else {
        this.d3el
          .selectAll('.bargroup')
          .selectAll('.bar')
          .style('fill', this.get_mark_color.bind(this))
          .style('stroke', stroke ? stroke : this.get_mark_color.bind(this))
          .style('opacity', this.get_mark_opacity.bind(this));
      }
    }
    //legend color update
    if (this.legendEl) {
      this.legendEl
        .selectAll('.legendrect')
        .style('fill', this.get_mark_color.bind(this))
        .style('stroke', stroke ? stroke : this.get_mark_color.bind(this))
        .style('opacity', this.get_mark_opacity.bind(this));
      this.legendEl
        .selectAll('.legendtext')
        .style('fill', this.get_mark_color.bind(this))
        .style('stroke', stroke ? stroke : this.get_mark_color.bind(this))
        .style('opacity', this.get_mark_opacity.bind(this));
    }
  }

  draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
    if (
      !this.model.yIs2d &&
      this.model.get('colors').length !== 1 &&
      this.model.get('color_mode') !== 'element'
    ) {
      return [0, 0];
    }

    const legendData = this.model.mark_data[0].values.map((data) => {
      return {
        index: data.subIndex,
        colorIndex: data.colorIndex,
        opacityIndex: data.opacityIndex,
      };
    });
    this.legendEl = elem.selectAll('.legend' + this.uuid).data(legendData);

    const rect_dim = inter_y_disp * 0.8;
    const legend = this.legendEl
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

    legend
      .append('rect')
      .classed('legendrect', true)
      .style('fill', this.get_mark_color.bind(this))
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', rect_dim)
      .attr('height', rect_dim);

    legend
      .append('text')
      .attr('class', 'legendtext')
      .attr('x', rect_dim * 1.2)
      .attr('y', rect_dim / 2)
      .attr('dy', '0.35em')
      .text((d, i) => this.model.get('labels')[i])
      .style('fill', this.get_mark_color.bind(this));

    this.legendEl = legend.merge(this.legendEl);

    const max_length = d3.max(this.model.get('labels'), (d: any[]) => d.length);

    this.legendEl.exit().remove();
    return [this.model.mark_data[0].values.length, max_length];
  }

  clear_style(style, indices) {
    if (!indices || indices.length === 0) {
      return;
    }

    if (Object.keys(style).length === 0) {
      return;
    }

    const elements = this.d3el.selectAll('.bargroup').filter((d, index) => {
      return indices.indexOf(index) !== -1;
    });

    const clearing_style = {};
    for (const key in style) {
      clearing_style[key] = null;
    }
    applyStyles(elements.selectAll('.bar'), clearing_style);
  }

  set_style_on_elements(style: any, indices: number[]) {
    if (!indices || indices.length === 0) {
      return;
    }

    if (Object.keys(style).length === 0) {
      return;
    }

    const elements = this.d3el.selectAll('.bargroup').filter((data, index) => {
      return indices.indexOf(index) !== -1;
    });
    applyStyles(elements.selectAll('.bar'), style);
  }

  set_default_style(indices: number[]) {
    // For all the elements with index in the list indices, the default
    // style is applied.
    if (!indices || indices.length === 0) {
      return;
    }

    const fill = this.model.get('fill'),
      stroke = this.model.get('stroke'),
      stroke_width = this.model.get('stroke_width');

    this.d3el
      .selectAll('.bargroup')
      .filter((data, index) => {
        return indices.indexOf(index) !== -1;
      })
      .selectAll('.bar')
      .style('fill', fill ? this.get_mark_color.bind(this) : 'none')
      .style('stroke', stroke ? stroke : 'none')
      .style('opacity', this.get_mark_opacity.bind(this))
      .style('stroke-width', stroke_width);
  }

  get_mark_color(data: BarGroupValue, index: number) {
    // Workaround for the bargroup, the color index is not the same as the bar index
    return super.get_mark_color(data, data.colorIndex);
  }

  get_mark_opacity(data: BarGroupValue, index) {
    // Workaround for the bargroup, the opacity index is not the same as the bar index
    return super.get_mark_opacity(data, data.opacityIndex);
  }

  private set_x_range(): [number, number] {
    const domScale = this.domScale;
    if (domScale instanceof OrdinalScale) {
      return domScale.scale.range() as [number, number];
    } else {
      return [
        domScale.scale(d3.min(this.stackedScale.domain())),
        domScale.scale(d3.max(this.stackedScale.domain())),
      ];
    }
  }

  private bar_click_handler(args) {
    const index = args.index;
    const idx = this.model.get('selected') || [];
    let selected: number[] = Array.from(idx);

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
        //If accel is pressed and the bar is not already selcted
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
  }

  private reset_selection() {
    this.model.set('selected', null);
    this.selected_indices = null;
    this.touch();
  }

  compute_view_padding() {
    // This function returns a dictionary with keys as the scales and
    // value as the pixel padding required for the rendering of the
    // mark.
    const domScale = this.domScale;
    const orient = this.model.get('orientation');
    let xPadding = 0;
    const avail_space =
      orient === 'vertical'
        ? this.parent.plotarea_width
        : this.parent.plotarea_height;
    if (domScale) {
      if (
        this.stackedScale !== null &&
        this.stackedScale !== undefined &&
        this.stackedScale.domain().length !== 0
      ) {
        if (!(domScale instanceof OrdinalScale)) {
          if (this.align === 'center') {
            xPadding =
              avail_space / (2.0 * this.stackedScale.domain().length) + 1;
          } else if (this.align === 'left' || this.align === 'right') {
            xPadding = avail_space / this.stackedScale.domain().length + 1;
          }
        } else {
          if (this.align === 'left' || this.align === 'right') {
            xPadding = parseFloat(
              (this.stackedScale.bandwidth() / 2).toFixed(2)
            );
          }
        }
      }
    }
    if (orient === 'vertical') {
      if (xPadding !== this.xPadding) {
        this.xPadding = xPadding;
        this.trigger('mark_padding_updated');
        //dispatch the event
      }
    } else {
      if (xPadding !== this.yPadding) {
        this.yPadding = xPadding;
        this.trigger('mark_padding_updated');
        //dispatch the event
      }
    }
  }

  private domOffset: number;
  private domScale: LinearScale | LogScale;
  private legendEl: d3.Selection<any, any, any, any>;
  private pixelCoords: [[number, number], [number, number]][][];
  private rangeScale: LinearScale | LogScale;
  private stackedScale: d3.ScaleBand<any>;
  private groupedScale: d3.ScaleBand<any>;
  private xPixels: number[];

  // Overriding super class
  model: BarsModel;
}
