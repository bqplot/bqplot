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
// var d3 =Object.assign({}, require("d3-scale"));
import { LinearScale } from './LinearScale';
import { Scale } from './Scale';

export class LogScale extends LinearScale {
  render() {
    this.scale = d3.scaleSymlog();
    if (this.model.domain.length > 0) {
      this.scale.domain(this.model.domain);
    }
    this.offset = 0;
    this.create_event_listeners();
  }

  scale: d3.ScaleSymLog<number, number>;
}

export function isLogScale(scale: Scale): scale is LogScale {
  return scale.model.type === 'log';
}
