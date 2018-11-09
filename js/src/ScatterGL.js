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
var mark = require("./Mark");
var markers = require("./Markers");
var d3 = require("d3");
var THREE = require('three')
var _ = require("underscore");
var GLAttributes = require('./glattributes').GLAttributes;

var bqSymbol = markers.symbol;

var color_to_array_rgba = function(color, default_color) {
    var color_name = color || default_color
    if(color_name == 'none') {
        return [0., 0., 0., 0.]
    } else {
        var color = new THREE.Color(color_name);
        return [color.r, color.g, color.b, 1.0]
    }
}

var color_to_array = function(color, default_color) {
    var color = new THREE.Color(color || default_color);
    return [color.r, color.g, color.b]
}

var create_colormap =  function(scale) {
    // convert the d3 color scale to a texture
    var colors = scale ? scale.model.color_range : ['#ff0000', '#ff0000'];
    var color_scale = d3.scale.linear()
                              .range(colors)
                              .domain(_.range(colors.length).map((i) => i/(colors.length-1)))
    var colormap_array = [];
    var N = 256;
    var colormap = _.map(_.range(N), (i) => {
        var index = i/(N-1);
        var rgb = color_scale(index);
        rgb = [parseInt("0x" + rgb.substring(1, 3)),
               parseInt("0x" + rgb.substring(3, 5)),
               parseInt("0x" + rgb.substring(5, 7))]
        colormap_array.push(rgb[0], rgb[1], rgb[2])
    })
    colormap_array = new Uint8Array(colormap_array);
    colormap_texture = new THREE.DataTexture(colormap_array, N, 1, THREE.RGBFormat, THREE.UnsignedByteType)
    colormap_texture.needsUpdate = true;
    return colormap_texture
}



