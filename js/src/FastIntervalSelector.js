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

var _ = require("underscore");
var d3 = require("d3");
var baseselector = require("./Selector");
var mark = require("./Mark");
var sel_utils = require("./selector_utils");

var FastIntervalSelector = baseselector.BaseXSelector.extend({

    render: function() {
        FastIntervalSelector.__super__.render.apply(this);
        this.freeze_but_move = true;
        this.freeze_dont_move = false;
        this.active = false;
        this.size = this.model.get("size");

        this.width = this.parent.width - this.parent.margin.left - this.parent.margin.right;
        this.height = this.parent.height - this.parent.margin.top - this.parent.margin.bottom;

        var that = this;
        var scale_creation_promise = this.create_scales();
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            //container for mouse events
            that.background = that.d3el.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.width)
                .attr("height", that.height)
                .attr("class", "selector selectormouse")
                .attr("pointer-events", "all")
                .attr("visibility", "hidden");

            that.background.on("mousemove", _.bind(that.mousemove, that))
                .on("click", _.bind(that.click, that))
                .on("dblclick", _.bind(that.dblclick, that));

            that.rect = that.d3el.append("rect")
                .attr("class", "selector intsel")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.size)
                .attr("height", that.height)
                .attr("pointer-events", "none")
                .attr("display", "none");

            that.color_change();

            that.create_listeners();
        });
    },

    create_listeners: function() {
        FastIntervalSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.color_change, this);
    },

    color_change: function() {
        if(this.model.get("color") !== null) {
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
        if (mouse_pos[0] - interval_size / 2 < 0) {
            start = 0;
        } else if ((mouse_pos[0] + interval_size / 2) > this.width) {
            start = this.width - interval_size;
        } else {
            start = mouse_pos[0] - interval_size / 2;
        }

        //update the interval location and size
        this.rect.attr("x", start);
        this.rect.attr("width", interval_size);
        var pixel_extent = [start, start + interval_size];
        this.model.set_typed_field("selected",
                                   this.scale.invert_range(pixel_extent),
                                   { js_ignore : true });
        this.update_mark_selected(pixel_extent);
        this.touch();
    },

    update_mark_selected: function(extent_x, extent_y) {

        if(extent_x === undefined || extent_x.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view) {
                return mark_view.selector_changed();
            });
        } if (extent_y === undefined) {
            // 1d brush
            var orient = this.model.get("orientation");
            var x = (orient == "vertical") ? [] : extent_x,
                y = (orient == "vertical") ? extent_x : [];
        } else {
            // 2d brush
            var x = extent_x, y = extent_y;
        }
        var point_selector = function(p) {
            return sel_utils.point_in_rectangle(p, x, y);
        };
        var rect_selector = function(xy) {
            return sel_utils.rect_inter_rect(xy[0], xy[1], x, y);
        };

        _.each(this.mark_views, function(mark_view) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    },

    scale_changed: function() {
        this.reset();
        this.create_scale();
    },

    relayout: function() {
        FastIntervalSelector.__super__.relayout.apply(this);

        this.adjust_rectangle();
        this.background
            .attr("width", this.width)
            .attr("height", this.height);

        this.set_range([this.scale]);
    },

    reset: function() {
        this.rect.attr("x", 0)
            .attr("width", 0);
        this.model.set_typed_field("selected", [], {js_ignore : true});
        this.update_mark_selected();
        this.touch();
    },

    update_scale_domain: function(ignore_gui_update) {
        // Call the base class function to update the scale.
        FastIntervalSelector.__super__.update_scale_domain.apply(this);
        if(ignore_gui_update !== true) {
            this.selected_changed();
        }
    },

    selected_changed: function(model, value, options) {
        //TODO: should the size get overridden if it was set previously and
        //then selected was changed from the python side?
        if(options && options.js_ignore) {
            //this change was most probably triggered from the js side and
            //should be ignored.
            return;
        }
        //reposition the interval selector and set the selected attribute.
        var selected = this.model.get_typed_field("selected");
        if(selected.length === 0) {
            this.reset();
        } else if (selected.length != 2) {
            // invalid value for selected. Ignoring the value
            return;
        } else {
            var pixels = selected.map(this.scale.scale);
            pixels = pixels.sort(function(a, b) { return a - b; });

            this.rect.attr({
                x: pixels[0],
                width: (pixels[1] - pixels[0])
            }).style("display", "inline");
            this.active = true;
            this.update_mark_selected(pixels)
        }
    },

    adjust_rectangle: function() {
        if (this.model.get("orientation") == "vertical") {
            this.d3el.selectAll("rect")
                .attr("x", 0)
                .attr("width", this.width);
        } else {
            this.d3el.selectAll("rect")
                .attr("y", 0)
                .attr("height", this.height);
        }
    },
});

module.exports = {
    FastIntervalSelector: FastIntervalSelector
};
