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
import { Mark } from './Mark';
import * as d3 from 'd3';
import * as markers from './Markers';
import * as _ from 'underscore';
import { GLAttributes } from './glattributes';
import { ScatterGLModel } from './ScatterGLModel';
import * as THREE from 'three';

const bqSymbol = markers.symbol;

const color_to_array_rgba = function(color, default_color?) {
    const color_name = color || default_color || [0., 0., 0., 0.];
    if(color_name == 'none') {
        return [0., 0., 0., 0.];
    } else {
        const color = new THREE.Color(color_name);
        return [color.r, color.g, color.b, 1.0];
    }
}

const create_colormap = function(scale) {
    // convert the d3 color scale to a texture
    const colors = scale ? scale.model.color_range : ['#ff0000', '#ff0000'];
    const color_scale = d3.scaleLinear()
                              .range(colors)
                              .domain(_.range(colors.length).map((i) => i / (colors.length - 1)));
    const colormap_array = [];
    const N = 256;
    _.map(_.range(N), (i) => {
        const index = i / (N - 1);
        const rgb = d3.color(String(color_scale(index))).hex();
        const rgb_str = String(rgb);
        const rgb_arr = [parseInt("0x" + rgb_str.substring(1, 3)),
                         parseInt("0x" + rgb_str.substring(3, 5)),
                         parseInt("0x" + rgb_str.substring(5, 7))];
        colormap_array.push(rgb_arr[0], rgb_arr[1], rgb_arr[2]);
    });
    const colormap_arr = new Uint8Array(colormap_array);
    const colormap_texture = new THREE.DataTexture(colormap_arr, N, 1, THREE.RGBFormat, THREE.UnsignedByteType);
    colormap_texture.needsUpdate = true;

    return colormap_texture;
}

export class ScatterGL extends Mark {

    render() {
        const base_render_promise = super.render();

        this.previous_values = {};
        this.attributes_changed = {};
        this.transitions = [];
        this.invalidated_pixel_position = true;

        const el = this.d3el || this.el;

        // only used for the legend
        this.dot = bqSymbol()
            .type(this.model.get("marker"));

        this.im = el.append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 200)
            .attr("height", 200)
            .attr("preserveAspectRatio", "none");

