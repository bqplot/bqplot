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
// var d3 =Object.assign({}, require("d3-array"), require("d3-drag"), require("d3-force"), require("d3-selection"));
const d3GetEvent = function () {
  return require('d3-selection').event;
}.bind(this);
import * as _ from 'underscore';
import { Mark } from './Mark';
import { GraphModel, LinkData, NodeData } from './GraphModel';
import { applyStyles } from './utils';

const arrowSize = 10;

const rotateVector = (
  vec: { x: number; y: number },
  ang: number
): { x: number; y: number } => {
  const cos = Math.cos(-ang);
  const sin = Math.sin(-ang);
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos,
  };
};

export class Graph extends Mark {
  async render() {
    const base_creation_promise = super.render();

    this.selected_style = this.model.get('selected_style');
    this.unselected_style = this.model.get('unselected_style');
    this.selected_indices = this.model.get('selected');

    this.hovered_style = this.model.get('hovered_style');
    this.unhovered_style = this.model.get('unhovered_style');
    this.hovered_index = !this.model.get('hovered_point')
      ? null
      : [this.model.get('hovered_point')];

    this.display_el_classes = ['element'];
    this.event_metadata = {
      mouse_over: {
        msg_name: 'hover',
        lookup_data: false,
        hit_test: true,
      },
      element_clicked: {
        msg_name: 'element_click',
        lookup_data: false,
        hit_test: true,
      },
      parent_clicked: {
        msg_name: 'background_click',
        hit_test: false,
      },
    };
    this.displayed.then(() => {
      this.parent.tooltip_div.node().appendChild(this.tooltip_div.node());
      this.create_tooltip();
    });

    this.d3el.attr('class', 'network');

    this.parent.svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('refX', 0)
      .attr('refY', 3)
      .attr('markerWidth', arrowSize)
      .attr('markerHeight', arrowSize)
      .attr('orient', 'auto')
      .append('path')
      .attr('class', 'linkarrow')
      .attr('d', 'M0,0 L0,6 L9,3 z');

    await base_creation_promise;

    this.event_listeners = {};
    this.process_interactions();
    this.create_listeners();
    this.compute_view_padding();
    this.draw();
  }

  set_ranges() {
    if (this.scales.x) {
      this.scales.x.set_range(
        this.parent.padded_range('x', this.scales.x.model)
      );
    }
    if (this.scales.y) {
      this.scales.y.set_range(
        this.parent.padded_range('y', this.scales.y.model)
      );
    }
  }

  set_positional_scales() {
    this.listenTo(
      this.scales.x || this.parent.scale_x,
      'domain_changed',
      function () {
        if (!this.model.dirty) {
          this.updatePosition();
        }
      }
    );
    this.listenTo(
      this.scales.y || this.parent.scale_y,
      'domain_changed',
      function () {
        if (!this.model.dirty) {
          this.updatePosition();
        }
      }
    );
  }

  relayout() {
    this.updatePosition();
  }

  private updatePosition() {
    this.set_ranges();

    if (this.scales.x && this.scales.y) {
      // set x and y positions on mark data manually
      // and redraw the force layout
      this.model.mark_data.forEach((d) => {
        d.x = this.scales.x.scale(d.xval) + this.scales.x.offset;
        d.y = this.scales.y.scale(d.yval) + this.scales.y.offset;
      });

      if (this.force_layout) {
        this.force_layout
          .nodes(this.model.mark_data)
          .force(
            'link',
            d3
              .forceLink(this.model.link_data)
              .distance(this.model.get('link_distance'))
          );

        if (this.links) {
          this.links.data(this.model.link_data);
        }
        if (this.nodes) {
          this.nodes.data(this.force_layout.nodes());
        }

        if (this.nodes && this.links) {
          this.tick();
        }
      }
    }
  }

