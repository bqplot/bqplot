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
var THREE = require('three')

var interpolations = {'nearest': THREE.NearestFilter, 'bilinear': THREE.LinearFilter};

var Image = mark.Mark.extend({

    render: function() {
        var base_render_promise = Image.__super__.render.apply(this);
        window.last_image = this;

        this.image_plane = new THREE.PlaneBufferGeometry( 1.0, 1.0 );
        this.image_material = new THREE.ShaderMaterial( {
                    uniforms: {
                        image: { type: 't', value: null },
                        // the domain of the image pixel data (for intensity only, for rgb this is ignored)
                        // these 3 uniforms map one to one to the colorscale
                        colormap: { type: 't', value: null },
                        color_min: {type: 'f', value: 0.0},
                        color_max: {type: 'f', value: 1.0},
                        // the type of scale (linear/log) for x/y will be substituted in the shader
                        // map from domain
                        domain_x : { type: "2f", value: [0., 1.] },
                        domain_y : { type: "2f", value: [0., 1.] },
                        // to range (typically, pixel coordinates)
                        range_x  : { type: "2f", value: [0., 1.] },
                        range_y  : { type: "2f", value: [0., 1.] },
                        // basically the corners of the image
                        image_domain_x  : { type: "2f", value: [0., 1.] },
                        image_domain_y  : { type: "2f", value: [0., 1.] },
                        // extra opacity value
                        opacity: {type: 'f', value: 1.0}
                    },
                    vertexShader: require('raw-loader!../shaders/image-vertex.glsl'),
                    fragmentShader: require('raw-loader!../shaders/image-fragment.glsl'),
                    transparent: true,
                    alphaTest: 0.01, // don't render almost fully transparant objects
                    blending: THREE.CustomBlending,
                    depthTest: false,
                    depthWrite: false,

                    // pre multiplied colors
                    blendEquation: THREE.AddEquation,
                    blendSrc: THREE.OneFactor,
                    blendDst: THREE.OneMinusSrcAlphaFactor,

                    blendEquationAlpha: THREE.AddEquation,
                    blendSrcAlpha: THREE.OneFactor,
                    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,

                });

        this.image_mesh = new THREE.Mesh(this.image_plane, this.image_material );
        this.camera = new THREE.OrthographicCamera( 1 / - 2, 1 / 2, 1 / 2, 1 / - 2, -10000, 10000 );
        this.camera.position.z = 10;
        this.scene = new THREE.Scene();
        this.scene.add(this.image_mesh)

        return base_render_promise.then(() => {
            this.create_listeners();
            this.update_minmax();
            this.update_colormap();
            this.update_opacity()
            this.update_image();
            this.update_scene();
            this.listenTo(this.parent, "margin_updated", () => {
                this.update_scene();
                this.draw();
            });
        });
    },

    set_positional_scales: function() {
        var x_scale = this.scales.x,
            y_scale = this.scales.y;
        this.listenTo(x_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.update_scene();
             }
        });
        this.listenTo(y_scale, "domain_changed", function() {
            if (!this.model.dirty) {
                this.update_scene();
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
            if(!this.texture)
                return;
            this.texture.magFilter = interpolations[this.model.get('interpolation')];
            this.texture.minFilter = interpolations[this.model.get('interpolation')];
            // it seems both of these need to be set before the filters have effect
            this.texture.needsUpdate = true;
            this.image_material.needsUpdate = true;
            this.update_scene();
        });
        var sync_visible = () => {
            this.image_material.visible = this.model.get('visible')
            this.update_scene()
        }
        this.listenTo(this.model, "change:visible", sync_visible , this);
        sync_visible()
        this.listenTo(this.model, "change:opacity", () => {
            this.update_opacity()
            this.update_scene()
        }, this);
        this.listenTo(this.scales.image.model, "domain_changed", () => {
            this.update_minmax()
            this.update_scene()
        }, this);
        this.listenTo(this.scales.image.model, "colors_changed", () => {
            this.update_colormap()
            this.update_scene()
        }, this);
        this.listenTo(this.scales.image.model, "domain_changed", this.update_image, this);
        this.listenTo(this.model, "change:image", () => {
            this.update_image()
            this.update_scene()
        }, this);
        this.listenTo(this.model, "data_updated", function() {
            //animate on data update
            var animate = true;
            this.update_scene(animate);
        }, this);
    },

    update_minmax: function() {
        var min = this.scales.image.model.get('min');
        var max = this.scales.image.model.get('max');
        if(typeof min !== 'number')
            min = 0;
        if(typeof max !== 'number')
            max = 0;
        this.image_material.uniforms.color_min.value = min;
        this.image_material.uniforms.color_max.value = max;
    },

    update_opacity: function() {
        this.image_material.uniforms.opacity.value = this.model.get('opacity');
    },

    update_colormap: function() {
        // convert the d3 color scale to a texture
        var colors = this.scales.image.model.color_range;
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
        this.colormap_texture = new THREE.DataTexture(colormap_array, N, 1, THREE.RGBFormat, THREE.UnsignedByteType)
        this.colormap_texture.needsUpdate = true;
        this.image_material.uniforms.colormap.value = this.colormap_texture;
    },

    update_image: function(skip_render) {
        var image = this.model.get("image");
        var type = null;
        var data = image.data;
        if(data instanceof Uint8Array) {
            type =  THREE.UnsignedByteType;
        } else if(data instanceof Float64Array) {
            console.warn('Image.data is a Float64Array which WebGL does not support, will convert to a Float32Array (consider sending float32 data for better performance).')
            data = Float32Array.from(data)
            type =  THREE.FloatType;
        } else if(data instanceof Float32Array) {
            type =  THREE.FloatType;
        } else {
            console.error('only types uint8 and float32 are supported')
            return;
        }
        if(this.scales.image.model.get('scheme') && image.shape.length == 2) {
            if(this.texture)
                this.texture.dispose()
            this.texture = new THREE.DataTexture(data, image.shape[1], image.shape[0], THREE.LuminanceFormat, type)
            this.texture.needsUpdate = true
            this.image_material.uniforms.image.value = this.texture
            this.image_material.defines['USE_COLORMAP'] = true;
            this.image_material.needsUpdate = true;
        } else if(image.shape.length == 3) {
            this.image_material.defines['USE_COLORMAP'] = false;
            if(this.texture)
                this.texture.dispose()
            if(image.shape[2] == 3)
                this.texture = new THREE.DataTexture(data, image.shape[1], image.shape[0], THREE.RGBFormat, type)
            if(image.shape[2] == 4)
                this.texture = new THREE.DataTexture(data, image.shape[1], image.shape[0], THREE.RGBAFormat, type)
            this.texture.needsUpdate = true
            this.image_material.uniforms.image.value = this.texture
        } else {
            console.error('image data not understood')
        }
        this.texture.magFilter = interpolations[this.model.get('interpolation')];
        this.texture.minFilter = interpolations[this.model.get('interpolation')];
    },

    update_scene(animate) {
        this.parent.update_gl()
    },

    render_gl: function() {
        var fig = this.parent;
        var renderer = fig.renderer;
        var image = this.model.get("image");

        var x_scale = this.scales.x ? this.scales.x : this.parent.scale_x;
        var y_scale = this.scales.y ? this.scales.y : this.parent.scale_y;

        // set the camera such that we work in pixel coordinates
        this.camera.left  = 0;
        this.camera.right = fig.plotarea_width;
        this.camera.bottom = 0
        this.camera.top = fig.plotarea_height
        this.camera.updateProjectionMatrix()

        var x = this.model.get('x');
        var y = this.model.get('y')
        var x0 = x[0], x1 = x[1];
        var y0 = y[0], y1 = y[1];
        var x0_pixel = x_scale.scale(x0), x1_pixel = x_scale.scale(x1);
        var y0_pixel = y_scale.scale(y0), y1_pixel = y_scale.scale(y1);

        var pixel_width  = x1_pixel - x0_pixel;
        var pixel_height = y1_pixel - y0_pixel;
        this.image_mesh.position.set(x0_pixel + pixel_width/2, fig.plotarea_height - (y0_pixel + pixel_height/2), 0);
        this.image_mesh.scale.set(pixel_width, pixel_height, 1);

        this.image_material.uniforms['range_x'].value = x_scale.scale.range();
        // upside down in opengl
        this.image_material.uniforms['range_y'].value = [y_scale.scale.range()[1], y_scale.scale.range()[0]];
        this.image_material.uniforms['domain_x'].value = x_scale.scale.domain();
        this.image_material.uniforms['domain_y'].value = y_scale.scale.domain();

        this.image_material.uniforms['image_domain_x'].value = [x0, x1];
        this.image_material.uniforms['image_domain_y'].value = [y0, y1];

        renderer.render(this.scene, this.camera);
        var canvas = renderer.domElement;
    },

    relayout: function() {
        this.update_scene();
    },

    draw: function(animate) {
        this.set_ranges();

    },
});

module.exports = {
    Image: Image
};
