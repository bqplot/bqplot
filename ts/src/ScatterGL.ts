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
import { deepCopy } from './utils';
import { ScatterGLModel } from './ScatterGLModel';
import * as THREE from 'three';

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

const bqSymbol = markers.symbol;

const to_float_array = function(value: any) {
    if (value instanceof Float32Array) return value;
    if (typeof value[Symbol.iterator] === 'function') {
        const N = value.length;
        let array32 = new Float32Array(N);
        for(let i = 0; i < N; i++) {
            array32[i] = value[i];
        }
        return array32;
    }
    return new Float32Array(value);
};

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

class AttributeParameters {
    constructor(array: TypedArray, item_size: number = 1, mesh_per_attribute: number = 1, normalized: Boolean = false) {
        this.array = array;
        this.item_size = item_size;
        this.mesh_per_attribute = mesh_per_attribute;
        this.normalized = normalized;
    }

    array: TypedArray;
    item_size: number;
    mesh_per_attribute: number;
    normalized: Boolean;
};

class ColorAttributeParameters extends AttributeParameters {
    constructor(array: TypedArray, item_size: number = 1, mesh_per_attribute: number = 1, normalized: Boolean = false, use_colormap: Boolean = true) {
        super(array, item_size, mesh_per_attribute, normalized);
        this.use_colormap = use_colormap;
    }

    use_colormap: Boolean;
};

class SelectionAttributeParameters extends AttributeParameters {
    constructor(array: TypedArray, item_size: number = 1, mesh_per_attribute: number = 1, normalized: Boolean = false, use_selection: Boolean = true) {
        super(array, item_size, mesh_per_attribute, normalized);
        this.use_selection = use_selection;
    }

    use_selection: Boolean;
};

export class ScatterGL extends Mark {

    render() {
        const base_render_promise = super.render();

        this.transitions = [];
        this.invalidated_pixel_position = true;

        // only used for the legend
        this.dot = bqSymbol()
            .type(this.model.get("marker"));

        // Create square geometry (two triangles) for markers
        this.instanced_geometry = new THREE.InstancedBufferGeometry();

        const vertices = new Float32Array([
            -0.5,  0.5, 0.,
             0.5,  0.5, 0.,
            -0.5, -0.5, 0.,
             0.5, -0.5, 0.
        ]);
        this.instanced_geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const uv = new Float32Array([0., 1., 1., 1., 0., 0., 1., 0.]);
        this.instanced_geometry.addAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

        const indices = new Uint16Array([0, 2, 1, 2, 3, 1]);
        this.instanced_geometry.index = new THREE.Uint16BufferAttribute(indices, 1);

        // Create material for markers
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
            vertexShader: require('raw-loader!../shaders/scatter-vertex.glsl').default,
            fragmentShader: require('raw-loader!../shaders/scatter-fragment.glsl').default,
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

        // Create mesh
        this.mesh = new THREE.Mesh(this.instanced_geometry, this.scatter_material);

        return base_render_promise.then(() => {
            this.camera = new THREE.OrthographicCamera(-1/2, 1/2, 1/2, -1/2, -10000, 10000);
            this.camera.position.z = 10;
            this.scene = new THREE.Scene();

            const x_parameters = new AttributeParameters(to_float_array(this.model.get('x')));
            this.x = this.initialize_attribute('x', x_parameters);
            this.x_previous = this.initialize_attribute('x_previous', x_parameters);

            const y_parameters = new AttributeParameters(to_float_array(this.model.get('y')));
            this.y = this.initialize_attribute('y', y_parameters);
            this.y_previous = this.initialize_attribute('y_previous', y_parameters);

            this.markers_number = Math.min(this.x.array.length, this.y.array.length);
            this.instanced_geometry.maxInstancedCount = this.markers_number;

            const color_parameters = this.get_color_attribute_parameters();
            this.color = this.initialize_attribute('color', color_parameters);
            this.scatter_material.defines['USE_COLORMAP'] = color_parameters.use_colormap;

            const opacity_parameters = this.get_opacity_attribute_parameters();
            this.opacity = this.initialize_attribute('opacity', opacity_parameters);
            this.opacity_previous = this.initialize_attribute('opacity_previous', opacity_parameters);

            const size_parameters = this.get_size_attribute_parameters();
            this.size = this.initialize_attribute('size', size_parameters);
            this.size_previous = this.initialize_attribute('size_previous', size_parameters);

            const rotation_parameters = this.get_rotation_attribute_parameters();
            this.rotation = this.initialize_attribute('rotation', rotation_parameters);
            this.rotation_previous = this.initialize_attribute('rotation_previous', rotation_parameters);

            const selected_parameters = this.get_selected_attribute_parameters();
            this.selected = this.initialize_attribute('selected', selected_parameters);
            this.scatter_material.uniforms['has_selection'].value = selected_parameters.use_selection;

            this.scatter_material.needsUpdate = true;

            this.scene.add(this.mesh);

            this.create_listeners();
            this.compute_view_padding();
            this.update_scene();
            this.listenTo(this.parent, "margin_updated", () => {
                this.update_scene();
            });
        });
        return base_render_promise;
    }