        this.scatter_material = new THREE.RawShaderMaterial({
            uniforms: {
                domain_x: {type: "2f", value: [0., 10.]},
                domain_y: {type: "2f", value: [-12., 12.]},
                domain_z: {type: "2f", value: [0., 1.]},
                domain_size: {type: "2f", value: [0., 1.]},
                domain_color: {type: "2f", value: [0., 1.]},
                domain_rotation: {type: "2f", value: [0., 180]},
                domain_opacity: {type: "2f", value: [0., 1.]},
                range_x: {type: "2f", value: [0., 1.]},
                range_y: {type: "2f", value: [0., 1.]},
                range_z: {type: "2f", value: [0., 1.]},
                range_size: {type: "2f", value: [0., 1.]},
                range_rotation: {type: "2f", value: [0., Math.PI]},
                range_opacity: {type: "2f", value: [0., 1.]},
                animation_time_x: {type: "f", value: 1.},
                animation_time_y: {type: "f", value: 1.},
                animation_time_z: {type: "f", value: 1.},
                animation_time_vx: {type: "f", value: 1.},
                animation_time_vy: {type: "f", value: 1.},
                animation_time_vz: {type: "f", value: 1.},
                animation_time_size: {type: "f", value: 1.},
                animation_time_color: {type: "f", value: 1.},
                animation_time_rotation: {type: "f", value: 1.},
                animation_time_opacity: {type: "f", value: 1.},

                has_selection: {type: "b", value: false},
                has_hover: {type: "b", value: false},

                has_selected_fill: {type: "b", value: false},
                has_selected_stroke: {type: "b", value: false},
                has_selected_opacity: {type: "b", value: false},
                has_unselected_fill: {type: "b", value: false},
                has_unselected_stroke: {type: "b", value: false},
                has_unselected_opacity: {type: "b", value: false},

                has_hovered_fill: {type: "b", value: false},
                has_hovered_stroke: {type: "b", value: false},
                has_hovered_opacity: {type: "b", value: false},
                has_unhovered_fill: {type: "b", value: false},
                has_unhovered_stroke: {type: "b", value: false},
                has_unhovered_opacity: {type: "b", value: false},

                selected_fill: {type: "4f", value: [1., 0., 0., 1.0]},
                selected_stroke: {type: "4f", value: [1., 0., 0., 1.0]},
                selected_opacity: {value: 1.0},
                unselected_fill: {type: "4f", value: [1., 0., 0., 1.0]},
                unselected_stroke: {type: "4f", value: [1., 0., 0., 1.0]},
                unselected_opacity: {value: 1.0},
                hovered_fill: {type: "4f", value: [0., 1., 0., 1.0]},
                hovered_opacity: {value: 1.0},
                hovered_stroke: {type: "4f", value: [0., 1., 0., 1.0]},
                unhovered_fill: {type: "4f", value: [0., 1., 0., 1.0]},
                unhovered_stroke: {type: "4f", value: [0., 1., 0., 1.0]},
                unhovered_opacity: {value: 1.0},

                default_stroke_color: {type: "4f", value: [0, 0, 0, 0]},

                colormap: {type: 't', value: null},
                fill: {type: 'b', value: true},
                stroke_width: {type: 'f', value: 1.5},
                marker_scale: {type: 'f', value: 1.0}
            },
            vertexShader: require('raw-loader!../shaders/scatter-vertex.glsl'),
            fragmentShader: require('raw-loader!../shaders/scatter-fragment.glsl'),
            transparent: true,
            depthTest: false,
            depthWrite: false,
            // background reading for blending:
            // https://limnu.com/webgl-blending-youre-probably-wrong/
            blending: THREE.CustomBlending,

            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,

            blendEquationAlpha: THREE.AddEquation,
            blendSrcAlpha: THREE.OneFactor,
            blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        });

        // we use a plane (2 triangles) as 'template' for the instanced geometry
        this.plane_buffer_geometry = new THREE.PlaneBufferGeometry();

