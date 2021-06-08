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
import { Mark } from './Mark';
import * as _ from 'underscore';
import { ImageModel } from './ImageModel';

export class Image extends Mark {
  async render() {
    const base_render_promise = super.render();

    this.im = this.d3el
      .append('image')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 1)
      .attr('height', 1)
      .attr('preserveAspectRatio', 'none')
      .classed('image_pixelated', this.model.get('pixelated'));
    this.updateImage();

    await base_render_promise;

    this.event_listeners = {};
    this.reset_click();
    this.create_listeners();
    this.listenTo(this.parent, 'margin_updated', () => {
      this.draw(false);
    });
  }

  set_positional_scales() {
    this.listenTo(this.scales.x, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw();
      }
    });
    this.listenTo(this.scales.y, 'domain_changed', function () {
      if (!this.model.dirty) {
        this.draw();
      }
    });
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

  create_listeners() {
    super.create_listeners();

    this.listenTo(this.model, 'change:image', this.updateImage);
    this.listenTo(this.model, 'data_updated', function () {
      this.draw(true);
    });
    this.listenTo(this.model, 'change:pixelated', () => {
      this.im.classed('image_pixelated', this.model.get('pixelated'));
    });
  }

  private updateImage() {
    if (this.im.attr('href')) {
      URL.revokeObjectURL(this.im.attr('href'));
    }

    const image = this.model.get('image');
    const format = image.get('format');

    if (format === 'url') {
      const url = new TextDecoder('utf-8').decode(image.get('value'));
      this.im.attr('href', url);
    } else {
      const blob = new Blob([image.get('value')], {
        type: 'image/' + image.get('format'),
      });
      const url = URL.createObjectURL(blob);
      this.im.attr('href', url);
    }
  }

  remove() {
    URL.revokeObjectURL(this.im.attr('href'));
    super.remove();
  }

  relayout() {
    this.draw(true);
  }

  private sendClickMessage() {
    const data_message = {
      click_x: this.scales.x.invert(d3.mouse(this.el)[0]),
      click_y: this.scales.y.invert(d3.mouse(this.el)[1]),
    };

    this.send({ event:'element_click', data: data_message });
  }

  draw(animate?: boolean) {
    this.set_ranges();

    const xScale = this.scales.x ? this.scales.x : this.parent.scale_x;
    const yScale = this.scales.y ? this.scales.y : this.parent.scale_y;

    const animationDuration = animate
      ? this.parent.model.get('animation_duration')
      : 0;
    const xScaled = this.model.mark_data['x'].map<number>(xScale.scale),
      yScaled = this.model.mark_data['y'].map<number>(yScale.scale);

    this.d3el
      .selectAll('image')
      .transition()
      .duration(animationDuration)
      .attr('transform', (d) => {
        const tx = xScaled[0] + xScale.offset;
        const ty = yScaled[1] + yScale.offset;
        const sx = xScaled[1] - xScaled[0];
        const sy = yScaled[0] - yScaled[1];
        return 'translate(' + tx + ',' + ty + ') scale(' + sx + ', ' + sy + ')';
      });

    this.d3el.on('click', this.sendClickMessage.bind(this));
  }

  clear_style(style_dict, indices?, elements?) {}

  compute_view_padding() {}

  set_default_style(indices, elements?) {}

  set_style_on_elements(style, indices, elements?) {}

  private im: d3.Selection<SVGImageElement, any, any, any>;

  model: ImageModel;
}