    initialize_attribute(name: String, parameters: AttributeParameters) {
        const attribute = new THREE.InstancedBufferAttribute(parameters.array, parameters.item_size, parameters.mesh_per_attribute);
        attribute.normalized = parameters.normalized;
        attribute.dynamic = true;
        this.instanced_geometry.addAttribute(name, attribute);

        return attribute;
    }

    get_color_attribute_parameters() {
        if (this.model.get('color')) {
            const color = this.model.get('color');

            // TODO Use `default_color`?
            let array: Float32Array;
            if (color.length < this.markers_number) {
                array = to_float_array(this.markers_number);
                array.set(color);
            }
            else {
                array = to_float_array(color);
            }

            return new ColorAttributeParameters(array, 1, 1, true, true);
        } else {
            let colors = this.model.get('colors');

            if (!colors) {
                const color = (this.model.get('unselected_style') || {})['fill'] || 'orange';
                colors = [color];
            }

            let array: Float32Array;
            let mesh_per_attribute: number;
            if (colors.length == 1) {
                const color = new THREE.Color(colors[0]);

                array = to_float_array([color.r, color.g, color.b]);
                mesh_per_attribute = this.markers_number;
            } else {
                array = to_float_array(this.markers_number * 3);
                _.each(_.range(this.markers_number), (i) => {
                    const color = new THREE.Color(colors[i % colors.length]);
                    array[i * 3 + 0] = color.r;
                    array[i * 3 + 1] = color.g;
                    array[i * 3 + 2] = color.b;
                });
                mesh_per_attribute = 1;
            }

            return new ColorAttributeParameters(array, 3, mesh_per_attribute, false, false);
        }
    }

    get_opacity_attribute_parameters() {
        let default_opacities = this.model.get('default_opacities') || [1.];

        if (default_opacities.length == 0) default_opacities = [1.];

        if (this.model.get('opacity')) {
            const opacity = this.model.get('opacity');

            let array: Float32Array;
            if (opacity.length < this.markers_number) {
                array = to_float_array(this.markers_number);
                array.set(opacity);

                _.each(_.range(this.markers_number - opacity.length), (i) => {
                    i = i + opacity.length;
                    array[i] = default_opacities[i % default_opacities.length];
                });
            }
            else {
                array = to_float_array(opacity);
            }

            return new AttributeParameters(array, 1, 1);
        } else {
            let array: Float32Array;
            let mesh_per_attribute: number;
            if (default_opacities.length == 1) {
                array = to_float_array(default_opacities);
                mesh_per_attribute = this.markers_number;
            } else {
                array = to_float_array(this.markers_number);
                mesh_per_attribute = 1;
                _.each(_.range(this.markers_number), (i) => {
                    array[i] = default_opacities[i % default_opacities.length];
                });
            }

            return new AttributeParameters(array, 1, mesh_per_attribute);
        }
    }

    get_size_attribute_parameters() {
        if (this.model.get('size')) {
            // One size per marker
            const size = this.model.get('size');

            let array: Float32Array;
            if (size.length < this.markers_number) {
                array = to_float_array(this.markers_number);
                array.fill(this.model.get('default_size'));
                array.set(size);
            }
            else {
                array = to_float_array(size);
            }

            return new AttributeParameters(array, 1, 1);
        } else {
            // Same size for all the markers
            return new AttributeParameters(to_float_array([this.model.get('default_size')]), 1, this.markers_number);
        }
    }

    get_rotation_attribute_parameters() {
        if (this.model.get('rotation')) {
            const rotation = this.model.get('rotation');

            let array: Float32Array;
            if (rotation.length < this.markers_number) {
                array = to_float_array(this.markers_number);
                array.set(rotation);
            }
            else {
                array = to_float_array(rotation);
            }

            return new AttributeParameters(array, 1, 1);
        } else {
            return new AttributeParameters(to_float_array(1), 1, this.markers_number);
        }
    }

    get_selected_attribute_parameters() {
        if (this.model.get('selected')) {
            const selected = this.model.get('selected');
            const array = to_float_array(this.markers_number);

            for(let i = 0; i < selected.length; i++) {
                if(selected[i] < array.length) {
                    array[selected[i]] = 1;
                }
            }

            return new SelectionAttributeParameters(array, 1, 1, false, true);
        } else {
            return new SelectionAttributeParameters(to_float_array(1), 1, this.markers_number, false, false);
        }
    }

