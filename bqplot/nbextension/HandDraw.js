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

define(["widgets/js/manager", "d3", "./utils", "./Interaction"], function(WidgetManager, d3, utils, Interaction) {
    var HandDraw = Interaction.extend({

        render: function() {
            HandDraw.__super__.render.apply(this);
            this.el.style({"cursor": "crosshair"});
            this.active = false;

            // Register the mouse callback when the mark view promises are
            // resolved.
            var that = this;
            this.set_lines_view().then(function() {
                that.el.on("mousedown", function() {
                    return that.mousedown();
                });
                that.set_limits();
            });

            // Update line index
            this.update_line_index();
            this.model.on("change:line_index", this.update_line_index, this);
            this.model.on_some_change(["min_x", "max_x"], this.set_limits,
                                      this);
        },
        set_lines_view: function() {
            var fig = this.parent;
            var lines_model = this.model.get("lines");
            var self = this;
            return Promise.all(fig.mark_views.views).then(function(views) {
                var fig_mark_ids = fig.mark_views._models.map(function(mark_model) {
                    return mark_model.id; // Model ids of the marks in the figure
                });
                var mark_index = fig_mark_ids.indexOf(lines_model.id);
                self.lines_view = views[mark_index];
            });
        },
        mousedown: function () {
            this.active = true;
            this.mouse_entry(false);
            var that = this;
            this.el.on("mousemove", function() { that.mousemove(); });
            this.el.on("mouseleave", function() { that.mouseup(); });
            this.el.on("mouseup", function() { that.mouseup(); });
        },
        mouseup: function () {
            if (this.active) {
                this.mouse_entry(true);
                var lines_model = this.model.get("lines");
                lines_model.set_typed_field("y", utils.deepCopy(lines_model.y_data));
                this.lines_view.touch();
                this.active = false;
                this.el.on("mousemove", null);
                this.el.on("mouseleave", null);
                this.el.on("mouseup", null);
            }
        },
        mousemove: function() {
            this.mouse_entry(true);
        },
        mouse_entry: function(memory) {
            // If memory is set to true, itermediate positions between the last
            // position of the mouse and the current one will be interpolated.
            if (this.active) {
                var lines_model = this.model.get("lines");
                var xindex = Math.min(this.line_index,
                                      lines_model.x_data.length - 1);
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
                var old_index = this.nns(lines_model.x_data[xindex], oldx);
                var new_index = this.nns(lines_model.x_data[xindex], newx);
                var min = Math.min(old_index, new_index);
                var max = Math.max(old_index, new_index);
                for (var i=min; i<=max; ++i) {
                    if ( (!(this.valid_min) ||
                          lines_model.x_data[xindex][i] >= this.min_x)
                     && ((!this.valid_max) ||
                         lines_model.x_data[xindex][i] <= this.max_x)) {
                        lines_model.y_data[this.line_index][i] = newy;
                    }
                }
                var that  = this;
                var xy_data = lines_model.x_data[xindex].map(function(d, i)
                {
                    return {x: d, y: lines_model.y_data[that.line_index][i]};
                });
                this.lines_view.el.select("#curve" + (that.line_index + 1))
                    .attr("d", function(d) {
                        return that.lines_view.line(xy_data);
                    });
                this.previous_pos = mouse_pos;
            }
        },
        capnfloor: function(val) {
            // Not taking into account the position of the mouse beyond min_x
            // and max_x
            return Math.max(Math.min(val,this.model.get("max_x")),
                            this.model.get("min_x"));
        },
        set_limits: function() {
            var is_date = (this.lines_view.scales["x"].model.type == "date");
            if(is_date) {
                this.min_x = this.model.get_date_elem("min_x");
                this.valid_min = !(this.min_x === null ||
                                   this.min_x === undefined ||
                                   isNaN(this.min_x.getTime()));
                this.max_x = this.model.get_date_elem("max_x");
                this.valid_max = !(this.max_x === null ||
                                   this.max_x === undefined ||
                                   isNaN(this.max_x.getTime()));
            } else {
                this.min_x = this.model.get("min_x");
                this.max_x = this.model.get("max_x");
                this.valid_min = !(this.min_x === null ||
                                   this.min_x === undefined);
                this.valid_max = !(this.max_x === null ||
                                   this.max_x === undefined);
            }
        },
        nns: function(x_data, x) {
            // Nearest neighbor search
            idx = this.lines_view.bisect(x_data, x);
            if (x - x_data[idx-1] > x_data[idx] - x) {
                return idx;
            } else {
                return idx-1;
            }
        },
        update_line_index: function() {
            // Called when the line index is changed in the model
            this.line_index = this.model.get("line_index");
        },
    });
    WidgetManager.WidgetManager.register_widget_view("bqplot.HandDraw", HandDraw);
});