var ScatterGL = mark.Mark.extend({

    render: function() {
        var base_render_promise = ScatterGL.__super__.render.apply(this);

        this.previous_values = {}
        this.attributes_changed = {}
        this.transitions = []
        this.invalidated_pixel_position = true;;
        this._update_requested = false;
        window.last_scatter_gl = this;

        var el = this.d3el || this.el;

        // only used for the legend
        this.dot = bqSymbol()
          .type(this.model.get("marker"))


        this.im = el.append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 200)
            .attr("height", 200)
            .attr("preserveAspectRatio", "none");

        this.scatter_material = new THREE.ShaderMaterial({
            uniforms: {
                offset: { type: '3f', value: [0, 0, 0] },
                scale : { type: '3f', value: [1, 1, 1] },
                domain_x : { type: "2f", value: [0., 10.] },
                domain_y : { type: "2f", value: [-12., 12.] },
                domain_z : { type: "2f", value: [0., 1.] },
                domain_size : { type: "2f", value: [0., 1.] },
                domain_color : { type: "2f", value: [0., 1.] },
                domain_rotation  : { type: "2f", value: [0., 180] },
                domain_opacity   : { type: "2f", value: [0., 1.] },
                range_x  : { type: "2f", value: [0., 1.] },
                range_y  : { type: "2f", value: [0., 1.] },
                range_z  : { type: "2f", value: [0., 1.] },
                range_size  : { type: "2f", value: [0., 1.] },
                range_rotation  : { type: "2f", value: [0., Math.PI] },
                range_opacity  : { type: "2f", value: [0., 1.] },
                animation_time_x : { type: "f", value: 1. },
                animation_time_y : { type: "f", value: 1. },
                animation_time_z : { type: "f", value: 1. },
                animation_time_vx : { type: "f", value: 1. },
                animation_time_vy : { type: "f", value: 1. },
                animation_time_vz : { type: "f", value: 1. },
                animation_time_size : { type: "f", value: 1. },
                animation_time_color : { type: "f", value: 1. },
                animation_time_rotation : { type: "f", value: 1. },
                animation_time_opacity : { type: "f", value: 1. },

                has_selection : {type: "b", value: false},
                has_hover     : {type: "b", value: false},

                has_selected_fill    : {type: "b", value: false},
                has_selected_stroke    : {type: "b", value: false},
                has_selected_opacity    : {type: "b", value: false},
                has_unselected_fill  : {type: "b", value: false},
                has_unselected_stroke  : {type: "b", value: false},
                has_unselected_opacity  : {type: "b", value: false},

                has_hovered_fill     : {type: "b", value: false},
                has_hovered_stroke     : {type: "b", value: false},
                has_hovered_opacity     : {type: "b", value: false},
                has_unhovered_fill   : {type: "b", value: false},
                has_unhovered_stroke   : {type: "b", value: false},
                has_unhovered_opacity   : {type: "b", value: false},

                selected_fill      : { type: "4f", value: [1., 0., 0., 1.0] },
                selected_stroke    : { type: "4f", value: [1., 0., 0., 1.0] },
                selected_opacity   : {value: 1.0},
                unselected_fill    : { type: "4f", value: [1., 0., 0., 1.0] },
                unselected_stroke  : { type: "4f", value: [1., 0., 0., 1.0] },
                unselected_opacity : {value: 1.0},
                hovered_fill       : { type: "4f", value: [0., 1., 0., 1.0] },
                hovered_opacity    : {value: 1.0},
                hovered_stroke    : { type: "4f", value: [0., 1., 0., 1.0] },
                unhovered_fill  : { type: "4f", value: [0., 1., 0., 1.0] },
                unhovered_stroke  : { type: "4f", value: [0., 1., 0., 1.0] },
                unhovered_opacity    : {value: 1.0},

                stroke_color_default: {type: "4f", value: [0, 0, 0, 0]},

                colormap: { type: 't', value: null },
                texture: { type: 't', value: null },
                fill: {type: 'b', value: true },
                stroke_width: {type: 'f', value: 1.5 },
                marker_scale: {type: 'f', value: 1.0 }
            },
            vertexShader: require('raw-loader!../shaders/scatter-vertex.glsl'),
            fragmentShader: require('raw-loader!../shaders/scatter-fragment.glsl'),
            // side: THREE.Both,
            alphaTest: 0.01, // don't render almost fully transparant objects
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

        this.geo_circle_2d = new THREE.CircleGeometry(0.5, 32, Math.PI/2);
        this.marker_plane = new THREE.PlaneGeometry();
        // this.geo_triangle_2d = new THREE.CircleGeometry(1, 3, Math.PI/2);


        this.canvas_markers = {}
        this.canvas_textures = {}

        var width = height = 64;

        var canvas_marker;
        canvas_marker = this.canvas_markers.circle = document.createElement('canvas');
        canvas_marker.width  = width;
        canvas_marker.height = height;

        var ctx = canvas_marker.getContext('2d');
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)';
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';

        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        var dx = width/4;
        var dy = height/4;
        var r = Math.sqrt(dx*dx + dy*dy)
        ctx.arc(width/2, height/2, r, 0, 2*Math.PI);
        ctx.fill()
        ctx.stroke()


        canvas_marker = this.canvas_markers.arrow = document.createElement('canvas');
        canvas_marker.width  = width;
        canvas_marker.height = height;

        var ctx = canvas_marker.getContext('2d');
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)';
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';

        ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2, height);

        ctx.moveTo(width/2-width/4, height/4);
        ctx.lineTo(width/2, 0);
        ctx.lineTo(width/2+width/4, height/4);

        ctx.fill()
        ctx.stroke()


        canvas_marker = this.canvas_markers.square = document.createElement('canvas');
        canvas_marker.width  = width;
        canvas_marker.height = height;

        // 
        var ctx = canvas_marker.getContext('2d');
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(0, 255, 0, 1.0)';
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';

        ctx.moveTo(0, 0);
        ctx.rect(0, 0, width, height);
        ctx.fill()
        ctx.stroke()


        this.canvas_textures.circle = new THREE.CanvasTexture(this.canvas_markers.circle)
        this.canvas_textures.arrow = new THREE.CanvasTexture(this.canvas_markers.arrow)
        this.canvas_textures.square = new THREE.CanvasTexture(this.canvas_markers.square)
        // canvas is always pre-multipled https://github.com/mrdoob/three.js/issues/1864
        this.canvas_textures.circle.premultiplyAlpha = true;
        this.canvas_textures.arrow.premultiplyAlpha = true;
        this.canvas_textures.square.premultiplyAlpha = true;

        var marker_geometry = this.marker_plane;
        this.buffer_marker_geometry = new THREE.BufferGeometry().fromGeometry(marker_geometry);
        this.marker_scale = 1;
        var sync_marker = () => {
            this.dot.type(this.model.get("marker"))
            this.scatter_material.uniforms['texture'].value = this.canvas_textures[this.model.get('marker')]
            this.scatter_material.defines['FAST_DRAW'] = 0;
            var marker = this.model.get('marker');
            var scale = 1;
            var FAST_CIRCLE = 1;
            var FAST_SQUARE = 2;
            var FAST_ARROW = 3;
            if(marker === 'circle') {
                // same as in ./Markers.js
                scale = 1/Math.sqrt(Math.PI);
                this.scatter_material.defines['FAST_DRAW'] = FAST_CIRCLE;
            }
            if(marker === 'square') {
                scale = 1/2.;
                this.scatter_material.defines['FAST_DRAW'] = FAST_SQUARE;
            }
            if(marker === 'arrow') {
                scale = 2;
                this.scatter_material.defines['FAST_DRAW'] = FAST_ARROW;
            }
            this.marker_scale = scale;
            this.scatter_material.needsUpdate = true;
            if(this.mesh) // otherwise someone will call it later on
                this.update_geometry()
        }
        sync_marker()
        this.listenTo(this.model, 'change:marker', sync_marker)

        // marker_plane.scale(scale, scale, scale)


        return base_render_promise.then(() => {


            this.camera = new THREE.OrthographicCamera( 1 / - 2, 1 / 2, 1 / 2, 1 / - 2, -10000, 10000 );
            this.camera.position.z = 10;
            this.scene = new THREE.Scene();

            // helper objects to keep track of a set of attributes
            this.attributes = new GLAttributes([], [], () => 1, 0, [], {})
            this.attributes_previous = new GLAttributes([], [], () => 1, 0, [], {})
            // these contain the modified/padded/truncated attributes
            this.attributes_active = null;
            this.attributes_active_previous = null;
            this.push_array('x')
            this.push_array('y')
            this.push_array('rotation')
            this.push_opacity()
            this.push_color()
            this.push_size()
            this.push_selected()
            this.update_geometry()
            this.scene.add(this.mesh)


            this.create_listeners();
            this.update_scene();
            this.listenTo(this.parent, "margin_updated", () => {
                this.update_scene();
            });
        });
        return base_render_promise;
    },

    push_size: function() {
        // size can be an array, or a scalar (default_size)
        let name = 'size';
        let ar = this.model.get('size');
        // first time, so make the previous value the same
        if(!this.attributes.contains('size')) {
            if(ar)
                this.attributes_previous.array['size'] = this.attributes.array['size'] = ar;
            else
                this.attributes_previous.scalar['size'] = this.attributes.scalar['size'] = this.model.get('default_size');
        } else {
            let type_name = ar ? 'array' : 'scalar' ;
            let type_prev = typeof this.attributes.array['size'] != 'undefined' ? 'array' : 'scalar' ;
            delete this.attributes_previous.scalar['size']
            delete this.attributes_previous.array['size']

            this.attributes_previous[type_prev]['size'] = this.attributes[type_prev]['size']
            delete this.attributes[type_prev]['size']
            this.attributes[type_name]['size'] = ar || this.model.get('default_size');
        }
        this.attributes_previous.compute_length()
        this.attributes.compute_length()
        this.push_selected()
    },

    push_color: function() {
        // first time, so make the previous value the same
        let value = this.model.get('color');
        let is_vec3 = false;
        let type_name = 'array';
        if(!value) {
            let color_names = this.model.get('colors');
            if(!color_names)
                color_names = [(this.model.unselected_style || {})['fill'] || 'orange'] ;// TODO: what should the default color be
            if(color_names) {
                is_vec3 = true;
                // this.scatter_material.defines['USE_COLORMAP'] = true;
                let length = color_names.length == 1 ? 1 : this.attributes.length;
                var color_data = new Float32Array(length * 3);
                _.each(_.range(length), (i) => {
                    var color = new THREE.Color(color_names[i % color_names.length]) // TODO: can be done more efficiently
                    color_data[i*3+0] = color.r;
                    color_data[i*3+1] = color.g;
                    color_data[i*3+2] = color.b;
                })
                value = color_data;
                type_name = length == 1 ? 'scalar_vec3' : 'array_vec3';
            }
        }
        // let type_name = is_vec3 ? 'array_vec3' : 'array' ;
        let type_prev = this.attributes.type_name('color');

        if(!this.attributes.contains('color')) {
            this.attributes_previous[type_name]['color'] = this.attributes[type_name]['color'] = value;
            type_prev = type_name;
        } else {
            this.attributes_previous.drop('color')
            this.attributes_previous[type_prev]['color'] = this.attributes[type_prev]['color']
            this.attributes.drop('color')
            this.attributes[type_name]['color'] = value;
        }
        this.attributes_previous.compute_length()
        this.attributes.compute_length()
        // if it's not a vec3 type, we use a colormap
        this.scatter_material.defines['USE_COLORMAP'] = type_name.indexOf('vec3') == -1;
        this.scatter_material.defines['USE_COLORMAP_PREVIOUS'] = type_prev.indexOf('vec3') == -1;
        this.push_selected()
        this.scatter_material.needsUpdate = true;
    },

    push_opacity: function() {
        let value = this.model.get('opacity');
        let type_name = 'array';
        if(!value) {
            let default_opacities = this.model.get('default_opacities');
            if(!default_opacities)
                default_opacities = [1.];
            {
                // this.scatter_material.defines['USE_COLORMAP'] = true;
                if(default_opacities.length == 1) {
                    type_name = 'scalar'
                    value = new Float32Array(default_opacities);
                } else {
                    type_name = 'array'
                    value = new Float32Array(this.attributes.length);
                    // TODO: instead of a loop, we might be able to do this more efficiently using TypedArray.set ?
                    for(var i = 0; i < value.length; i++) {
                        value[i] = default_opacities[i % default_opacities.length]
                    }
                }
            }
        }
        let type_prev = this.attributes.type_name('opacity');

        if(!this.attributes.contains('opacity')) {
            this.attributes_previous[type_name]['opacity'] = this.attributes[type_name]['opacity'] = value;
            // type_prev = type_name;
        } else {
            this.attributes_previous.drop('opacity')
            this.attributes_previous[type_prev]['opacity'] = this.attributes[type_prev]['opacity']
            this.attributes.drop('opacity')
            this.attributes[type_name]['opacity'] = value;
        }
        this.attributes_previous.compute_length()
        this.attributes.compute_length()
        this.push_selected()
        this.scatter_material.needsUpdate = true;
    },

    push_array: function(name) {
        let ar = this.model.get(name);
        if(!ar) return;
        this.attributes_previous.array[name] = this.attributes.array[name] || ar;
        this.attributes.array[name] = ar
        this.attributes_previous.compute_length()
        this.attributes.compute_length()
        this.push_selected()
    },

    push_selected: function() {
        var selected = this.model.get('selected')
        if(this.attributes_active && this.mesh.geometry.attributes.selected) {
            if(selected) {
                this.scatter_material.uniforms['has_selection'].value = true;
                let selected_mask = this.mesh.geometry.attributes.selected.array;
                selected_mask.fill(0)
                for(var i =0; i < selected.length; i++) {
                    if(selected[i] < selected_mask.length)
                        selected_mask[selected[i]] = 1;
                }
                this.mesh.geometry.attributes.selected.needsUpdate = true;
                // this.mesh.geometry.attributes.selected_.needsUpdate = true;
                this.update_scene()
                console.log('fast path')
                // return;
            }

        }
        this.attributes.drop('selected')
        this.attributes_previous.drop('selected')
        // no animation yet, lets shove the max length mask in both
        let length = Math.max(this.attributes.length, this.attributes_previous.length, _.max(selected)+1);
        let selected_mask = new Uint8Array(length)
        if(selected) {
            this.scatter_material.uniforms['has_selection'].value = true;
            for(var i =0; i < selected.length; i++) {
                if(selected[i] < selected_mask.length)
                    selected_mask[selected[i]] = 1;
            }
        } else {
            this.scatter_material.uniforms['has_selection'].value = false;
        }
        this.attributes.array['selected'] = selected_mask;
        this.attributes_previous.array['selected'] = selected_mask;
        this.attributes_previous.compute_length()
        this.attributes.compute_length()
    },

    update_geometry: function(attributes_changed, finalizers) {

        this.instanced_geometry = new THREE.InstancedBufferGeometry();
        var vertices = this.buffer_marker_geometry.attributes.position.clone();
        this.instanced_geometry.addAttribute('position', vertices);
        var scale = this.marker_scale;// + 2 * this.model.get('stroke_width')
        this.scatter_material.uniforms.marker_scale.value = this.marker_scale;

        var uv = this.buffer_marker_geometry.attributes.uv.clone();
        this.instanced_geometry.addAttribute('uv', uv);

        var previous_length = this.attributes_previous.length;
        var current_length = this.attributes.length;

        // TODO: optimize, there are cases where do don't have to copy, but use the originals
        this.attributes_active = this.attributes.deepcopy()
        this.attributes_active_previous = this.attributes_previous.deepcopy()
        this.attributes_active.trim(this.attributes_active.length);
        this.attributes_active_previous.trim(this.attributes_active_previous.length);

        if(this.attributes_active.length != this.attributes_active_previous.length) {
            this.attributes_active.ensure_array('size')
            this.attributes_active_previous.ensure_array('size')
        }
        if(this.attributes_active.length > this.attributes_active_previous.length) { // grow..
            this.attributes_active_previous.pad(this.attributes_active)
            this.attributes_active_previous.array['size'].fill(0, previous_length); // this will make them smoothly fade in
        } else if(this.attributes_active.length < this.attributes_active_previous.length) { // shrink..
            this.attributes_active.pad(this.attributes_active_previous)
            this.attributes_active.array['size'].fill(0, current_length); // this will make them smoothly fade out
        }
        this.attributes_active.add_attributes(this.instanced_geometry)
        this.attributes_active_previous.add_attributes(this.instanced_geometry, '_previous')

        if(!this.mesh) {
            this.mesh = new THREE.Mesh(this.instanced_geometry, this.scatter_material);
        }
        else {
            this.mesh.geometry.dispose()
            this.mesh.geometry = this.instanced_geometry;
        }
        _.each(attributes_changed, (key) => {
            var property = "animation_time_" + key
            //console.log("animating", key)
            var done = () => {
                // _.each(attributes_changed, (prop) => {
                    delete this.previous_values[key] // may happen multiple times, that is ok
                // })
                _.each(finalizers, (finalizer) => {
                    console.log(finalizer)
                    finalizer()
                })
            }
            // uniforms of material_rgb has a reference to these same object
            var set = (value) => {
                this.scatter_material.uniforms[property]['value'] = value
            }
            this.scatter_material.uniforms[property]['value'] = 0
            this.transition(set, done, this)
        })
        this.attributes_changed = {}

        this.update_scene();
    },    

    update_scene() {
        this.parent.update_gl()
    },

    render_gl: function() {
        this.set_ranges()
        this._update_requested = false;
        var fig = this.parent;
        this.im.attr('x', 0)
               .attr('y', 0)
               .attr('width', fig.plotarea_width)
               .attr('height', fig.plotarea_height)
        this.camera.left = 0
        var x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        var y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        var range_x = this.parent.padded_range("x", x_scale.model);
        var range_y = this.parent.padded_range("y", y_scale.model);

        this.scatter_material.uniforms['colormap'].value = create_colormap(this.scales.color)

        _.each(['selected', 'hovered'], (style_type) => {
            _.each(['stroke', 'fill', 'opacity'], (style_property) => {
                this.scatter_material.uniforms[`has_${style_type}_${style_property}`].value   = Boolean(this.model.get(`${style_type}_style`)[style_property])
                this.scatter_material.uniforms[`has_un${style_type}_${style_property}`].value = Boolean(this.model.get(`un${style_type}_style`)[style_property])
                if(_.contains(['opacity'], style_property)) {
                    this.scatter_material.uniforms[`${style_type}_${style_property}`].value   = this.model.get(`${style_type}_style`)[style_property]
                    this.scatter_material.uniforms[`un${style_type}_${style_property}`].value = this.model.get(`un${style_type}_style`)[style_property]
                } else {
                    this.scatter_material.uniforms[`${style_type}_${style_property}`].value   = color_to_array_rgba(this.model.get(`${style_type}_style`)[style_property], 'green')
                    this.scatter_material.uniforms[`un${style_type}_${style_property}`].value = color_to_array_rgba(this.model.get(`un${style_type}_style`)[style_property], 'green')
                }

            })
        })

        this.camera.left  = 0;
        this.camera.right = fig.plotarea_width;
        this.camera.bottom = 0
        this.camera.top = fig.plotarea_height
        this.camera.updateProjectionMatrix()

        this.scatter_material.uniforms['range_x'].value = range_x;
        this.scatter_material.uniforms['range_y'].value = [range_y[1], range_y[0]]; // flipped coordinates in WebGL
        this.scatter_material.uniforms['domain_x'].value = x_scale.scale.domain();
        this.scatter_material.uniforms['domain_y'].value = y_scale.scale.domain();

        if(this.scales.size) {
            this.scatter_material.uniforms['range_size'].value = this.scales.size.scale.range();
            this.scatter_material.uniforms['domain_size'].value = this.scales.size.scale.domain();
        } else {
            var size = this.model.get('default_size');
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

        var renderer = fig.renderer;
        // var image = this.model.get("image");
        renderer.render(this.scene, this.camera);
        // var canvas = renderer.domElement;
        // var url = canvas.toDataURL('image/png');
        // this.im.attr("href", url);

        var transitions_todo = []
        for(var i = 0; i < this.transitions.length; i++) {
            var t = this.transitions[i];
            if(!t.is_done())
                transitions_todo.push(t)
            t.update()
        }
        this.transitions = transitions_todo;
        if(this.transitions.length > 0) {
            this.update_scene()
        }

    },

    create_listeners: function() {
        ScatterGL.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:x", () => {
            this.push_array('x')
            this.update_geometry(['x', 'size'], [() => this.push_array('x')])
        }, this);
        this.listenTo(this.model, "change:y", () => {
            this.push_array('y')
            this.update_geometry(['y', 'size'], [() => this.push_array('y')])
        }, this);
        this.listenTo(this.model, "change:rotation", () => {
            this.push_array('rotation')
            this.update_geometry(['rotation', 'size'], [() => this.push_array('rotation')])
        }, this);
        this.listenTo(this.model, "change:opacity change:default_opacities", () => {
            this.push_opacity()
            this.update_geometry(['opacity'], [() => this.push_opacity()])
        }, this);
        this.listenTo(this.model, "change:color change:colors change:selected_style change:unselected_style change:hovered_style change:unhovered_style", () => {
            this.push_color()
            this.update_geometry(['color'], [() => this.push_color()])
        }, this);
        this.listenTo(this.model, "change:size change:default_size", () => {
            this.push_size()
            this.update_geometry(['size'], [() => this.push_size()])
        }, this);
        this.listenTo(this.model, "change:selected", () => {
            this.push_selected()
            // this.update_geometry([])
        }, this);
        var sync_visible = () => {
            this.mesh.visible = this.model.get('visible')
            this.update_scene()
        }
        this.listenTo(this.model, "change:visible", sync_visible , this);
        sync_visible()

        var sync_fill = () => {
            this.scatter_material.uniforms.fill.value = this.model.get('fill')
            this.update_scene()
        }
        this.listenTo(this.model, "change:fill", sync_fill, this);
        sync_fill()

        var sync_stroke_width = () => {
            this.scatter_material.uniforms.stroke_width.value = this.model.get('stroke_width')
            this.update_geometry()
        }
        this.listenTo(this.model, "change:stroke_width", sync_stroke_width, this);
        sync_stroke_width()

        var sync_stroke = () => {
            if(this.model.get('stroke')) {
                this.scatter_material.uniforms.stroke_color_default.value = color_to_array_rgba(this.model.get('stroke'));
                this.scatter_material.defines['HAS_DEFAULT_STROKE_COLOR'] = true;
            } else {
                this.scatter_material.defines['HAS_DEFAULT_STROKE_COLOR'] = false;
            }
            this.update_scene()
        }
        this.listenTo(this.model, "change:stroke", sync_stroke, this);
        sync_stroke()

        this.listenTo(this.model, "change", this.update_legend, this);

        // many things to implement still
        // this.listenTo(this.model, "change:stroke", this.update_stroke, this);
        // this.listenTo(this.model, "change:stroke_width", this.update_stroke_width, this);
        // this.listenTo(this.model, "change:default_opacities", this.update_default_opacities, this);
        // this.listenTo(this.model, "change:default_skew", this.update_default_skew, this);
        // this.listenTo(this.model, "change:default_rotation", this.update_xy_position, this);
        // this.listenTo(this.model, "change:marker", this.update_marker, this);
        // this.listenTo(this.model, "change:fill", this.update_fill, this);
        // this.listenTo(this.model, "change:display_names", this.update_names, this);
    },

    update_position: function(animate) {
        this.update_scene()
        this.invalidate_pixel_position()
    },

    // we want to compute the pixels coordinates 'lazily', since it's quite expensive for 10^6 points
    invalidate_pixel_position: function() {
        this.invalidated_pixel_position = true;
    },

    ensure_pixel_position: function() {
        if(this.invalidated_pixel_position)
            this.update_pixel_position()
    },

    update_pixel_position: function(animate) {
        var x_scale = this.scales.x, y_scale = this.scales.y;

        var x_data = this.model.get("x")
        var y_data = this.model.get("y")
        var N = Math.min(x_data.length, y_data.length);
        // this.pixel_coords = _.map(_.range(N), (i) => {
        //         return [x_scale.scale(x_data[i]) + x_scale.offset,
        //                 y_scale.scale(y_data[i]) + y_scale.offset];
        //     });
        this.pixel_x = new Float64Array(N);
        this.pixel_y = new Float64Array(N);
        for(var i = 0; i < N; i++) {
            this.pixel_x[i] = x_scale.scale(x_data[i]) + x_scale.offset;
            this.pixel_y[i] = y_scale.scale(y_data[i]) + y_scale.offset;
        }
        this.invalidated_pixel_position = false;
    },

    selector_changed: function(point_selector, rect_selector) {
        if(!this.trottled_selector_changed)
            this.trottled_selector_changed = _.throttle(this._real_selector_changed, 50, {leading: false})
        this.trottled_selector_changed(point_selector, rect_selector)
    },

    _real_selector_changed: function(point_selector, rect_selector) {
        // not sure why selection isn't working yet
        this.ensure_pixel_position()
        if(point_selector === undefined) {
            this.model.set("selected", null);
            this.touch();
            return [];
        }
        var selection_mask = point_selector(this.pixel_x, this.pixel_y)
        var selected = new Uint32Array(selection_mask.length);
        var count = 0;
        var N = selection_mask.length;
        for(var i=0; i < N; i++) {
            if(selection_mask[i]) {
                selected[count++] = i;
            }
        }
        selected = selected.slice(0, count);
        this.model.set("selected", selected);
        this.touch();
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
            if (!this.model.dirty) {
                var animate = true;
                this.update_position(animate); }
        });
        this.listenTo(this.y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                var animate = true;
                this.update_position(animate); }
        });
    },

    initialize_additional_scales: function() {
        var color_scale = this.scales.color,
            size_scale = this.scales.size,
            opacity_scale = this.scales.opacity,
            skew_scale = this.scales.skew,
            rotation_scale = this.scales.rotation;
        // the following handlers are for changes in data that does not
        // impact the position of the elements
        if (color_scale) {
            this.listenTo(color_scale, "domain_changed", () => {
                this.update_scene()
            });
            color_scale.on("color_scale_range_changed", () => {
                this.update_scene()
            });
        }
        if (size_scale) {
            this.listenTo(size_scale, "domain_changed", () => {
                this.update_scene()
            });
        }
        if (opacity_scale) {
            this.listenTo(opacity_scale, "domain_changed", () => {
                this.update_scene()
            });
        }
        if (skew_scale) {
            this.listenTo(skew_scale, "domain_changed", function() {
                var animate = true;
                this.update_default_skew(animate);
            });
        }
        if (rotation_scale) {
            this.listenTo(rotation_scale, "domain_changed", () => {
                this.update_scene()
            });
        }

    },

    set_ranges: function() {
        var x_scale = this.scales.x,
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
    },


    transition: function(f, on_done, context) {
        // this is a copy from ipyvolume, maybe better to use tween, and do the rerendering
        // at the figure level (say if multiple scatter's want to rerender)
        var that = this;
        var Transition = function() {
            //this.objects = []
            this.time_start = (new Date()).getTime();
            this.duration = that.parent.model.get("animation_duration");
            this.cancelled = false;
            this.called_on_done = false
            this.set = function(obj) {
                this.objects.push(obj)
            }
            this.is_done = function() {
                var dt = (new Date()).getTime() - this.time_start;
                return (dt >= this.duration) || this.cancelled
            }
            this.cancel = function() {
                this.cancelled = true;
            },
            this.update = function() {
                if(this.cancelled)
                    return
                var dt = ((new Date()).getTime() - this.time_start)/this.duration;

                var u = Math.min(1, dt);
                f.apply(context, [u]);
                if(dt >= 1 && !this.called_on_done) {
                    this.called_on_done = true
                    on_done.apply(context)
                }
                console.log('u', dt, u)
                that.update_scene()
            }
            if(!this.duration) {
                f.apply(context, [1]);
                on_done.apply(context)
                that.update_scene()
            } else {
                that.transitions.push(this)
            }
        }
        return new Transition()
    },

    draw_legend: function(elem, x_disp, y_disp, inter_x_disp, inter_y_disp) {
        this.legend_el = elem.selectAll(".legend" + this.uuid)
          .data([{}]);
        var colors = this.model.get("colors"),
            len = colors.length
            stroke = this.model.get("stroke");

        var that = this;
        var rect_dim = inter_y_disp * 0.8;
        var el_added = this.legend_el.enter()
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

        var max_length = d3.max(this.model.get("labels"), function(d) {
            return d.length;
        });

        this.legend_el.exit().remove();
        return [1, max_length];
    },

    draw_legend_elements: function(elements_added, rect_dim) {
        var colors = this.model.get("colors"),
            len = colors.length,
            stroke = this.model.get("stroke"),
            fill   = this.model.get("fill");

        elements_added.append("path")
          .attr("transform", function(d, i) {
              return "translate( " + rect_dim / 2 + ", " + rect_dim / 2 + ")";
          })
          .attr("d", this.dot.size(64))
              .style("fill", fill   ? colors[0] : 'none')
              .style("stroke", stroke ? stroke : colors[0])
            ;
    },

    update_legend: function() {
        if (this.legend_el) {
            var colors = this.model.get("colors"),
                len = colors.length,
                stroke = this.model.get("stroke");
                fill   = this.model.get("fill");
            this.legend_el.select("path")
              .style("fill", fill   ? colors[0] : 'none')
              .style("stroke", stroke ? stroke : colors[0])
            ;
            this.legend_el.select("text")
              .style("fill", fill ? colors[0] : "none")
            ;
            if (this.legend_el) {
                this.legend_el.select("path")
                    .attr("d", this.dot.type(this.model.get("marker")));
            }
        }
    },

    relayout: function() {
        this.set_ranges();
        this.update_position();
    },


});

module.exports = {
    ScatterGL: ScatterGL
};
