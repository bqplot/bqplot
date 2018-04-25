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
var _ = require("underscore");
var utils = require("./utils");
var baseselector = require("./Selector");
var sel_utils = require("./selector_utils");

var LassoSelector = baseselector.BaseXYSelector.extend({
    render: function() {
        LassoSelector.__super__.render.apply(this);
        var scale_creation_promise = this.create_scales();
        this.line = d3.svg.line();
        this.all_vertices = {};
        this.lasso_counter = 0;

        var that = this;
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            var drag = d3.behavior.drag()
                .on("dragstart", _.bind(that.drag_start, that))
                .on("drag", _.bind(that.drag_move, that))
                .on("dragend", _.bind(that.drag_end, that));

            d3.select(window).on("keydown", _.bind(that.keydown, that));

            that.d3el.attr("class", "lassoselector");

            //container for mouse events
            that.background = that.d3el.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.width)
                .attr("height", that.height)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .style("cursor", "crosshair")
                .call(drag);

            that.create_listeners();
        });
    },

    create_listeners: function() {
        LassoSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.change_color, this);
    },

    change_color: function(model, color) {
        if (color) {
            this.d3el.selectAll("path").style("stroke", color);
        }
    },

    create_new_lasso: function() {
        var lasso = this.d3el.append("path")
            .attr("id", "l" + (++this.lasso_counter))
            .on("click", function() {
                //toggle the opacity of lassos
                var lasso = d3.select(this);
                lasso.classed("selected", !lasso.classed("selected"));
            });
        var color = this.model.get("color");
        if (color) {
            lasso.style("stroke", color);
        }
    },

    drag_start: function() {
        this.current_vertices = [];
        this.create_new_lasso();
    },

    drag_move: function() {
        this.current_vertices.push(d3.mouse(this.background.node()));
        this.d3el.select("#l" + this.lasso_counter)
            .attr("d", this.line(this.current_vertices));
    },

    drag_end: function() {
        var lasso_name = "l" + this.lasso_counter;
        // Close the lasso
        this.d3el.select("#" + lasso_name)
            .attr("d", this.line(this.current_vertices) + "Z");
        // Add the current vertices to the global lasso vertices
        this.all_vertices[lasso_name] = this.current_vertices;
        // Update selected for each mark
        this.update_mark_selected(this.all_vertices)
    },

    update_mark_selected: function(vertices) {

        if(vertices === undefined || vertices.length === 0) {
            // Reset all the selected in marks
            _.each(this.mark_views, function(mark_view) {
                return mark_view.selector_changed();
            });
        }
        var point_selector = function(p) {
            for (var l in vertices) {
                if (sel_utils.point_in_lasso(p, vertices[l])) { return true; }
            } return false;
        };
        var rect_selector = function(xy) {
            for (var l in vertices) {
                if (sel_utils.lasso_inter_rect(xy[0], xy[1], vertices[l])) { return true; }
            } return false;
        };

        _.each(this.mark_views, function(mark_view) {
            mark_view.selector_changed(point_selector, rect_selector);
        }, this);
    },

    relayout: function() {
        LassoSelector.__super__.relayout.apply(this);
        this.background.attr("width", this.width).attr("height", this.height);
    },

    keydown: function() {
       // delete key pressed
       if (d3.event.keyCode === 46) {
           // Delete selected lassos
           var lassos_to_delete = this.d3el.selectAll(".selected");
           // Update the lasso vertices
           var vertices = this.all_vertices;
           lassos_to_delete.each(function() {
               var lasso_name = d3.select(this).attr("id");
               delete vertices[lasso_name];
           });
           lassos_to_delete.remove();
           this.update_mark_selected(this.all_vertices);
      }
    },

    reset: function() {
        this.lasso_counter = 0;
        this.all_vertices = {};
        this.d3el.selectAll("path").remove();
        this.update_mark_selected();
    },
});


module.exports = {
    LassoSelector: LassoSelector
};
