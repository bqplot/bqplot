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

import * as widgets from '@jupyter-widgets/base';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-selection"));
import * as _ from 'underscore';
import { BaseModel } from './BaseModel';

export class Interaction extends widgets.WidgetView {

    initialize(parameters) {
        this.setElement(document.createElementNS(d3.namespaces.svg, "rect"));
        this.d3el = d3.select(this.el);
        super.initialize.call(this, parameters);
    }

    render() {
        this.parent = this.options.parent;

        // Opaque interation layer
        this.d3el
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.parent.width -
                           this.parent.margin.left -
                           this.parent.margin.right)
            .attr("height", this.parent.height -
                            this.parent.margin.top -
                            this.parent.margin.bottom)
            .attr("pointer-events", "all")
            .attr("visibility", "hidden");
        this.parent.on("margin_updated", this.relayout, this);
    }

    relayout() {
        // Called when the figure margins are updated.
        this.d3el
            .attr("width", this.parent.width -
                           this.parent.margin.left -
                           this.parent.margin.right)
            .attr("height", this.parent.height -
                            this.parent.margin.top -
                            this.parent.margin.bottom);
    }

    remove() {
        _.each(this.mark_views, function(mark: any) { mark.invert_range(); });
        this.d3el.remove();
        super.remove.apply(this);
    }

    mark_views: any;
    d3el: any;
    parent: any;
    model: BaseModel;
}