        return base_render_promise.then(() => {
            this.camera = new THREE.OrthographicCamera(-1/2, 1/2, 1/2, -1/2, -10000, 10000);
            this.camera.position.z = 10;
            this.scene = new THREE.Scene();

            // helper objects to keep track of a set of attributes
            this.attributes = new GLAttributes([], [], () => 1, 0, [], {});
            this.attributes_previous = new GLAttributes([], [], () => 1, 0, [], {});
            // these contain the modified/padded/truncated attributes
            this.attributes_active = null;
            this.attributes_active_previous = null;
            this.push_array('x');
            this.push_array('y');
            this.push_array('rotation');
            this.push_opacity();
            this.push_color();
            this.push_size();
            this.push_selected();
            this.update_geometry();
            this.scene.add(this.mesh);

            this.create_listeners();
            this.update_scene();
            this.listenTo(this.parent, "margin_updated", () => {
                this.update_scene();
            });
        });
        return base_render_promise;
    }

    push_size() {
        // size can be an array, or a scalar (default_size)
        let ar = this.model.get('size');
        // first time, so make the previous value the same
        if(!this.attributes.contains('size')) {
            if(ar)
                this.attributes_previous.array['size'] = this.attributes.array['size'] = ar;
            else
                this.attributes_previous.scalar['size'] = this.attributes.scalar['size'] = this.model.get('default_size');
        } else {
            let type_name = ar ? 'array' : 'scalar';
            let type_prev = typeof this.attributes.array['size'] != 'undefined' ? 'array' : 'scalar';
            delete this.attributes_previous.scalar['size'];
            delete this.attributes_previous.array['size'];

            this.attributes_previous[type_prev]['size'] = this.attributes[type_prev]['size'];
            delete this.attributes[type_prev]['size'];
            this.attributes[type_name]['size'] = ar || this.model.get('default_size');
        }
        this.attributes_previous.compute_length();
        this.attributes.compute_length();
        this.push_selected();
    }

    push_color() {
        let color = this.model.get('color');
        let type_name = 'array';
        if(!color) {
            let colors = this.model.get('colors');
            if(!colors) {
                colors = [(this.model.get('unselected_style') || {})['fill'] || 'orange']; // TODO: what should the default color be
            } else {
                // this.scatter_material.defines['USE_COLORMAP'] = true;
                let length = colors.length == 1 ? 1 : this.attributes.length;
                color = new Float32Array(length * 3);
                _.each(_.range(length), (i) => {
                    const scatter_color = new THREE.Color(colors[i % colors.length]); // TODO: can be done more efficiently
                    color[i*3+0] = scatter_color.r;
                    color[i*3+1] = scatter_color.g;
                    color[i*3+2] = scatter_color.b;
                })
                type_name = length == 1 ? 'scalar_vec3' : 'array_vec3';
            }
        }
        let type_prev = this.attributes.type_name('color');

        if(!this.attributes.contains('color')) {
            this.attributes_previous[type_name]['color'] = this.attributes[type_name]['color'] = color;
            type_prev = type_name;
        } else {
            this.attributes_previous.drop('color');
            this.attributes_previous[type_prev]['color'] = this.attributes[type_prev]['color'];
            this.attributes.drop('color');
            this.attributes[type_name]['color'] = color;
        }
        this.attributes_previous.compute_length();
        this.attributes.compute_length();
        // if it's not a vec3 type, we use a colormap
        this.scatter_material.defines['USE_COLORMAP'] = type_name.indexOf('vec3') == -1;
        this.scatter_material.defines['USE_COLORMAP_PREVIOUS'] = type_prev.indexOf('vec3') == -1;
        this.push_selected();
        this.scatter_material.needsUpdate = true;
    }

    push_opacity() {
        let value = this.model.get('opacity');
        let type_name = 'array';
        if(!value) {
            let default_opacities = this.model.get('default_opacities');
            if(!default_opacities)
                default_opacities = [1.];

            // this.scatter_material.defines['USE_COLORMAP'] = true;
            if(default_opacities.length == 1) {
                type_name = 'scalar';
                value = new Float32Array(default_opacities);
            } else {
                type_name = 'array';
                value = new Float32Array(this.attributes.length);
                // TODO: instead of a loop, we might be able to do this more efficiently using TypedArray.set ?
                for(let i = 0; i < value.length; i++) {
                    value[i] = default_opacities[i % default_opacities.length];
                }
            }
        }
        let type_prev = this.attributes.type_name('opacity');

        if(!this.attributes.contains('opacity')) {
            this.attributes_previous[type_name]['opacity'] = this.attributes[type_name]['opacity'] = value;
            // type_prev = type_name;
        } else {
            this.attributes_previous.drop('opacity');
            this.attributes_previous[type_prev]['opacity'] = this.attributes[type_prev]['opacity'];
            this.attributes.drop('opacity');
            this.attributes[type_name]['opacity'] = value;
        }
        this.attributes_previous.compute_length();
        this.attributes.compute_length();
        this.push_selected();
        this.scatter_material.needsUpdate = true;
    }

    push_array(name) {
        let ar = this.model.get(name);
        if(!ar) return;
        this.attributes_previous.array[name] = this.attributes.array[name] || ar;
        this.attributes.array[name] = ar;
        this.attributes_previous.compute_length();
        this.attributes.compute_length();
        this.push_selected();
    }

    push_selected() {
        const selected = this.model.get('selected');
        if(this.attributes_active && this.mesh.geometry.attributes.selected) {
            if(selected) {
                this.scatter_material.uniforms['has_selection'].value = true;
                let selected_mask = this.mesh.geometry.attributes.selected.array;
                selected_mask.fill(0);
                for(let i =0; i < selected.length; i++) {
                    if(selected[i] < selected_mask.length)
                        selected_mask[selected[i]] = 1;
                }
                this.mesh.geometry.attributes.selected.needsUpdate = true;
                // this.mesh.geometry.attributes.selected_.needsUpdate = true;
                this.update_scene();
                // return;
            }

        }
        this.attributes.drop('selected');
        this.attributes_previous.drop('selected');
        // no animation yet, lets shove the max length mask in both
        let length = Math.max(this.attributes.length, this.attributes_previous.length, _.max(selected)+1);
        let selected_mask = new Uint8Array(length);
        if(selected) {
            this.scatter_material.uniforms['has_selection'].value = true;
            for(let i =0; i < selected.length; i++) {
                if(selected[i] < selected_mask.length)
                    selected_mask[selected[i]] = 1;
            }
        } else {
            this.scatter_material.uniforms['has_selection'].value = false;
        }
        this.attributes.array['selected'] = selected_mask;
        this.attributes_previous.array['selected'] = selected_mask;
        this.attributes_previous.compute_length();
        this.attributes.compute_length();
    }

    update_geometry(attributes_changed?, finalizers?) {
        this.instanced_geometry = new THREE.InstancedBufferGeometry();

        // we copy positions and uv from our plane (our 'template')
        const vertices = this.plane_buffer_geometry.attributes.position.clone();
        this.instanced_geometry.addAttribute('position', vertices);

        const uv = this.plane_buffer_geometry.attributes.uv.clone();
        this.instanced_geometry.addAttribute('uv', uv);

        // also copy the indices that refer to the vertices
        this.instanced_geometry.index = this.plane_buffer_geometry.index;

        const previous_length = this.attributes_previous.length;
        const current_length = this.attributes.length;

        // TODO: optimize, there are cases where do don't have to copy, but use the originals
        this.attributes_active = this.attributes.deepcopy();
        this.attributes_active_previous = this.attributes_previous.deepcopy();
        this.attributes_active.trim(this.attributes_active.length);
        this.attributes_active_previous.trim(this.attributes_active_previous.length);

        if(this.attributes_active.length != this.attributes_active_previous.length) {
            this.attributes_active.ensure_array('size');
            this.attributes_active_previous.ensure_array('size');
        }
        if(this.attributes_active.length > this.attributes_active_previous.length) { // grow..
            this.attributes_active_previous.pad(this.attributes_active);
            this.attributes_active_previous.array['size'].fill(0, previous_length); // this will make them smoothly fade in
        } else if(this.attributes_active.length < this.attributes_active_previous.length) { // shrink..
            this.attributes_active.pad(this.attributes_active_previous);
            this.attributes_active.array['size'].fill(0, current_length); // this will make them smoothly fade out
        }
        this.attributes_active.add_attributes(this.instanced_geometry);
        this.attributes_active_previous.add_attributes(this.instanced_geometry, '_previous');

        if(!this.mesh) {
            this.mesh = new THREE.Mesh(this.instanced_geometry, this.scatter_material);
        }
        else {
            this.mesh.geometry.dispose();
            this.mesh.geometry = this.instanced_geometry;
        }
        _.each(attributes_changed, (key: any) => {
            const property = "animation_time_" + key;
            const done = () => {
                // _.each(attributes_changed, (prop) => {
                    delete this.previous_values[key] // may happen multiple times, that is ok
                // })
                _.each(finalizers, (finalizer: any) => {
                    finalizer()
                })
            };
            // uniforms of material_rgb has a reference to these same object
            const set = (value) => {
                this.scatter_material.uniforms[property]['value'] = value;
            }
            this.scatter_material.uniforms[property]['value'] = 0;
            this.transition(set, done, this);
        })
        this.attributes_changed = {};

        this.update_scene();
    }

    update_scene() {
        this.parent.update_gl();
    }

    render_gl() {
        this.set_ranges();
        const fig = this.parent;
        this.im.attr('x', 0)
               .attr('y', 0)
               .attr('width', fig.plotarea_width)
               .attr('height', fig.plotarea_height);
        this.camera.left = 0;
        const x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        const y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        const range_x = this.parent.padded_range("x", x_scale.model);
        const range_y = this.parent.padded_range("y", y_scale.model);

        _.each(['selected', 'hovered'], (style_type) => {
            _.each(['stroke', 'fill', 'opacity'], (style_property) => {
                this.scatter_material.uniforms[`has_${style_type}_${style_property}`].value   = Boolean(this.model.get(`${style_type}_style`)[style_property]);
                this.scatter_material.uniforms[`has_un${style_type}_${style_property}`].value = Boolean(this.model.get(`un${style_type}_style`)[style_property]);
                if(_.contains(['opacity'], style_property)) {
                    this.scatter_material.uniforms[`${style_type}_${style_property}`].value   = this.model.get(`${style_type}_style`)[style_property];
                    this.scatter_material.uniforms[`un${style_type}_${style_property}`].value = this.model.get(`un${style_type}_style`)[style_property];
                } else {
                    this.scatter_material.uniforms[`${style_type}_${style_property}`].value   = color_to_array_rgba(this.model.get(`${style_type}_style`)[style_property], 'green');
                    this.scatter_material.uniforms[`un${style_type}_${style_property}`].value = color_to_array_rgba(this.model.get(`un${style_type}_style`)[style_property], 'green');
                }
            })
        })

        this.camera.left  = 0;
        this.camera.right = fig.plotarea_width;
        this.camera.bottom = 0;
        this.camera.top = fig.plotarea_height;
        this.camera.updateProjectionMatrix();

        this.scatter_material.uniforms['range_x'].value = range_x;
        this.scatter_material.uniforms['range_y'].value = [range_y[1], range_y[0]]; // flipped coordinates in WebGL
        this.scatter_material.uniforms['domain_x'].value = x_scale.scale.domain();
        this.scatter_material.uniforms['domain_y'].value = y_scale.scale.domain();

        if(this.scales.size) {
            this.scatter_material.uniforms['range_size'].value = this.scales.size.scale.range();
            this.scatter_material.uniforms['domain_size'].value = this.scales.size.scale.domain();
        } else {
            const size = this.model.get('default_size');
            this.scatter_material.uniforms['range_size'].value = [0, size];
            this.scatter_material.uniforms['domain_size'].value = [0, size];
        }

        if(this.scales.rotation) {
            this.scatter_material.uniforms['range_rotation'].value = this.scales.rotation.scale.range();
            this.scatter_material.uniforms['domain_rotation'].value = this.scales.rotation.scale.domain();
        }

        if(this.scales.opacity) {
            this.scatter_material.uniforms['range_opacity'].value = this.scales.opacity.scale.range();
            this.scatter_material.uniforms['domain_opacity'].value = this.scales.opacity.scale.domain();
        }

        const renderer = fig.renderer;
        renderer.render(this.scene, this.camera);

        const transitions_todo = [];
        for(let i = 0; i < this.transitions.length; i++) {
            const t = this.transitions[i];
            if(!t.is_done())
                transitions_todo.push(t);
            t.update();
        }
        this.transitions = transitions_todo;
        if(this.transitions.length > 0) {
            this.update_scene();
        }
    }

    create_listeners() {
        super.create_listeners();
        this.listenTo(this.model, "change:x", () => {
            this.push_array('x');
            this.update_geometry(['x', 'size'], [() => this.push_array('x')]);
        });
        this.listenTo(this.model, "change:y", () => {
            this.push_array('y');
            this.update_geometry(['y', 'size'], [() => this.push_array('y')]);
        });
        this.listenTo(this.model, 'change:marker', this.update_marker);
        this.update_marker();
        this.listenTo(this.model, 'change:stroke', this.update_stroke);
        this.update_stroke();
        this.listenTo(this.model, 'change:stroke_width', this.update_stroke_width);
        this.update_stroke_width();
        this.listenTo(this.model, "change:rotation", () => {
            this.push_array('rotation');
            this.update_geometry(['rotation', 'size'], [() => this.push_array('rotation')]);
        });
        this.listenTo(this.model, "change:opacity change:default_opacities", () => {
            this.push_opacity();
            this.update_geometry(['opacity'], [() => this.push_opacity()]);
        });
        this.listenTo(this.model, "change:color change:colors change:selected_style change:unselected_style change:hovered_style change:unhovered_style", () => {
            this.push_color();
            this.update_geometry(['color'], [() => this.push_color()]);
        });
        this.listenTo(this.model, "change:size change:default_size", () => {
            this.push_size();
            this.update_geometry(['size'], [() => this.push_size()]);
        });
        this.listenTo(this.model, "change:selected", () => {
            this.push_selected();
            // this.update_geometry([])
        });
        const sync_visible = () => {
            this.mesh.visible = this.model.get('visible')
            this.update_scene();
        }
        this.listenTo(this.model, "change:visible", sync_visible);
        sync_visible();

        const sync_fill = () => {
            this.scatter_material.defines['FILL'] = this.model.get('fill') ? 1 : 0;
            this.scatter_material.needsUpdate = true;
            this.update_scene();
        }
        this.listenTo(this.model, "change:fill", sync_fill);
        sync_fill();

        this.listenTo(this.model, "change", this.update_legend);

        // many things to implement still
        // this.listenTo(this.model, "change:default_opacities", this.update_default_opacities);
        // this.listenTo(this.model, "change:default_skew", this.update_default_skew);
        // this.listenTo(this.model, "change:default_rotation", this.update_xy_position);
        // this.listenTo(this.model, "change:fill", this.update_fill);
        // this.listenTo(this.model, "change:display_names", this.update_names);
    }

    update_marker() {
        const FAST_CIRCLE = 1;
        const FAST_SQUARE = 2;
        const FAST_ARROW = 3;
        const FAST_CROSS = 4;

        const marker = this.model.get('marker');
        this.dot.type(marker);

        if(marker === 'circle') {
            // same as in ./Markers.js
            this.scatter_material.uniforms.marker_scale.value = 1/Math.sqrt(Math.PI);
            this.scatter_material.defines['FAST_DRAW'] = FAST_CIRCLE;
        }
        if(marker === 'square') {
            this.scatter_material.uniforms.marker_scale.value = 1/2.;
            this.scatter_material.defines['FAST_DRAW'] = FAST_SQUARE;
        }
        if(marker === 'arrow') {
            this.scatter_material.uniforms.marker_scale.value = 2.;
            this.scatter_material.defines['FAST_DRAW'] = FAST_ARROW;
        }
        if(marker === 'cross') {
            this.scatter_material.uniforms.marker_scale.value = 3./(2. * Math.sqrt(5.));
            this.scatter_material.defines['FAST_DRAW'] = FAST_CROSS;
        }

        this.scatter_material.needsUpdate = true;
        this.update_scene();
    }

    update_stroke() {
        const stroke = this.model.get('stroke');

        if(stroke) {
            this.scatter_material.uniforms.default_stroke_color.value = color_to_array_rgba(stroke);
            this.scatter_material.defines['HAS_DEFAULT_STROKE_COLOR'] = true;
        } else {
            this.scatter_material.defines['HAS_DEFAULT_STROKE_COLOR'] = false;
        }

        this.scatter_material.needsUpdate = true;
        this.update_scene();
    }

    update_stroke_width() {
        this.scatter_material.uniforms.stroke_width.value = this.model.get('stroke_width');
        this.update_scene();
    }

    update_color_map() {
        this.scatter_material.uniforms['colormap'].value = create_colormap(this.scales.color)

        if(this.scales.color) {
            const color = this.model.get('color');
            let min;
            let max;
            if(this.scales.color.model.min !== null) {
                min = this.scales.color.model.min;
            } else {
                min = Math.min(...color);
            }
            if(this.scales.color.model.max !== null) {
                max = this.scales.color.model.max;
            } else {
                max = Math.max(...color);
            }
            this.scatter_material.uniforms['domain_color'].value = [min, max];
        }

        this.update_scene();
    }

    update_position(animate?) {
        this.update_scene();
        this.invalidate_pixel_position();
    }

    // we want to compute the pixels coordinates 'lazily', since it's quite expensive for 10^6 points
    invalidate_pixel_position() {
        this.invalidated_pixel_position = true;
    }

    ensure_pixel_position() {
        if(this.invalidated_pixel_position)
            this.update_pixel_position();
    }

    update_pixel_position(animate?) {
        const x_scale = this.scales.x, y_scale = this.scales.y;

        const x_data = this.model.get("x");
        const y_data = this.model.get("y");
        const N = Math.min(x_data.length, y_data.length);
        // this.pixel_coords = _.map(_.range(N), (i) => {
        //         return [x_scale.scale(x_data[i]) + x_scale.offset,
        //                 y_scale.scale(y_data[i]) + y_scale.offset];
        //     });
        this.pixel_x = new Float64Array(N);
        this.pixel_y = new Float64Array(N);
        for(let i = 0; i < N; i++) {
            this.pixel_x[i] = x_scale.scale(x_data[i]) + x_scale.offset;
            this.pixel_y[i] = y_scale.scale(y_data[i]) + y_scale.offset;
        }
        this.invalidated_pixel_position = false;
    }

    selector_changed(point_selector, rect_selector) {
        if(!this.trottled_selector_changed)
            this.trottled_selector_changed = _.throttle(this._real_selector_changed, 50, {leading: false});
        this.trottled_selector_changed(point_selector, rect_selector);
    }

    _real_selector_changed(point_selector, rect_selector) {
        // not sure why selection isn't working yet
        this.ensure_pixel_position()
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        const selection_mask = point_selector(this.pixel_x, this.pixel_y);
        let selected = new Uint32Array(selection_mask.length);
        let count = 0;
        const N = selection_mask.length;
        for(let i=0; i < N; i++) {
            if(selection_mask[i]) {
                selected[count++] = i;
            }
        }
        selected = selected.slice(0, count);
        this.model.set("selected", selected);
        this.touch();
    }

    set_positional_scales() {
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
            if (!this.model.dirty) {
                const animate = true;
                this.update_position(animate);
            }
        });
        this.listenTo(this.y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                const animate = true;
                this.update_position(animate);
            }
        });
    }

    initialize_additional_scales() {
        const color_scale = this.scales.color;
        const size_scale = this.scales.size;
        const opacity_scale = this.scales.opacity;
        const rotation_scale = this.scales.rotation;
        // the following handlers are for changes in data that does not
        // impact the position of the elements
        if (color_scale) {
            this.listenTo(color_scale, 'all', this.update_color_map);
            this.update_color_map();
        }
        if (size_scale) {
            this.listenTo(size_scale, "domain_changed", () => {
                this.update_scene();
            });
        }
        if (opacity_scale) {
            this.listenTo(opacity_scale, "domain_changed", () => {
                this.update_scene();
            });
        }
        if (rotation_scale) {
            this.listenTo(rotation_scale, "domain_changed", () => {
                this.update_scene();
            });
        }
    }

    set_ranges() {
        const x_scale = this.scales.x,
            y_scale = this.scales.y,
            size_scale = this.scales.size,
            opacity_scale = this.scales.opacity,
            skew_scale = this.scales.skew,
            rotation_scale = this.scales.rotation;
        if(x_scale) {
            x_scale.set_range(this.parent.padded_range("x", x_scale.model));
        }
        if(y_scale) {
            y_scale.set_range(this.parent.padded_range("y", y_scale.model));
        }
        if(size_scale) {
            size_scale.set_range([0, this.model.get("default_size")]);
        }
        if(opacity_scale) {
            opacity_scale.set_range([0.2, 1]);
        }
        if(skew_scale) {
            skew_scale.set_range([0, 1]);
        }
        if(rotation_scale) {
            rotation_scale.set_range([0, Math.PI]); // TODO: this mirrors the 180 from the normal scatter, but why not 360?
        }
    }

    transition(f, on_done, context) {
        // this is a copy from ipyvolume, maybe better to use tween, and do the rerendering
        // at the figure level (say if multiple scatter's want to rerender)
        const that = this;
        const Transition = function() {
            //this.objects = []
            this.time_start = (new Date()).getTime();
            this.duration = that.parent.model.get("animation_duration");
            this.cancelled = false;
            this.called_on_done = false;
            this.set = function(obj) {
                this.objects.push(obj);
            }
            this.is_done = function() {
                const dt = (new Date()).getTime() - this.time_start;
                return (dt >= this.duration) || this.cancelled;
            }
            this.cancel = function() {
                this.cancelled = true;
            },
            this.update = function() {
                if(this.cancelled)
                    return;
                const dt = ((new Date()).getTime() - this.time_start)/this.duration;

                const u = Math.min(1, dt);
                f.apply(context, [u]);
                if(dt >= 1 && !this.called_on_done) {
                    this.called_on_done = true;
                    on_done.apply(context);
                }
                that.update_scene();
            }
            if(!this.duration) {
                f.apply(context, [1]);
                on_done.apply(context);
                that.update_scene();
            } else {
                that.transitions.push(this);
            }
        }
        return new Transition();
    }

    draw_legend(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        this.legend_el = elem.selectAll(".legend" + this.uuid)
          .data([{}]);
        const colors = this.model.get("colors"),
            len = colors.length;

        const that = this;
        const rect_dim = inter_y_disp * 0.8;
        const el_added = this.legend_el.enter()
          .append("g")
            .attr("class", "legend" + this.uuid)
            .attr("transform", function(d, i) {
                return "translate(0, " + (i * inter_y_disp + y_disp)  + ")";
            })

        this.draw_legend_elements(el_added, rect_dim)

        this.legend_el.append("text")
          .attr("class","legendtext")
          .attr("x", rect_dim * 1.2)
          .attr("y", rect_dim / 2)
          .attr("dy", "0.35em")
          .text(function(d, i) {
              return that.model.get("labels")[i];
          })
          .style("fill", function(d, i) {
              return colors[i % len];
          });

        const max_length = d3.max(this.model.get("labels"), function(d: any[]) {
            return d.length;
        });

        this.legend_el.exit().remove();
        return [1, max_length];
    }

    draw_legend_elements(elements_added, rect_dim) {
        const colors = this.model.get("colors"),
            stroke = this.model.get("stroke"),
            fill   = this.model.get("fill");

        elements_added.append("path")
          .attr("transform", function(d, i) {
              return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
          })
          .attr("d", this.dot.size(64))
              .style("fill", fill   ? colors[0] : 'none')
              .style("stroke", stroke ? stroke : colors[0]);
    }

    update_legend() {
        if (this.legend_el) {
            const colors = this.model.get("colors"),
                stroke = this.model.get("stroke"),
                fill   = this.model.get("fill");
            this.legend_el.select("path")
              .style("fill", fill   ? colors[0] : 'none')
              .style("stroke", stroke ? stroke : colors[0]);
            this.legend_el.select("text")
              .style("fill", fill ? colors[0] : "none");
            if (this.legend_el) {
                this.legend_el.select("path")
                    .attr("d", this.dot.type(this.model.get("marker")));
            }
        }
    }

    relayout() {
        this.set_ranges();
        this.update_position();
    }

    draw(animate?) {}
    clear_style(style_dict, indices?, elements?) {}
    set_default_style(indices, elements?) {}
    set_style_on_elements(style, indices, elements?) {}
    compute_view_padding() {}

    legend_el: any;
    dot: any;
    transitions: any;
    x_scale: any;
    y_scale: any;
    pixel_x: any;
    pixel_y: any;
    trottled_selector_changed: any;
    invalidated_pixel_position: any;
    scatter_material: any;
    camera: any;
    scene: any;
    mesh: any;
    instanced_geometry: any;
    plane_buffer_geometry: any;
    im: any;
    marker_scale: any;
    marker_plane: any;
    previous_values: any;
    attributes_changed: any;
    attributes_active: any;
    attributes_active_previous: any;
    attributes_previous: any;

    model: ScatterGLModel;
};