    update_scene() {
        this.parent.update_gl();
    }

    render_gl() {
        this.set_ranges();
        const fig = this.parent;
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

        this.listenTo(this.model, "change:x", this.update_x);
        this.listenTo(this.model, "change:y", this.update_y);

        this.listenTo(this.model, "change:color change:colors change:unselected_style", this.update_color);
        this.listenTo(this.model, "change:opacity change:default_opacities", this.update_opacity);
        this.listenTo(this.model, "change:size change:default_size", this.update_size);
        this.listenTo(this.model, "change:rotation", this.update_rotation);
        this.listenTo(this.model, "change:selected", this.update_selected);

        this.listenTo(this.model, 'change:marker', this.update_marker);
        this.update_marker();

        this.listenTo(this.model, 'change:stroke', this.update_stroke);
        this.update_stroke();

        this.listenTo(this.model, 'change:stroke_width', this.update_stroke_width);
        this.update_stroke_width();

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
    }

    update_attribute(name: String, value: THREE.InstancedBufferAttribute, new_parameters: AttributeParameters) {
        // Workaround, updating `meshPerAttribute` does not work in ThreeJS and can result in a buffer overflow
        // so we need to re-initialize the attribute. Same for an array size increase.
        if (value.meshPerAttribute != new_parameters.mesh_per_attribute) {
            value = this.initialize_attribute(name, new_parameters);
        }
        else if (value.array.length < new_parameters.array.length) {
            value = this.initialize_attribute(name, new_parameters);
        }
        else {
            value.itemSize = new_parameters.item_size;
            value.setArray(new_parameters.array);
        }

        value.needsUpdate = true;

        return value;
    }

    update_attributes(
            name: String, value: THREE.InstancedBufferAttribute, value_previous: THREE.InstancedBufferAttribute, new_parameters: AttributeParameters,
            animate: Boolean = true, after_animation: Function = () => {}) {
        if (animate) {
            // `value_previous.array` must have at least the same length as `value.array` in order for animation to work
            if (value.array.length < new_parameters.array.length && value.meshPerAttribute == new_parameters.mesh_per_attribute) {
                const array = deepCopy(new_parameters.array);
                // array.fill(default_value);
                array.set(value.array);
                value_previous = this.update_attribute(
                    name + '_previous', value_previous, new AttributeParameters(array, value.itemSize, value.meshPerAttribute, value.normalized));
            }
            // meshPerAttribute changed but not the array size, it is very likely that the number of markers has changed, value_previous must
            // have the right meshPerAttribute
            else if (value.array.length == new_parameters.array.length && value.meshPerAttribute != new_parameters.mesh_per_attribute) {
                value_previous = this.update_attribute(
                    name + '_previous', value_previous, new AttributeParameters(value.array, value.itemSize, new_parameters.mesh_per_attribute, value.normalized));
            }
            else {
                value_previous = this.update_attribute(
                    name + '_previous', value_previous, new AttributeParameters(value.array, value.itemSize, value.meshPerAttribute, value.normalized));
            }

            value = this.update_attribute(name, value, new_parameters);

            this.animate_attribute(name, after_animation);
        } else {
            value_previous = this.update_attribute(name + '_previous', value_previous, new_parameters);
            value = this.update_attribute(name, value, new_parameters);
        }

        return [value, value_previous];
    }

    animate_attribute(name: String, after_animation: Function = () => {}) {
        this.scatter_material.uniforms['animation_time_' + name]['value'] = 0;
        const set = (value) => {
            this.scatter_material.uniforms['animation_time_' + name]['value'] = value;
        }
        this.transition(set, after_animation, this);
    }

    update_x(rerender: Boolean = true) {
        const x_array = to_float_array(this.model.get('x'));

        const new_markers_number = Math.min(x_array.length, this.y.array.length);

        // If the `markers_number` changes
        if (this.markers_number != new_markers_number) {
            this.update_markers_number(new_markers_number);
        }

        [this.x, this.x_previous] = this.update_attributes('x', this.x, this.x_previous, new AttributeParameters(x_array, 1, 1));

        if (rerender) this.update_scene();
    }

    update_y(rerender: Boolean = true) {
        const y_array = to_float_array(this.model.get('y'));

        const new_markers_number = Math.min(this.x.array.length, y_array.length);

        // If the `markers_number` changes
        if (this.markers_number != new_markers_number) {
            this.update_markers_number(new_markers_number);
        }

        [this.y, this.y_previous] = this.update_attributes('y', this.y, this.y_previous, new AttributeParameters(y_array, 1, 1));

        if (rerender) this.update_scene();
    }

