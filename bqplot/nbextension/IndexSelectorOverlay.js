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
    var IndexSelector = BaseXSelector.extend({
        render : function() {
            IndexSelector.__super__.render.apply(this);
            this.active = false;
            var self = this;
            var scale_creation_promise = this.create_scales();
            Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
                self.line = self.el.append("line")
                .attr("class", "selector indsel")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", self.height)
                .attr("stroke-width", self.model.get("line_width"))
                .attr("pointer-events", "none")
                .attr("visibility", "hidden");

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
                    .on("click", _.bind(self.initial_click, self));

                self.create_listeners();
            });
        },
        create_listeners: function() {
            IndexSelector.__super__.create_listeners.apply(this);
            this.model.on("change:color", this.color_change, this);
        },
        color_change: function() {
            if(this.model.get("color")!=null){
                this.line.style("stroke", this.model.get("color"));
            }
        },
        initial_click: function() {
            this.line.attr("visibility", "visible");
            this.click();
            this.background.on("click", _.bind(this.click, this));
        },
        click: function () {
            this.active = !this.active;
        },
        mousemove: function() {
            if (!this.active) {
                return;
            }

            var mouse_pos = d3.mouse(this.background.node());
            var xpixel = mouse_pos[0];
            //update the index vertical line
            this.line.attr({x1: xpixel, x2: xpixel});
            this.model.set_typed_field("selected", [this.invert_pixel(xpixel)]);
            var idx_selected = this.mark_views.map(function(mark_view) {
                return mark_view.invert_point(xpixel);
            });
            this.model.set("idx_selected", idx_selected);
            this.touch();
        },
        invert_pixel: function(pixel) {
            var x_value = this.scale.scale.invert(pixel);
            return x_value;
        },
        reset: function() {
            this.active = false;
            this.line.attr("x1", 0)
                .attr("x2", 0)
                .attr("visibility", "hidden");
            this.background.on("click", _.bind(this.initial_click, this));
            this.scale = this.parent.x_scale;
        },
        remove: function() {
            this.line.remove();
            this.background.remove();
            IndexSelector.__super__.remove.apply(this);
        },
        relayout: function() {
            IndexSelector.__super__.relayout.apply(this);
            this.line.attr("y1", 0)
                .attr("y2", this.height);
            this.background.attr("width", this.width)
                .attr("height", this.height);
            this.set_range([this.scale]);
        },
        set_range: function(array) {
            for(var iter = 0; iter < array.length; iter++) {
                array[iter].set_range([0, this.width]);
            }
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.IndexSelectorOverlay", IndexSelector);
});