  initialize_additional_scales() {
    const colorScale = this.scales.color;
    if (colorScale) {
      this.listenTo(colorScale, 'domain_changed', this.colorScaleUpdated);
      colorScale.on('color_scale_range_changed', this.colorScaleUpdated, this);
    }

    const linkColorScale = this.scales.link_color;
    if (linkColorScale) {
      this.listenTo(
        linkColorScale,
        'domain_changed',
        this.linkColorScaleUpdated
      );
    }
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

    this.listenTo(this.model, 'change:charge', this.updateCharge);
    this.listenTo(this.model, 'change:static', this.updateStatic);
    this.listenTo(this.model, 'change:link_type', this.tick);
    this.listenTo(this.model, 'change:directed', this.tick);
    this.listenTo(this.model, 'change:link_distance', this.updateLinkDistance);
    this.listenTo(this.model, 'data_updated', this.relayout);
    this.listenTo(this.model, 'change:tooltip', this.create_tooltip);
    this.listenTo(this.model, 'change:enable_hover', this.hide_tooltip);
    this.listenTo(this.model, 'change:interactions', this.process_interactions);
    this.listenTo(this.model, 'change:selected', this.update_selected);
    this.listenTo(this.model, 'change:hovered_point', this.update_hovered);
    this.listenTo(
      this.model,
      'change:hovered_style',
      this.hovered_style_updated
    );
    this.listenTo(
      this.model,
      'change:unhovered_style',
      this.unhovered_style_updated
    );

    this.listenTo(this.parent, 'bg_clicked', function () {
      this.event_dispatcher('parent_clicked');
    });
  }

  draw() {
    this.set_ranges();
    const x_scale = this.scales.x;
    const y_scale = this.scales.y;
    const link_color_scale = this.scales.link_color;

    // clean up the old graph
    this.d3el.selectAll('.node').remove();
    this.d3el.selectAll('.link').remove();

    if (x_scale && y_scale) {
      //set x and y on mark data manually
      this.model.mark_data.forEach((d) => {
        d.x = x_scale.scale(d.xval) + x_scale.offset;
        d.y = y_scale.scale(d.yval) + y_scale.offset;
      });
    }

    const box = this.parent.fig.node().getBBox();
    const width = box.width;
    const height = box.height;
    this.force_layout = d3
      .forceSimulation<NodeData>()
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'forceX',
        d3
          .forceX()
          .strength(0.1)
          .x(width / 2)
      )
      .force(
        'forceY',
        d3
          .forceY()
          .strength(0.1)
          .y(height / 2)
      );

    if (!x_scale && !y_scale) {
      this.force_layout
        .force('charge', d3.forceManyBody().strength(this.model.get('charge')))
        .on('tick', this.tick.bind(this));
    }

    this.links = this.d3el
      .selectAll('.link')
      .data(this.model.link_data)
      .enter()
      .append('path')
      .attr('class', 'link')
      .style('stroke', (d) => {
        return link_color_scale ? link_color_scale.scale(d.value) : null;
      })
      .style('stroke-width', (d: any) => {
        return d.link_width;
      })
      .attr('marker-end', this.model.directed ? 'url(#arrow)' : null);

    this.force_layout
      .nodes(this.model.mark_data)
      .force(
        'link',
        d3
          .forceLink(this.model.link_data)
          .distance(this.model.get('link_distance'))
      );

    this.nodes = this.d3el
      .selectAll('.node')
      .data(this.force_layout.nodes())
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(
        d3
          .drag()
          .on('start', this.dragstarted.bind(this))
          .on('drag', this.dragged.bind(this))
          .on('end', this.dragended.bind(this))
      );

    this.nodes
      .append((d) => {
        return document.createElementNS(d3.namespaces.svg, d.shape);
      })
      .attr('class', 'element')
      .each(function (d) {
        const node = d3.select(this);
        for (const key in d.shape_attrs) {
          node.attr(key, d.shape_attrs[key]);
        }
      })
      .style('fill', this.get_mark_color.bind(this));

