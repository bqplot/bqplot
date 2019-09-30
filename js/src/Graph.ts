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

import * as d3 from 'd3';
import 'd3-selection-multi';
// var d3 =Object.assign({}, require("d3-array"), require("d3-drag"), require("d3-force"), require("d3-selection"));
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import * as _ from 'underscore';
import { Mark } from './Mark';
import { GraphModel } from './GraphModel';

export class Graph extends Mark {
    render() {
        let base_creation_promise = super.render();

        const that = this;
        this.selected_style = this.model.get("selected_style");
        this.unselected_style = this.model.get("unselected_style");
        this.selected_indices = this.model.get("selected");

        this.hovered_style = this.model.get("hovered_style");
        this.unhovered_style = this.model.get("unhovered_style");
        this.hovered_index = !this.model.get("hovered_point") ? null: [this.model.get("hovered_point")];

        this.display_el_classes = ["element"];
        this.event_metadata = {
            "mouse_over": {
                "msg_name": "hover",
                "lookup_data": false,
                "hit_test": true
            },
            "element_clicked": {
                "msg_name": "element_click",
                "lookup_data": false,
                "hit_test": true
            },
            "parent_clicked": {
                "msg_name": "background_click",
                "hit_test": false
            }
        };
        this.displayed.then(function() {
            that.parent.tooltip_div.node().appendChild(that.tooltip_div.node());
            that.create_tooltip();
        });

        this.d3el.attr("class", "network");

        this.arrow = this.parent.svg.append("defs")
            .append("marker")
            .attr("id", "arrow")
            .attr("refX", 0)
            .attr("refY", 3)
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "linkarrow")
            .attr("d", "M0,0 L0,6 L9,3 z");

