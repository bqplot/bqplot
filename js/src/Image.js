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

var d3 = require("d3");
var mark = require("./Mark");
var utils = require("./utils");
var _ = require("underscore");


var Image = mark.Mark.extend({

    render: function() {
        var base_render_promise = Image.__super__.render.apply(this);
        var el = this.d3el || this.el;
        window.last_el = el;
        window.last_image = this;
        this.im = el.append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 1)
            .attr("height", 1)
            .attr("preserveAspectRatio", "none");
        this.update_image();

        var that = this;
        return base_render_promise.then(function() {
            that.create_listeners();
            that.listenTo(that.parent, "margin_updated", function() {
                that.draw();
            });
        });
    },

    set_positional_scales: function() {
        var x_scale = this.scales.x,
            y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.draw();
             }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.draw();
            }
        });
    },

    set_ranges: function() {
        var x_scale = this.scales.x,
            y_scale = this.scales.y;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
    },

    create_listeners: function() {
        Image.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:image", this.update_image, this);
        this.listenTo(this.model, "data_updated", function() {
            //animate on data update
            var animate = true;
            this.draw(animate);
        }, this);
    },

    update_image: function() {
        if(this.im.attr("href")) {
            URL.revokeObjectURL(this.im.attr("href"));
        }
        var image = this.model.get("image");
        var blob = new Blob([image.get("value")], {type: "image/" + image.get("format")});
        var url = URL.createObjectURL(blob);
        this.im.attr("href", url);
    },

    remove: function() {
        URL.revokeObjectURL(this.im.attr("href"));
        Image.__super__.remove.apply(this);
    },

    relayout: function() {
        this.draw(true);
    },

    draw: function(animate) {
        this.set_ranges()

        var x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        var y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        var that = this;
        var animation_duration = animate ? this.parent.model.get("animation_duration") : 0;
        var el = this.d3el || this.el;
        var x_scaled = this.model.mark_data["x"].map(x_scale.scale),
            y_scaled = this.model.mark_data["y"].map(y_scale.scale);

        el.selectAll("image").transition()
            .duration(animation_duration)
            .attr("transform", function(d) {
                var tx = x_scaled[0] + x_scale.offset;
                var ty = y_scaled[1] + y_scale.offset;
                var sx = x_scaled[1] - x_scaled[0];
                var sy = y_scaled[0] - y_scaled[1];
                return "translate(" + tx + "," + ty + ") scale(" + sx + ", " + sy + ")"});
    },
});

module.exports = {
    Image: Image
};
