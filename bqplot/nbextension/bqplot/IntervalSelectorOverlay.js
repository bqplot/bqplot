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

define(["widgets/js/manager", "d3", "./SelectorOverlay" ], function(WidgetManager, d3, BaseSelectors) {
    var BaseXSelector = BaseSelectors[1];
    var IntervalSelector = BaseXSelector.extend({
        render : function() {
            IntervalSelector.__super__.render.apply(this);
            this.freeze_but_move = true;
            this.freeze_dont_move = false;
            this.active = false;
            this.size = this.model.get("size");

            this.width = this.parent.width - this.parent.margin.left - this.parent.margin.right;
            this.height = this.parent.height - this.parent.margin.top - this.parent.margin.bottom;

            var self = this;
            var scale_creation_promise = this.create_scales();
            Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
                //container for mouse events
                self.background = self.el.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", self.width)
                    .attr("height", self.height)
                    .attr("class", "selector selectormouse")
                    .attr("pointer-events", "all")
                    .attr("visibility", "hidden");

                self.background.on("mousemove", _.bind(self.mousemove, self))
                    .on("click", _.bind(self.click, self))
                    .on("dblclick", _.bind(self.dblclick, self));

                self.rect = self.el.append("rect")
                .attr("class", "selector intsel")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", self.size)
                .attr("height", self.height)
                .attr("pointer-events", "none")
                .attr("display", "none");

                if(self.model.get("color")!=null) {
                    self.rect.style("fill", self.model.get("color"));
                }

                self.create_listeners();
            }, null);
        },
        create_listeners: function() {
            IntervalSelector.__super__.create_listeners.apply(this);
            this.model.on("change:color", this.color_change, this);
        },
        color_change: function() {
            if(this.model.get("color")!=null){
                this.rect.style("fill", this.model.get("color"));
            }
        },
        click: function () {
            this.active = true;
            this.rect.style("display", "inline");
            this.freeze_but_move = this.model.get("size") ?
                true : !this.freeze_but_move;
        },
        dblclick: function () {
            this.freeze_dont_move = !this.freeze_dont_move;
        },
        mousemove: function() {
            if (this.freeze_dont_move || !this.active) {
                return;
            }

            var mouse_pos = d3.mouse(this.background.node());
            var int_len = this.size > 0 ?
                this.size : parseInt(this.rect.attr("width"));
            var vert_factor = (this.height - mouse_pos[1]) / this.height;
            var interval_size = this.freeze_but_move ?
                int_len : Math.round(vert_factor * this.width);

            var start;
            if (mouse_pos[0] - interval_size / 2 < 0)
                start = 0;
            else if ((mouse_pos[0] + interval_size / 2) > this.width)
                start = this.width - interval_size;
            else
                start = mouse_pos[0] - interval_size / 2;

            //update the interval location and size
            this.rect.attr("x", start);
            this.rect.attr("width", interval_size);
            this.model.set_typed_field("selected", this.invert_range(start, start + interval_size));
            var idx_selected = this.mark_views.map(function(mark_view) {
                return mark_view.invert_range(start, start + interval_size);
            });
            this.model.set("idx_selected", idx_selected);
            this.touch();
        },
        invert_range: function(start, end) {
            var x_start = this.scale.scale.invert(start);
            var x_end = this.scale.scale.invert(end);
            return [x_start, x_end];
        },
        reset: function() {
            this.rect.attr("x", 0)
                .attr("y", 0)
                .attr("width", this.size)
                .attr("height", this.height);
            this.background.attr("width", this.width)
                .attr("height", this.height);
            this.create_scale();
        },
        remove: function() {
            this.rect.remove();
            this.background.remove();
            IntervalSelector.__super__.remove.apply(this);
        },
        relayout: function() {
            IntervalSelector.__super__.relayout.apply(this);
            this.background.attr("width", this.width)
                .attr("height", this.height);
            this.rect.attr("height", this.height);
            this.set_range([this.scale]);
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.IntervalSelectorOverlay", IntervalSelector);
});

