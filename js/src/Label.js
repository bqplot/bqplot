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

var Label = mark.Mark.extend({
    render: function() {
        var base_render_promise = Label.__super__.render.apply(this);
        var that = this;

        //TODO: create_listeners is put inside the promise success handler
        //because some of the functions depend on child scales being
        //created. Make sure none of the event handler functions make that
        //assumption.
        this.drag_listener = d3.behavior.drag()
          .origin(function(d, i) { return that.drag_start(d, i, this); })
          .on("drag", function(d, i) { return that.on_drag(d, i, this); })
          .on("dragend", function(d, i) { return that.drag_ended(d, i, this); });
        return base_render_promise.then(function() {
            that.create_listeners();
            that.draw();
        });
    },

    set_ranges: function() {
        var x_scale = this.scales.x,
            y_scale = this.scales.y,
            size_scale = this.scales.size,
            opacity_scale = this.scales.opacity,
            rotation_scale = this.scales.rotation;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
        if(size_scale) {
            // I don't know how to set the lower bound on the range of the
            // values that the size scale takes. I guess a reasonable
            // approximation is that the area should be proportional to the
            // value. But I also want to set a lower bound of 10px area on
            // the size. This is what I do in the step below.

            // I don't know how to handle for ordinal scale.
            var size_domain = size_scale.scale.domain();
            var ratio = d3.min(size_domain) / d3.max(size_domain);
            size_scale.set_range([d3.max([(this.model.get("default_size") * ratio), min_size]),
                                 this.model.get("default_size")]);
        }
        if(rotation_scale) {
            rotation_scale.set_range([0, 180]);
        }
    },

    set_positional_scales: function() {
        this.x_scale = this.scales.x;
        this.y_scale = this.scales.y;
        // If no scale for "x" or "y" is specified, figure scales are used.
        if(!this.x_scale) {
            this.x_scale = this.parent.scale_x;
        }
        if(!this.y_scale) {
            this.y_scale = this.parent.scale_y;
        }
        this.listenTo(this.x_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
        this.listenTo(this.y_scale, "domain_changed", function() {
            if (!this.model.dirty) { this.draw(); }
        });
    },

    initialize_additional_scales: function() {
        // function to create the additional scales and create the
        // listeners for the additional scales
        var color_scale = this.scales.color,
            size_scale = this.scales.size,
            rotation_scale = this.scales.rotation;
        // the following handlers are for changes in data that does not
        // impact the position of the elements
        if (color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                var animate = true;
                this.color_scale_updated(animate);
            });
            color_scale.on("color_scale_range_changed",
                            this.color_scale_updated, this);
        }
        if (size_scale) {
            this.listenTo(size_scale, "domain_changed", function() {
                var animate = true;
                this.update_default_size(animate);
            });
        }
        if (rotation_scale) {
            this.listenTo(rotation_scale, "domain_changed", function() {
                var animate = true;
                this.update_xy_position(animate);
            });
        }
    },

    create_listeners: function() {
        Label.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:text", this.update_text, this);
        this.listenTo(this.model, "change:enable_move", this.set_drag_behavior);
        this.listenTo(this.model, "change:default_skew", this.update_default_skew, this);
        this.listenTo(this.model, "change:default_rotation", this.update_xy_position, this);
        this.listenTo(this.model, "change:default_size", this.update_default_size, this);
        this.listenTo(this.model, "change:tooltip", this.create_tooltip, this);
        this.model.on_some_change(["font_weight", "font_size", "colors",
                                   "align"], this.update_style, this);
        this.model.on_some_change(["x", "y", "x_offset", "y_offset",
                                   "rotate_angle"], this.update_position, this);
    },

    relayout: function() {
        this.set_ranges();
        this.update_position();
    },

    draw: function() {
        var that = this;
        this.set_ranges();
        this.el.selectAll(".label")
            .remove();

        var x_offset = this.model.get("x_offset"),
            y_offset = this.model.get("y_offset");

        var elements = this.el.selectAll(".label")
            .data(this.model.mark_data, function(d) { return d.unique_id; });

        var elements_added = elements.enter().append("g")
            .attr("class", "object_grp");

        elements_added.append("text")
            .classed("label", true);

        elements_added.selectAll(".label")
            .text(function(d) {
                return d.text;
            });
            
        this.set_drag_behavior();    
        this.update_style();
        this.update_position();
    },

    get_element_size: function(data) {
        var size_scale = this.scales.size;
        if(size_scale && data.size !== undefined) {
            return size_scale.scale(data.size);
        }
        return this.model.get("font_size");
    },

    get_element_rotation: function(data) {
        var rotation_scale = this.scales.rotation;
        return (!rotation_scale || !d.rotation) ? "rotate(" + this.model.get("rotate_angle") + ")" :
            "rotate(" + rotation_scale.scale(data.rotation) + ")";
    },

    update_position: function() {
        var that = this;
        var x_scale = this.scales.x;
        var y_scale = this.scales.y;
        var x = (this.x_scale.model.type === "date") ?
            this.model.get_date_elem("x") : this.model.get("x");
        var y = (this.y_scale.model.type === "date") ?
            this.model.get_date_elem("y") : this.model.get("y");
        var x_offset = this.model.get("x_offset"),
            y_offset = this.model.get("y_offset");
        this.el.selectAll(".object_grp")
            .attr("transform", function(d) {
                return "translate(" + (x_scale.scale(d.x) + x_scale.offset + x_offset) +
                                "," + (y_scale.scale(d.y) + y_scale.offset + y_offset) + ")" +
                       that.get_element_rotation(d);
            });
    },

    update_text: function(model, texts) {
        this.el.selectAll(".label")
            .text(function(d, i) {
                return texts[i];
            });
    },

    get_element_color: function(data, index) {
        var color_scale = this.scales.color;
        var colors = this.model.get("colors");
        var len = colors.length;
        if(color_scale && data.color !== undefined && data.color !== null) {
            return color_scale.scale(data.color);
        }
        return colors[index % len];
    },

    update_style: function() {
        var that = this;
        this.el.selectAll(".object_grp")
            .style("font-size", function(d, i) {
                return that.get_element_size(d);
            })
            .style("font-weight", this.model.get("font_weight"))
            .style("text-anchor", this.model.get("align"));
        
        this.el.selectAll(".label")
            .style("fill", function(d, i) {
                    return that.get_element_color(d,i);
            });
    },

    color_scale_updated: function(animate) {
        var that = this;
        var animation_duration = animate === true ? this.parent.model.get("animation_duration") : 0;

        this.el.selectAll(".object_grp")
            .select("text")
            .transition()
            .duration(animation_duration)
            .style("fill", function(d, i) {
                  return that.get_element_color(d, i);
            });
    },

    set_drag_behavior: function() {
        var label = this.el.selectAll(".label");
        if (this.model.get("enable_move")) {
            label.call(this.drag_listener);
        }
        else { 
            label.on(".drag", null); 
        }
    },

    drag_start: function(d, i, dragged_node) {
        var transform = d3.transform(dragged_node.attr("transform"));
        return {x: transform.translate[0], y: transform.translate[1]};
    },

    on_drag: function(d, i, dragged_node) {
        var x_scale = this.scales.x, y_scale = this.scales.y;

        d[0] = d3.event.x; 
        d[1] = d3.event.y;

        d3.select(dragged_node)
          .attr("transform", function() {
              return "translate(" + d[0] + "," + d[1] + ")";
          });
        if(this.model.get("update_on_move")) {
            // saving on move if flag is set
            this.update_array(d, i);
        }
    },

    drag_ended: function(d, i, dragged_node) {
        var stroke = this.model.get("stroke"),
            original_color = this.get_element_color(d, i),
            x_scale = this.scales.x,
            y_scale = this.scales.y;

        d3.select(dragged_node)
          .select("path")
          .classed("drag_scatter", false)
          .transition()
          .attr("d", this.dot.size(this.get_element_size(d)));

        if (this.model.get("drag_color")) {
            d3.select(dragged_node)
              .select("path")
              .style("fill", original_color)
              .style("stroke", stroke ? stroke : original_color);          
        }
        this.update_array(d, i);
        this.send({
            event: "drag_end",
            point: {x: x_scale.invert(d[0]), 
                    y: y_scale.invert(d[1])},
            index: i
        });
    }
});

module.exports = {
    Label: Label
};

