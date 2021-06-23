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
import { MarkModel } from './MarkModel';
import * as serialize from './serialize';

export interface NodeShapeAttrs {
  r?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
}

export interface NodeData extends d3.SimulationNodeDatum {
  label: string;
  label_display: 'center' | 'outside' | 'none';
  shape: 'circle' | 'rect' | 'ellipse';
  shape_attrs: NodeShapeAttrs;
  value?: number;
  xval: number;
  yval: number;
  color: number;
}

export interface LinkData {
  source: NodeData;
  target: NodeData;
  value: number;
}

export class GraphModel extends MarkModel {
  defaults() {
    return {
      ...MarkModel.prototype.defaults(),
      _model_name: 'GraphModel',
      _view_name: 'Graph',
      node_data: [],
      link_matrix: [],
      link_data: [],
      charge: -600,
      static: false,
      link_distance: 100,
      link_type: 'arc',
      directed: true,
      highlight_links: true,
      colors: d3.scaleOrdinal(d3.schemeCategory10).range(),
      x: [],
      y: [],
      color: null,
      link_color: null,
      hovered_point: null,
      scales_metadata: {
        x: { orientation: 'horizontal', dimension: 'x' },
        y: { orientation: 'vertical', dimension: 'y' },
        color: { dimension: 'color' },
      },
    };
  }

  initialize(attributes, options) {
    super.initialize(attributes, options);
    this.on_some_change(
      ['x', 'y', 'color', 'link_color', 'node_data', 'link_data', 'link_color'],
      this.update_data,
      this
    );
    this.on_some_change(['preserve_domain'], this.update_domains, this);
    this.update_data();
  }

  get static(): boolean {
    return this.get('static');
  }

  get charge(): number {
    return this.get('static');
  }

  get directed(): boolean {
    return this.get('directed');
  }

  private get nodeData(): [NodeData | string] {
    return this.get('node_data');
  }

  private getShapeAttrs(
    shape: 'circle' | 'rect' | 'ellipse',
    attrs: NodeShapeAttrs
  ) {
    const newAttrs: NodeShapeAttrs = {};
    switch (shape) {
      case 'circle':
        newAttrs.r = attrs.r || 15;
        break;
      case 'rect':
        newAttrs.width = attrs.width || 25;
        newAttrs.height = attrs.height || newAttrs.width * 0.8;
        newAttrs.rx = attrs.rx || 0;
        newAttrs.ry = attrs.ry || 0;
        break;
      case 'ellipse':
        newAttrs.rx = attrs.rx || 20;
        newAttrs.ry = attrs.ry || newAttrs.rx * 0.6;
        break;
      default:
        console.log('Invalid shape passed - ', shape);
    }
    return newAttrs;
  }

  private updateNodeData() {
    const x = this.get('x') || [];
    const y = this.get('y') || [];
    const color = this.get('color') || [];

    this.mark_data = this.nodeData.map((d, i) => {
      const data: Partial<NodeData> = typeof d === 'string' ? { label: d } : d;

      data.label = data.label || 'N' + i;
      data.label_display = data.label_display || 'center';
      data.shape = data.shape || 'circle';
      data.shape_attrs = this.getShapeAttrs(data.shape, data.shape_attrs || {});
      data.value = data.value || null;

      if (x.length > i) {
        data.xval = x[i];
      }
      if (y.length > i) {
        data.yval = y[i];
      }
      if (color.length > i) {
        data.color = color[i];
      }

      return data as NodeData;
    });
  }

  private updateLinkData() {
    const link_color_scale = this.get('scales').link_color;
    this.link_data = this.get('link_data') || [];
    let link_matrix = this.get('link_matrix');
    const link_color = this.get('link_color');

    if (link_color_scale !== undefined && link_color.length > 0) {
      link_matrix = link_color;
    }

    // Coerce link matrix into format understandable by d3 force layout
    if (this.link_data.length === 0 && link_matrix.length > 0) {
      link_matrix.forEach((d: number[], i: number) => {
        d.forEach((e, j) => {
          if (e !== null && i != j) {
            this.link_data.push({
              source: this.mark_data[i],
              target: this.mark_data[j],
              value: e,
            });
          }
        });
      });
    }
  }

  update_data() {
    this.dirty = true;
    this.updateNodeData();
    this.updateLinkData();
    this.update_domains();
    this.dirty = false;
    this.trigger('data_updated');
  }

  update_domains() {
    const scales = this.get('scales');

    if (scales.x) {
      if (!this.get('preserve_domain').x && this.mark_data) {
        scales.x.compute_and_set_domain(
          this.mark_data.map((elem) => {
            return elem.xval;
          }),
          this.model_id + '_x'
        );
      } else {
        scales.x.del_domain([], this.model_id + '_x');
      }
    }

    if (scales.y) {
      if (!this.get('preserve_domain').y && this.mark_data) {
        scales.y.compute_and_set_domain(
          this.mark_data.map((elem) => {
            return elem.yval;
          }),
          this.model_id + '_y'
        );
      } else {
        scales.y.del_domain([], this.model_id + '_y');
      }
    }

    if (scales.color) {
      if (!this.get('preserve_domain').color && this.mark_data) {
        scales.color.compute_and_set_domain(
          this.mark_data.map((elem) => {
            return elem.color;
          }),
          this.model_id + '_color'
        );
      } else {
        scales.color.del_domain([], this.model_id + '_color');
      }
    }

    if (scales.link_color) {
      if (!this.get('preserve_domain').link_color && this.link_data) {
        scales.link_color.compute_and_set_domain(
          this.link_data.map((elem) => {
            return elem.value;
          }),
          this.model_id + '_link_color'
        );
      } else {
        scales.link_color.del_domain([], this.model_id + '_link_color');
      }
    }
  }

  static serializers = {
    ...MarkModel.serializers,
    x: serialize.array_or_json_serializer,
    y: serialize.array_or_json_serializer,
    color: serialize.array_or_json_serializer,
    link_color: serialize.array_or_json_serializer,
    link_matrix: serialize.array_or_json_serializer,
  };

  mark_data: NodeData[];
  link_data: LinkData[];
}