        return base_creation_promise.then(function() {
            that.event_listeners = {};
            that.process_interactions();
            that.create_listeners();
            that.compute_view_padding();
            that.draw();
        });
    }

    set_ranges() {
        const x_scale = this.scales.x,
            y_scale = this.scales.y;
        if (x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        if (y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
    }

    set_positional_scales() {
        this.x_scale = this.scales.x;
        this.y_scale = this.scales.y;

        // If no scale for "x" or "y" is specified, figure scales are used.
        if (!this.x_scale) {
            this.x_scale = this.parent.scale_x;
        }
        if (!this.y_scale) {
            this.y_scale = this.parent.scale_y;
        }

        this.listenTo(this.x_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.update_position(); }
        });
        this.listenTo(this.y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.update_position(); }
        });
    }

    relayout() {
        this.set_ranges();
        this.update_position();
    }

    update_position() {
        const x_scale = this.scales.x,
            y_scale = this.scales.y;
        this.set_ranges();

        if (x_scale && y_scale) {
            // set x and y positions on mark data manually
            // and redraw the force layout
            this.model.mark_data.forEach(function(d) {
                d.x = x_scale.scale(d.xval) + x_scale.offset;
                d.y = y_scale.scale(d.yval) + y_scale.offset;
            });

            if (this.force_layout) {
                this.force_layout.nodes(this.model.mark_data)
                    .force("link", d3.forceLink(this.model.link_data).distance(this.model.get("link_distance")));

                if (this.links) {
                    this.links.data(this.model.link_data);
                }
                if (this.nodes) {
                    this.nodes.data(this.force_layout.nodes());
                }

                if (this.nodes && this.links) {
                    this.tick();
                }
            }
        }
    }

    initialize_additional_scales() {
        const color_scale = this.scales.color;
        if (color_scale) {
            this.listenTo(color_scale, "domain_changed", function() {
                this.color_scale_updated();
            });
            color_scale.on("color_scale_range_changed",
                            this.color_scale_updated, this);
        }

        const link_color_scale = this.scales.link_color;
        if (link_color_scale) {
            this.listenTo(link_color_scale, "domain_changed", function() {
                this.link_color_scale_updated();
            });
        }
    }

    create_listeners() {
        super.create_listeners();
        this.d3el.on("mouseover", _.bind(function() {
              this.event_dispatcher("mouse_over");
          }, this))
          .on("mousemove", _.bind(function() {
              this.event_dispatcher("mouse_move");
          }, this))
          .on("mouseout", _.bind(function() {
              this.event_dispatcher("mouse_out");
          }, this));

        this.listenTo(this.model, "change:charge", this.update_charge);
        this.listenTo(this.model, "change:link_distance", this.update_link_distance);
        this.listenTo(this.model, "data_updated", this.data_updated);
        this.listenTo(this.model, "change:tooltip", this.create_tooltip);
        this.listenTo(this.model, "change:enable_hover", function() { this.hide_tooltip(); });
        this.listenTo(this.model, "change:interactions", this.process_interactions);
        this.listenTo(this.model, "change:selected", this.update_selected);
        this.listenTo(this.model, "change:hovered_point", this.update_hovered);
        this.listenTo(this.model, "change:hovered_style", this.hovered_style_updated);
        this.listenTo(this.model, "change:unhovered_style", this.unhovered_style_updated);

        this.listenTo(this.parent, "bg_clicked", function() {
            this.event_dispatcher("parent_clicked");
        });
    }

    data_updated() {
        this.draw();
        this.relayout();
    }

    get_node_color(data, index) {
        const color_scale = this.scales.color;
        const colors = this.model.get("colors");
        const len = colors.length;
        if (color_scale && data.color !== undefined) {
            return color_scale.scale(data.color);
        }
        return colors[index % len];
    }

    draw() {
        this.set_ranges();
        const x_scale = this.scales.x;
        const y_scale = this.scales.y;
        const link_color_scale = this.scales.link_color;

        // clean up the old graph
        this.d3el.selectAll(".node").remove();
        this.d3el.selectAll(".link").remove();

        if (x_scale && y_scale) {
            //set x and y on mark data manually
            this.model.mark_data.forEach(function(d) {
                d.x = x_scale.scale(d.xval) + x_scale.offset;
                d.y = y_scale.scale(d.yval) + y_scale.offset;
            });
        }

        const box = this.parent.fig.node().getBBox();
        const width = box.width;
        const height = box.height;
        this.force_layout = d3.forceSimulation()
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("forceX", d3.forceX().strength(0.1).x(width / 2))
            .force("forceY", d3.forceY().strength(0.1).y(height / 2));

        if (!x_scale && !y_scale) {
            this.force_layout
                .force("charge", d3.forceManyBody().strength(this.model.get("charge")))
                .on("tick", _.bind(this.tick, this))
        }

        const directed = this.model.get("directed");

        this.links = this.d3el.selectAll(".link")
            .data(this.model.link_data)
            .enter().append("path")
            .attr("class", "link")
            .style("stroke", function(d) {
                return link_color_scale ? link_color_scale.scale(d.value) : null;
            })
            .style("stroke-width", function(d) { return d.link_width; })
            .attr("marker-mid", directed ? "url(#arrow)" : null);

        this.force_layout.nodes(this.model.mark_data)
            .force("link", d3.forceLink(this.model.link_data).distance(this.model.get("link_distance")));

        const that = this;
        this.nodes = this.d3el.selectAll(".node")
            .data(this.force_layout.nodes())
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", _.bind(that.dragstarted, that))
                .on("drag", _.bind(that.dragged, that))
                .on("end", _.bind(that.dragended, that)));


        this.nodes
            .append(function(d) {
                return document.createElementNS(d3.namespaces.svg, d.shape);
            })
            .attr("class", "element")
            .each(function(d) {
                const node = d3.select(this);
                for(let key in d.shape_attrs) {
                    node.attr(key, d.shape_attrs[key]);
                }
            })
            .style("fill", function(d, i) {
                return that.get_node_color(d, i);
            });

        this.nodes.append("text")
            .attr("class", "label")
            .attr("text-anchor", function(d) {
                return d.label_display === "center" ? "middle": "start";
            })
            .attr("x", function(d) {
                let xloc = 0;
                if (d.label_display === "outside") {
                    switch (d.shape) {
                        case "rect":
                            xloc = d.shape_attrs.width / 2 + 5;
                            break;
                        case "circle":
                            xloc = d.shape_attrs.r + 5;
                            break;
                        case "ellipse":
                            xloc = d.shape_attrs.rx + 5;
                            break;
                        default:
                            xloc = 0;
                    }
                }
                return xloc;
            })
            .attr("y", ".31em")
            .text(function(d) { return d.label; })
            .style("display", function(d) {
                return d.label_display === "none" ? "none" : "inline";
            });

        this.nodes.on("click", _.bind(function(d, i) {
            this.event_dispatcher("element_clicked",
                  {"data": d, "index": i});
        }, this));
        this.nodes.on("mouseover", _.bind(function(d, i) {
            this.hover_handler({"data": d, "index": i});
        }, this));
        this.nodes.on("mouseout", _.bind(function() {
            this.reset_hover_points();
        }, this));
    }


    dragstarted(d) {
        if (!d3GetEvent().active) {
            this.force_layout.alphaTarget(.4).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(d) {
        d.fx = d3GetEvent().x;
        d.fy = d3GetEvent().y;
    }

    dragended(d) {
        if (!d3GetEvent().active) {
            this.force_layout.alphaTarget(.4);
        }
        d.fx = null;
        d.fy = null;
    }

    color_scale_updated() {
        const that = this;
        this.nodes
            .selectAll(".element")
            .style("fill", function(d, i) {
                return that.get_node_color(d, i);
            });
    }

    link_color_scale_updated() {
        const link_color_scale = this.scales.link_color;

        this.links.style("stroke", function(d) {
            return link_color_scale ? link_color_scale.scale(d.value) : null;
        });
    }

    process_click(interaction) {
        super.process_click(interaction);
        if (interaction === "select") {
            this.event_listeners.parent_clicked = this.reset_selection;
            this.event_listeners.element_clicked = this.click_handler;
        }
    }

    reset_hover_points() {
        this.links.style("opacity", 1);
        this.model.set("hovered_point", null);
        this.hovered_index = null;
        this.touch();
    }

    hover_handler(args) {
        const data = args.data;
        const index = args.index;
        const highlight_links = this.model.get("highlight_links");

        if (highlight_links) {
            this.links.style("opacity", function(d) {
                return d.source.label === data.label ||
                       d.target.label === data.label ? 1 : 0.1;
            });
        } else {
            this.links.style("opacity", 1);
        }

        this.model.set("hovered_point",
                       index, {updated_view: this});
        this.touch();
    }

    reset_selection() {
        this.model.set("selected", null);
        this.selected_indices = null;
        this.touch();
    }

    click_handler(args) {
        const index = args.index;
        const idx = this.model.get("selected") || [];
        let selected = Array.from(idx);
        const elem_index = selected.indexOf(index);
        // Replacement for "Accel" modifier.
        const accelKey = d3GetEvent().ctrlKey || d3GetEvent().metaKey;

        if(elem_index > -1 && accelKey) {
            // if the index is already selected and if accel key is
            // pressed, remove the node from the list
            selected.splice(elem_index, 1);
        } else {
            if(accelKey) {
                //If accel is pressed and the bar is not already selcted
                //add the bar to the list of selected bars.
                selected.push(index);
            }
            // updating the array containing the bar indexes selected
            // and updating the style
            else {
                //if accel is not pressed, then clear the selected ones
                //and set the current node to the selected
                selected = [];
                selected.push(index);
            }
        }
        this.model.set("selected",
                       ((selected.length === 0) ? null : selected),
                       {updated_view: this});
        this.touch();
        let e = d3GetEvent();
        if(!e) {
            e = window.event;
        }
        if(e.cancelBubble !== undefined) { // IE
            e.cancelBubble = true;
        }
        if(e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    }

    hovered_style_updated(model, style) {
        this.hovered_style = style;
        this.clear_style(model.previous("hovered_style"), this.hovered_index);
        this.style_updated(style, this.hovered_index);
    }

    unhovered_style_updated(model, style) {
        this.unhovered_style = style;
        const hov_indices = this.hovered_index;
        const unhovered_indices = (hov_indices) ?
            _.range(this.model.mark_data.length).filter(function(index){
                return hov_indices.indexOf(index) === -1;
            }) : [];
        this.clear_style(model.previous("unhovered_style"), unhovered_indices);
        this.style_updated(style, unhovered_indices);
    }

    update_selected(model, value) {
        this.selected_indices = value;
        this.apply_styles();
    }

    update_hovered(model, value) {
        this.hovered_index = value === null ? value : [value];
        this.apply_styles();
    }

    apply_styles(style_arr?) {
        if(style_arr === undefined || style_arr === null) {
            style_arr = [this.selected_style, this.unselected_style,
                         this.hovered_style, this.unhovered_style];
        }
        super.apply_styles(style_arr);

        const all_indices = _.range(this.model.mark_data.length);

        this.set_style_on_elements(this.hovered_style, this.hovered_index);
        const unhovered_indices = (!this.hovered_index) ?
            [] : _.difference(all_indices, this.hovered_index);
        this.set_style_on_elements(this.unhovered_style, unhovered_indices);
    }

    clear_style(style_dict, indices) {
        let nodes = this.d3el.selectAll(".element");
        if(indices) {
            nodes = nodes.filter(function(d, index) {
                return indices.indexOf(index) !== -1;
            });
        }
        const clearing_style = {};
        for(let key in style_dict) {
            clearing_style[key] = null;
        }
        nodes.styles(clearing_style);
    }

    set_style_on_elements(style, indices) {
        // If the index array is undefined or of length=0, exit the
        // function without doing anything
        if(!indices || indices.length === 0) {
            return;
        }
        // Also, return if the style object itself is blank
        if(style !== undefined && Object.keys(style).length === 0) {
            return;
        }
        let nodes = this.d3el.selectAll(".element");
        nodes = nodes.filter(function(data, index) {
            return indices.indexOf(index) !== -1;
        });
        nodes.styles(style);
    }

    compute_view_padding() {
        const x_padding = d3.max(this.model.mark_data.map(function(d) {
                return (d.shape_attrs.r ||
                        d.shape_attrs.width / 2 ||
                        d.shape_attrs.rx) + 1.0;
            }));

        const y_padding = d3.max(this.model.mark_data.map(function(d) {
                return (d.shape_attrs.r ||
                        d.shape_attrs.height / 2 ||
                        d.shape_attrs.ry) + 1.0;
            }));

        if (x_padding !== this.x_padding || y_padding !== this.y_padding) {
            this.x_padding = x_padding;
            this.y_padding = x_padding;
            this.trigger("mark_padding_updated");
        }
    }

    selected_deleter() {
        d3GetEvent().stopPropagation();
        return;
    }

    update_link_distance() {
        const x_scale = this.scales.x,
            y_scale = this.scales.y;

        const link_dist = this.model.get("link_distance");
        if (!x_scale && !y_scale) {
            this.force_layout.linkDistance(link_dist).start();
        }
    }

    update_charge() {
        const x_scale = this.scales.x,
            y_scale = this.scales.y;

        const charge = this.model.get("charge");
        if (!x_scale && !y_scale) {
            this.force_layout.charge(charge).start();
        }
    }

    link_arc(d) {
        const dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr +
               " 0 0,1 " + d.target.x + "," + d.target.y;
    }

    link_line(d) {
        const midx = (d.source.x + d.target.x) / 2,
            midy = (d.source.y + d.target.y) / 2;
        return "M" + d.source.x + "," + d.source.y + "L" + midx + "," +
               midy + "L" +  d.target.x + "," + d.target.y;
    }

    link_slant_line(d) {
        const midx = (d.source.x + d.target.x) / 2;
        return "M" + d.source.x + "," + d.source.y +
               "L" +  midx + "," + d.target.y +
               "L" +  d.target.x + "," + d.target.y;
    }

    tick() {
        const link_type = this.model.get("link_type");

        this.nodes.attr("transform", transform);

        // move rects to center since x, y of rect is at the corner
        this.nodes.select("rect")
            .attr("transform", function(d) {
                return "translate(" +
                       (-d.shape_attrs.width/2) + "," +
                       (-d.shape_attrs.height/2) + ")";
            });

        let link_path_func = this.link_arc;
        switch(link_type) {
            case 'arc':
                link_path_func = this.link_arc;
                break;
            case 'line':
                link_path_func = this.link_line;
                break;
            case 'slant_line':
                link_path_func = this.link_slant_line;
                break;
            default:
                link_path_func = this.link_arc;
        }

        this.links.attr("d", function(d) { return link_path_func(d); });

        function transform(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }
    }

    set_default_style(indices) {
    }

    hovered_style: any;
    unhovered_style: any;
    hovered_index: any;
    arrow: any;
    x_scale: any;
    y_scale: any;
    force_layout: any;
    links: any;
    nodes: any;

    model: GraphModel;
}