    this.nodes
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', (d) => {
        return d.label_display === 'center' ? 'middle' : 'start';
      })
      .attr('x', (d) => {
        let xloc = 0;
        if (d.label_display === 'outside') {
          switch (d.shape) {
            case 'rect':
              xloc = d.shape_attrs.width / 2 + 5;
              break;
            case 'circle':
              xloc = d.shape_attrs.r + 5;
              break;
            case 'ellipse':
              xloc = d.shape_attrs.rx + 5;
              break;
            default:
              xloc = 0;
          }
        }
        return xloc;
      })
      .attr('y', '.31em')
      .text((d) => {
        return d.label;
      })
      .style('display', (d) => {
        return d.label_display === 'none' ? 'none' : 'inline';
      });

    this.nodes.on('click', (d, i) => {
      this.event_dispatcher('element_clicked', { data: d, index: i });
    });
    this.nodes.on('mouseover', (d, i) => {
      this.hover_handler({ data: d, index: i });
    });
    this.nodes.on('mouseout', () => {
      this.reset_hover_points();
    });

    if (this.model.static) {
      this.force_layout.tick(100);
      this.force_layout.stop();
      this.tick();
    }
  }

  private dragstarted(d: NodeData) {
    if (this.model.static) return;
    if (!d3GetEvent().active) {
      this.force_layout.alphaTarget(0.4).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(d: NodeData) {
    if (this.model.static) return;
    d.fx = d3GetEvent().x;
    d.fy = d3GetEvent().y;
  }

  private dragended(d: NodeData) {
    if (this.model.static) return;
    if (!d3GetEvent().active) {
      this.force_layout.alphaTarget(0.4);
    }
    d.fx = null;
    d.fy = null;
  }

  private colorScaleUpdated() {
    this.nodes
      .selectAll('.element')
      .style('fill', this.get_mark_color.bind(this));
  }

  private linkColorScaleUpdated() {
    const link_color_scale = this.scales.link_color;

    this.links.style('stroke', (d) => {
      return link_color_scale ? link_color_scale.scale(d.value) : null;
    });
  }

  process_click(interaction) {
    super.process_click(interaction);
    if (interaction === 'select') {
      this.event_listeners.parent_clicked = this.reset_selection;
      this.event_listeners.element_clicked = this.click_handler;
    }
  }

  reset_hover_points() {
    this.links.style('opacity', 1);
    this.model.set('hovered_point', null);
    this.hovered_index = null;
    this.touch();
  }

  hover_handler(args) {
    const data = args.data;
    const index = args.index;
    const highlight_links = this.model.get('highlight_links');

    if (highlight_links) {
      this.links.style('opacity', (d) => {
        return d.source.label === data.label || d.target.label === data.label
          ? 1
          : 0.1;
      });
    } else {
      this.links.style('opacity', 1);
    }

    this.model.set('hovered_point', index, { updated_view: this });
    this.touch();
  }

  reset_selection() {
    this.model.set('selected', null);
    this.selected_indices = null;
    this.touch();
  }

  click_handler(args) {
    const index = args.index;
    const idx = this.model.get('selected') || [];
    let selected = Array.from(idx);
    const elem_index = selected.indexOf(index);
    // Replacement for "Accel" modifier.
    const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;

    if (elem_index > -1 && accelKey) {
      // if the index is already selected and if accel key is
      // pressed, remove the node from the list
      selected.splice(elem_index, 1);
    } else {
      if (accelKey) {
        //If accel is pressed and the bar is not already selcted
        //add the bar to the list of selected bars.
        selected.push(index);
      }
      // updating the array containing the bar indexes selected
      // and updating the style
      else {
        //if accel is not pressed, then clear the selected ones
        //and set the current node to the selected
        selected = [];
        selected.push(index);
      }
    }
    this.model.set('selected', selected.length === 0 ? null : selected, {
      updated_view: this,
    });
    this.touch();
    let e = d3GetEvent();
    if (!e) {
      e = window.event;
    }
    if (e.cancelBubble !== undefined) {
      // IE
      e.cancelBubble = true;
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();
  }

  hovered_style_updated(model, style) {
    this.hovered_style = style;
    this.clear_style(model.previous('hovered_style'), this.hovered_index);
    this.style_updated(style, this.hovered_index);
  }

  unhovered_style_updated(model, style) {
    this.unhovered_style = style;
    const hov_indices = this.hovered_index;
    const unhovered_indices = hov_indices
      ? _.range(this.model.mark_data.length).filter((index) => {
          return hov_indices.indexOf(index) === -1;
        })
      : [];
    this.clear_style(model.previous('unhovered_style'), unhovered_indices);
    this.style_updated(style, unhovered_indices);
  }

  update_selected(model, value) {
    this.selected_indices = value;
    this.apply_styles();
  }

  update_hovered(model, value) {
    this.hovered_index = value === null ? value : [value];
    this.apply_styles();
  }

  apply_styles(style_arr?) {
    if (style_arr === undefined || style_arr === null) {
      style_arr = [
        this.selected_style,
        this.unselected_style,
        this.hovered_style,
        this.unhovered_style,
      ];
    }
    super.apply_styles(style_arr);

    const all_indices = _.range(this.model.mark_data.length);

    this.set_style_on_elements(this.hovered_style, this.hovered_index);
    const unhovered_indices = !this.hovered_index
      ? []
      : _.difference(all_indices, this.hovered_index);
    this.set_style_on_elements(this.unhovered_style, unhovered_indices);
  }

  clear_style(style_dict, indices) {
    let nodes = this.d3el.selectAll('.element');
    if (indices) {
      nodes = nodes.filter((d, index) => {
        return indices.indexOf(index) !== -1;
      });
    }
    const clearing_style = {};
    for (const key in style_dict) {
      clearing_style[key] = null;
    }
    applyStyles(nodes, clearing_style);
  }

  set_style_on_elements(style, indices) {
    // If the index array is undefined or of length=0, exit the
    // function without doing anything
    if (!indices || indices.length === 0) {
      return;
    }
    // Also, return if the style object itself is blank
    if (style !== undefined && Object.keys(style).length === 0) {
      return;
    }
    let nodes = this.d3el.selectAll('.element');
    nodes = nodes.filter((data, index) => {
      return indices.indexOf(index) !== -1;
    });
    applyStyles(nodes, style);
  }

  compute_view_padding() {
    const xPadding = d3.max<number>(
      this.model.mark_data.map(function (d) {
        return (
          (d.shape_attrs.r || d.shape_attrs.width / 2 || d.shape_attrs.rx) + 1.0
        );
      })
    );

    const yPadding = d3.max<number>(
      this.model.mark_data.map((d) => {
        return (
          (d.shape_attrs.r || d.shape_attrs.height / 2 || d.shape_attrs.ry) +
          1.0
        );
      })
    );

    if (xPadding !== this.xPadding || yPadding !== this.yPadding) {
      this.xPadding = xPadding;
      this.yPadding = xPadding;
      this.trigger('mark_padding_updated');
    }
  }

  private updateLinkDistance() {
    const x_scale = this.scales.x,
      y_scale = this.scales.y;

    const link_dist = this.model.get('link_distance');
    if (!x_scale && !y_scale) {
      (this.force_layout as any).linkDistance(link_dist).start();
    }
  }

  private updateCharge() {
    const x_scale = this.scales.x,
      y_scale = this.scales.y;

    const charge = this.model.get('charge');
    if (!x_scale && !y_scale) {
      (this.force_layout as any).charge(charge).start();
    }
  }

  private updateStatic() {
    if (this.model.static) {
      this.force_layout.stop();
    } else {
      this.force_layout.restart();
    }
  }

  private linkArc(d: LinkData) {
    const source = d.source;
    const target = d.target;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const rotationRadius = Math.sqrt(dx * dx + dy * dy);

    if (!this.model.directed) {
      return `M${source.x},${source.y}A${rotationRadius},${rotationRadius} 0 0,1 ${target.x},${target.y}`;
    }

    const targetRadius =
      d.target.shape_attrs.r ||
      d.target.shape_attrs.width / 2 ||
      d.target.shape_attrs.rx;

    const sourceToTarget = { x: dx, y: dy };
    const sourceToRotationCenter = rotateVector(sourceToTarget, -Math.PI / 3);
    const center = {
      x: source.x + sourceToRotationCenter.x,
      y: source.y + sourceToRotationCenter.y,
    };
    const centerToTarget = {
      x: target.x - center.x,
      y: target.y - center.y,
    };

    const theta = Math.atan((targetRadius + arrowSize) / rotationRadius);
    const centerToArrow = rotateVector(centerToTarget, theta);
    const actualTarget = {
      x: center.x + centerToArrow.x,
      y: center.y + centerToArrow.y,
    };

    return `M${source.x},${source.y}A${rotationRadius},${rotationRadius} 0 0,1 ${actualTarget.x},${actualTarget.y}`;
  }

  private linkLine(d: LinkData) {
    const source = d.source;
    const target = d.target;

    if (!this.model.directed) {
      return `M${source.x},${source.y}L${target.x},${target.y}`;
    }

    const targetRadius =
      d.target.shape_attrs.r ||
      d.target.shape_attrs.width / 2 ||
      d.target.shape_attrs.rx;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const theta = Math.atan2(dy, dx);

    const actualTarget = {
      x: target.x - (targetRadius + arrowSize) * Math.cos(theta),
      y: target.y - (targetRadius + arrowSize) * Math.sin(theta),
    };

    return `M${source.x},${source.y}L${actualTarget.x},${actualTarget.y}`;
  }

  private linkSlantLine(d: LinkData) {
    const source = d.source;
    const target = d.target;

    let midx = (d.source.x + d.target.x) / 2;

    if (!this.model.directed) {
      return `M${source.x},${source.y}L${midx},${target.y}L${target.x},${target.y}`;
    }

    const targetRadius =
      d.target.shape_attrs.r ||
      d.target.shape_attrs.width / 2 ||
      d.target.shape_attrs.rx;
    let actualTargetX: number;

    if (midx < target.x - (targetRadius + arrowSize)) {
      actualTargetX = target.x - (targetRadius + arrowSize);
    } else if (midx > target.x + (targetRadius + arrowSize)) {
      actualTargetX = target.x + (targetRadius + arrowSize);
    } else if (midx <= target.x) {
      midx = target.x - (targetRadius + arrowSize);
      actualTargetX = target.x - (targetRadius + arrowSize);
    } else {
      // midx > target.x
      midx = target.x + (targetRadius + arrowSize);
      actualTargetX = target.x + (targetRadius + arrowSize);
    }

    return `M${source.x},${source.y}L${midx},${target.y}L${actualTargetX},${target.y}`;
  }

  private tick() {
    const link_type = this.model.get('link_type');

    this.nodes.attr('transform', (d: NodeData) => {
      return `translate(${d.x},${d.y})`;
    });

    // move rects to center since x, y of rect is at the corner
    this.nodes.select('rect').attr('transform', (d: NodeData) => {
      return `translate(${-d.shape_attrs.width / 2},${
        -d.shape_attrs.height / 2
      })`;
    });

    let link_path_func = this.linkArc;
    switch (link_type) {
      case 'arc':
        link_path_func = this.linkArc;
        break;
      case 'line':
        link_path_func = this.linkLine;
        break;
      case 'slant_line':
        link_path_func = this.linkSlantLine;
        break;
      default:
        link_path_func = this.linkArc;
    }

    this.links.attr('d', link_path_func.bind(this));
  }

  set_default_style(indices) {}

  hovered_style: { [key: string]: string };
  unhovered_style: { [key: string]: string };
  hovered_index: number[];
  private force_layout: d3.Simulation<NodeData, any>;
  private links: d3.Selection<SVGPathElement, LinkData, HTMLElement, any>;
  private nodes: d3.Selection<SVGGElement, any, HTMLElement, any>;

  model: GraphModel;
}
