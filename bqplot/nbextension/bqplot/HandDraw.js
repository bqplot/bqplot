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

define(["widgets/js/manager", "d3", "./utils", "./Overlay"], function(WidgetManager, d3, utils, Overlay) {
    var HandDraw = Overlay.extend({

        render: function() {
            HandDraw.__super__.render.apply(this);
            var that = this;
            this.el.style({"cursor": "crosshair"});
            this.active = false;

            // Underlying line mark
            this.lines_model = this.model.get("lines");

            // Register the mouse callback when the mark view promises are
            // resolved.
            this.set_lines_view().then(function() {
                that.el
                    .on("mousedown", function() { that.mousedown(); })
                    .on("mousemove", function() { that.mousemove(); })
                    .on("mouseup", function() { that.mouseup(); });
            });

            // Update line index
            this.update_line_index();
            this.model.on("change:line_index", this.update_line_index, this);
        },
        set_lines_view: function() {
            var fig = this.parent;
            var self = this;
            return Promise.all(fig.mark_views.views).then(function(views) {
                var fig_mark_ids = fig.mark_views._models.map(function(mark_model) { return mark_model.id; });  // Model ids of the marks in the figure
                var mark_index = fig_mark_ids.indexOf(self.lines_model.id);
                self.lines_view = views[mark_index];
            });
        },
        mousedown: function () {
            this.active = true;
            this.mouse_entry(false);
            var that = this;
            this.el.on("mouseleave", function() { that.mouseup(); })
        },
        mouseup: function () {
            if (this.active) {
                this.mouse_entry(true);
                this.lines_model.set_typed_field("y", utils.deep_2d_copy(this.lines_model.y_data) );
                this.lines_view.touch();
                this.active = false;
                this.el.off("mouseleave");
            }
        },
        mousemove: function() {
            this.mouse_entry(true);
        },
        mouse_entry: function(memory) {
            // If memory is set to true, itermediate positions between the last
            // position of the mouse and the current one will be interpolated.
            if (this.active) {
                var that  = this;
                var xindex = Math.min(this.line_index, this.lines_model.x_data.length - 1);
                var mouse_pos = d3.mouse(this.el.node());
                if (!memory || !("previous_pos" in this)) {
                    this.previous_pos = mouse_pos;
                }
                var scale_x = this.lines_view.scales["x"].scale;
                var scale_y = this.lines_view.scales["y"].scale;

                var newx = scale_x.invert(mouse_pos[0]);
                var newy = scale_y.invert(mouse_pos[1]);
                var oldx = scale_x.invert(this.previous_pos[0]);
                var oldy = scale_y.invert(this.previous_pos[1]);
                var old_index = this.nns(this.lines_model.x_data[xindex], oldx);
                var new_index = this.nns(this.lines_model.x_data[xindex], newx);
                var min = Math.min(old_index, new_index);
                var max = Math.max(old_index, new_index);
                for (var i=min; i<=max; ++i) {
                    if (this.lines_model.x_data[xindex][i] >= this.model.get("min_x")
                     && this.lines_model.x_data[xindex][i] <= this.model.get("max_x")) {
                        this.lines_model.y_data[this.line_index][i] = newy;
                    }
                }
                var xy_data = this.lines_model.x_data[xindex].map(function(d, i) { return {x: d, y: that.lines_model.y_data[that.line_index][i]}; });
                this.lines_view.el.select("#curve" + (that.line_index + 1))
                    .attr("d", function(d) { return that.lines_view.line(xy_data); });
                this.previous_pos = mouse_pos;
            }
        },
        capnfloor: function(val) {
            // Not taking into account the position of the mouse beyond min_x
            // and max_x
            return Math.max(Math.min(val,this.model.get("max_x")),this.model.get("min_x"));
        },
        nns: function(x_data, x) {
            // Nearest neighbor search
            idx = this.lines_view.bisect(x_data, x);
            if (x - x_data[idx-1] > x_data[idx] - x) { return idx; } else { return idx-1; }
        },
        update_line_index: function() {
            // Called when the line index is changed in the model
            this.line_index = this.model.get("line_index");
        },
    });

    WidgetManager.WidgetManager.register_widget_view("bqplot.HandDraw", HandDraw);
});

