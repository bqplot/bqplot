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
var ndarray = require("ndarray");
var ndarray_canvas  = require("ndarray-canvas");
var pool = require("ndarray-scratch")
var cwise = require("cwise");
var apply_colormap = require("apply-colormap")

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
            .attr("preserveAspectRatio", "none")
            .classed("image_interpolation_nearest", this.model.get('interpolation') == 'nearest')
            .classed("image_interpolation_bilinear", this.model.get('interpolation') == 'bilinear');

        return base_render_promise.then(() => {
            this.create_listeners();
            this.update_image();
            this.listenTo(this.parent, "margin_updated", () => {
                this.draw();
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
        this.listenTo(this.model, "change:interpolation", () => {
            this.im.classed("image_interpolation_nearest", this.model.get('interpolation') == 'nearest')
                   .classed("image_interpolation_bilinear", this.model.get('interpolation') == 'bilinear');
        });
        this.listenTo(this.scales.image.model, "change:min change:max change:scheme", this.update_image, this);
        this.listenTo(this.scales.image.model, "domain_changed", this.update_image, this);
        this.listenTo(this.model, "change:image", this.update_image, this);
        this.listenTo(this.model, "data_updated", function() {
            //animate on data update
            var animate = true;
            this.draw(animate);
        }, this);
    },

    update_image: function() {
        var image = this.model.get("image");
        // we're gonna modify in place, so copy
        image = pool.clone(image)
        // for viz appearently expects [x, y] instead of conventional [y, x]
        image = image.transpose(1, 0)
        var scale = cwise({
          args: ["array", "scalar", "scalar", "scalar"],
          body: function(a, s, lo, hi) {
            a = (a - lo) / (hi - lo) * s
          }
        })
        // we use our own color scale
        if(this.scales.image.model.get('scheme') && image.shape.length == 2) {
            scale(image, 1, this.scales.image.model.get('min') || 0, this.scales.image.model.get('max') || 1)
            var colors = this.scales.image.model.color_range;
            var color_scale = d3.scale.linear()
                                      .range(colors)
                                      .domain(_.range(colors.length).map((i) => i/(colors.length-1)))
            // convert the d3 color scale to something that is compatible with colormap
            var colormap = _.map(_.range(256), (i) => {
                var index = i/255;
                var rgb = color_scale(index);
                rgb = [parseInt("0x" + rgb.substring(1, 3)),
                       parseInt("0x" + rgb.substring(3, 5)),
                       parseInt("0x" + rgb.substring(5, 7))]
                return {index: index, rgb: rgb}
            })
            var rgb_data = apply_colormap(image, {colormap: colormap, min:0, max:1})
            var canvas = ndarray_canvas(null, rgb_data.pick(null, null, 0),
                                              rgb_data.pick(null, null, 1),
                                              rgb_data.pick(null, null, 2))
        } else if(image.shape.length == 3) {
            // only uint8 will be interpreted as 'raw' bytes, the rest will be scaled from [0,1] => [0, 255]
            if(!(image.data instanceof Uint8Array))
                scale(image, 255, 0, 1)
            var canvas = ndarray_canvas(null, image.pick(null, null, 0),
                                              image.pick(null, null, 1),
                                              image.pick(null, null, 2))
        } else {
            // this is grayscale, which works when 'scheme' is set to '', but this is not supported by coloraxis
            scale(image, 255, this.scales.image.model.get('min') || 0, this.scales.image.model.get('max') || 1)
            var canvas = ndarray_canvas(null, image)
        }
        var url = canvas.toDataURL('image/png');
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