    update_markers_number(n: number) {
        const old_markers_number = this.markers_number;

        this.markers_number = n;
        this.instanced_geometry.maxInstancedCount = n;

        // Increasing the number of markers, we need to update buffer sizes in
        // order to prevent buffer overflows. We assume here that
        // `update_markers_number` is called from `update_x` or `update_y` hence they
        // are already correctly sized
        // If the number of markers has decreased, no need to change the buffer sizes
        if (this.markers_number > old_markers_number) {
            this.update_color(false);
            this.update_opacity(false);
            this.update_size(false);
            this.update_rotation(false);
            this.update_selected(false);
        }
    }

    update_color(rerender: Boolean = true) {
        const color_parameters = this.get_color_attribute_parameters();
        this.color = this.update_attribute('color', this.color, color_parameters);
        this.color.normalized = color_parameters.normalized;
        this.scatter_material.defines['USE_COLORMAP'] = color_parameters.use_colormap;

        this.scatter_material.needsUpdate = true;

        if (rerender) this.update_scene();
    }

    update_opacity(rerender: Boolean = true) {
        const opacity_parameters = this.get_opacity_attribute_parameters();
        [this.opacity, this.opacity_previous] = this.update_attributes(
            'opacity', this.opacity, this.opacity_previous, opacity_parameters
        );

        if (rerender) this.update_scene();
    }

    update_size(rerender: Boolean = true) {
        const size_parameters = this.get_size_attribute_parameters();
        [this.size, this.size_previous] = this.update_attributes('size', this.size, this.size_previous, size_parameters);

        if (rerender) this.update_scene();
    }

    update_rotation(rerender: Boolean = true) {
        const rotation_parameters = this.get_rotation_attribute_parameters();
        [this.rotation, this.rotation_previous] = this.update_attributes(
            'rotation', this.rotation, this.rotation_previous, rotation_parameters
        );

        if (rerender) this.update_scene();
    }

    update_selected(rerender: Boolean = true) {
        const selected_parameters = this.get_selected_attribute_parameters();
        this.selected = this.update_attribute('selected', this.selected, selected_parameters);
        this.scatter_material.uniforms['has_selection'].value = selected_parameters.use_selection;

        if (rerender) this.update_scene();
    }

    update_marker() {
        const FAST_CIRCLE = 1;
        const FAST_SQUARE = 2;
        const FAST_ARROW = 3;
        const FAST_CROSS = 4;
        const FAST_TRIANGLE_UP = 5;
        const FAST_TRIANGLE_DOWN = 6;

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
        if(marker === 'triangle-up') {
            this.scatter_material.uniforms.marker_scale.value = 2.;
            this.scatter_material.defines['FAST_DRAW'] = FAST_TRIANGLE_UP;
        }
        if(marker === 'triangle-down') {
            this.scatter_material.uniforms.marker_scale.value = 2.;
            this.scatter_material.defines['FAST_DRAW'] = FAST_TRIANGLE_DOWN;
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
            if(color) {
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
            } else {
                if(this.scales.color.model.min !== null && this.scales.color.model.max !== null) {
                    this.scatter_material.uniforms['domain_color'].value = [this.scales.color.model.min, this.scales.color.model.max];
                } else {
                    console.warn('no color set, and color scale does not have a min or max')
                }

            }
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
            this.listenTo(this.model, 'change:color', this.update_color_map);
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

    compute_view_padding() {
        //This function computes the padding along the x and y directions.
        //The value is in pixels.
        const x_padding = Math.sqrt(this.model.get("default_size")) / 2 + 1.0;

        if(x_padding !== this.x_padding || x_padding !== this.y_padding) {
            this.x_padding = x_padding;
            this.y_padding = x_padding;
            this.trigger("mark_padding_updated");
        }
    }

    draw(animate?) {}
    clear_style(style_dict, indices?, elements?) {}
    set_default_style(indices, elements?) {}
    set_style_on_elements(style, indices, elements?) {}

    transitions: any;
    x_scale: any;
    y_scale: any;
    pixel_x: any;
    pixel_y: any;
    trottled_selector_changed: any;
    invalidated_pixel_position: any;
    camera: any;
    scene: any;
    instanced_geometry: any;
    scatter_material: any;
    mesh: any;

    markers_number: number;

    x: THREE.InstancedBufferAttribute;
    x_previous: THREE.InstancedBufferAttribute;

    y: THREE.InstancedBufferAttribute;
    y_previous: THREE.InstancedBufferAttribute;

    color: THREE.InstancedBufferAttribute;

    size: THREE.InstancedBufferAttribute;
    size_previous: THREE.InstancedBufferAttribute;

    opacity: THREE.InstancedBufferAttribute;
    opacity_previous: THREE.InstancedBufferAttribute;

    rotation: THREE.InstancedBufferAttribute;
    rotation_previous: THREE.InstancedBufferAttribute;

    selected: THREE.InstancedBufferAttribute;

    legend_el: any;
    dot: any;

    model: ScatterGLModel;
};
