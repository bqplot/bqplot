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

import * as d3Scale from 'd3-scale';
import { Scale } from './Scale';
import { LinearScaleModel } from './LinearScaleModel';

export class LinearScale extends Scale {
  render() {
    this.scale = d3Scale.scaleLinear() as d3.ScaleLinear<number, number>;
    if (this.model.domain.length > 0) {
      this.scale.domain(this.model.domain);
    }
    this.offset = 0;
    this.create_event_listeners();
  }

  expand_domain(old_range, new_range) {
    // If you have a current range and then a new range and want to
    // expand the domain to expand to the new range but keep it
    // consistent with the previous one, this is the function you use.

    // The following code is required to make a copy of the actual
    // state of the scale. Referring to the model domain and then
    // setting the range to be the old range in case it is not.
    const unpadded_scale = this.scale.copy();

    // To handle the case for a clamped scale for which we have to
    // expand the domain, the copy should be unclamped.
    unpadded_scale.clamp(false);
    if (this.model.domain.length) {
      unpadded_scale.domain(this.model.domain);
    } else {
      // if the domain is empty, it will lead to NaN/NaN
      console.error(
        'No domain exists for scale, is that any data associated with this scale?'
      );
    }
    unpadded_scale.range(old_range);
    this.scale.domain(
      new_range.map((limit) => {
        return unpadded_scale.invert(limit);
      })
    );
  }

  invert(pixel): number | Date {
    return this.scale.invert(pixel);
  }

  invert_range(pixels) {
    //Pixels is a non-decreasing array of pixel values
    return pixels.map((pix) => this.invert(pix));
  }

  scale:
    | d3.ScaleLinear<number, number>
    | d3.ScaleTime<Date, number>
    | d3.ScaleSymLog<number, number>;

  model: LinearScaleModel;
}

export function isLinearScale(scale: Scale): scale is LinearScale {
  return scale.model.type === 'linear';
}
