import * as _ from 'underscore';
import * as THREE from 'three';
import isTypedArray from 'is-typedarray';

/* Manages a list of scalar and arrays for use with WebGL instanced rendering
*/

export class GLAttributes {
    constructor (names, names_vec3, getter, sequence_index, names_vec4, defaults) {
        var defaults = _.extend({}, {vx: 0, vy: 1, vz: 0, x: 0, y: 0, z: 0, size:0}, defaults);

        this.length = Infinity;
        this.scalar = {};
        this.scalar_vec3 = {};
        this.scalar_vec4 = {};
        this.array = {};
        this.array_vec3 = {};
        this.array_vec4 = {};
        this.values = {};

        _.each(names, function(name: any) {
            var value = getter(name, sequence_index, defaults[name]);
            if(isTypedArray(value)) {
                if(name != 'selected') // hardcoded.. hmm bad
                this.length = Math.min(this.length, value.length);
                this.array[name] = value;
            } else {
                this.scalar[name] = value;
            }
            this.values[name] = value;
        }, this);

        _.each(names_vec3, function(name: any) {
            var value = getter(name, sequence_index, defaults[name]);
            if(name.indexOf('color') != -1  && typeof value == "string") { // special case to support controlling color from a widget
                var color = new THREE.Color(value);
                value = new Float32Array([color.r, color.g, color.b]); // no sequence, scalar
            }
            if(isTypedArray(value) && value.length > 3) { // single value is interpreted as scalar
                this.array_vec3[name] = value;
                this.length = Math.min(this.length, value.length/3);
            } else {
                this.scalar_vec3[name] = value;
            }
            this.values[name] = value;
        }, this);

        _.each(names_vec4, (name: any) => {
            var value = getter(name, sequence_index, defaults[name]);

            if(name.indexOf('color') !== -1  && typeof value === "string") {
                // special case to support controlling color from a widget
                var color = new THREE.Color(value);
                value = new Float32Array([color.r, color.g, color.b, 1.0]);
            }

            if(isTypedArray(value) && value.length > 4) {
                this.array_vec4[name] = value;
                // color vectors have 4 components
                this.length = Math.min(this.length, value.length / 4);
            } else {
                // single value is interpreted as scalar
                this.scalar_vec4[name] = value;
            }

            this.values[name] = value;
        });
    }

    type_name(name) {
        if(typeof this.scalar[name] != 'undefined') return 'scalar';
        if(typeof this.scalar_vec3[name] != 'undefined') return 'scalar_vec3';
        if(typeof this.array[name] != 'undefined') return 'array';
        if(typeof this.array_vec3[name] != 'undefined') return 'array_vec3';
    }

    deepcopy() {
        let copy = new GLAttributes([], [], () => 1, 0,  [], {});
        copy.scalar      = _.clone(this.scalar);
        copy.scalar_vec3 = _.mapObject(this.scalar_vec3, (array, name) => array.slice());
        copy.array       = _.mapObject(this.array      , (array, name) => array.slice());
        copy.array_vec3  = _.mapObject(this.array_vec3 , (array, name) => array.slice());
        copy.length = this.length;
        return copy;
    }

    contains(name) {
        return Boolean(this.scalar[name] || this.scalar_vec3[name] || this.array[name] || this.array_vec3[name]);
    }

    drop(name) {
        delete this.scalar[name];
        delete this.scalar_vec3[name];
        delete this.array[name];
        delete this.array_vec3[name];
        this.compute_length();
    }

    compute_length() {
        this.length = Infinity;
        _.each(this.array,      (ar: any, name) => this.length = Math.min(this.length, ar.length));
        _.each(this.array_vec3, (ar: any, name) => this.length = Math.min(this.length, ar.length));
    }

    trim(new_length) {
        this.array = _.mapObject(this.array, function(array) {
            return array.length == new_length ? array : array.slice(0, new_length);
        })
        this.array_vec3 = _.mapObject(this.array_vec3, function(array_vec3) {
            return array_vec3.length == new_length*3 ? array_vec3 : array_vec3.slice(0, new_length*3);
        })

        this.array_vec4 = _.mapObject(this.array_vec4, (array_vec4) => {
            return (array_vec4.length === new_length * 4) ? array_vec4 : array_vec4.slice(0, new_length * 4);
        });

        this.length = new_length;
    }

    ensure_array(name) {
        var names = _.isArray(name) ? name : [name];

        _.each(names, function(name) {
            if(typeof this.scalar[name] != 'undefined') {
                var array = this.array[name] = new Float32Array(this.length);

                array.fill(this.scalar[name]);

                delete this.scalar[name];
                delete this.values[name];
            }
            var value_vec3 = this.scalar_vec3[name];
            var value_vec4 = this.scalar_vec4[name];

            if(typeof value_vec3 != 'undefined') {
                var array = this.array_vec3[name] = new Float32Array(this.length*3);

                for(var i = 0; i < this.length; i++) {
                    array[i*3+0] = value_vec3[0];
                    array[i*3+1] = value_vec3[1];
                    array[i*3+2] = value_vec3[2];
                }

                delete this.scalar_vec3[name];
                delete this.values[name];
            }

            if(typeof value_vec4 !== 'undefined') {
                var array = this.array_vec4[name] = new Float32Array(this.length * 4);

                for(var i = 0; i < this.length; i++) {
                    array[i * 4 + 0] = value_vec4[0];
                    array[i * 4 + 1] = value_vec4[1];
                    array[i * 4 + 2] = value_vec4[2];
                    array[i * 4 + 3] = value_vec4[3];
                }

                delete this.scalar_vec4[name];
                delete this.values[name];
            }
        }, this);
    }

    pad(other) {
        this.array = _.mapObject(this.array, (array, name) => {
            var new_array = new array.constructor(other.length);
            if(typeof other.array[name] == "undefined") { // then other must be a scalar
                new_array.fill(other.scalar[name], this.length);
            } else {
                new_array.set(other.array[name].slice(this.length), this.length);
            }
            new_array.set(array);
            return new_array;
        })
        this.array_vec3 = _.mapObject(this.array_vec3, (array_vec3, name) => {
            var new_array = new array_vec3.constructor(other.length*3);
            if(typeof other.array_vec3[name] == "undefined") { // then other must be a scalar
                var other_scalar = other.scalar_vec3[name];
                for(var i = this.length; i < other.length; i++) {
                    new_array[i*3+0] = other_scalar[0];
                    new_array[i*3+1] = other_scalar[1];
                    new_array[i*3+2] = other_scalar[2];
                }
            } else {
                new_array.set(other.array_vec3[name].slice(this.length*3), this.length*3);
            }
            new_array.set(array_vec3);
            return new_array;
        })

        this.array_vec4 = _.mapObject(this.array_vec4, (array_vec4, name) => {
            var new_array = new array_vec4.constructor(other.length * 4);

            if(typeof other.array_vec4[name] === "undefined") {
                // then other must be a scalar
                var other_scalar = other.scalar_vec4[name];

                for(var i = this.length; i < other.length; i++) {
                    new_array[i * 4 + 0] = other_scalar[0];
                    new_array[i * 4 + 1] = other_scalar[1];
                    new_array[i * 4 + 2] = other_scalar[2];
                    new_array[i * 4 + 3] = other_scalar[3];
                }
            } else {
                new_array.set(other.array_vec4[name].slice(this.length * 4), this.length * 4);
            }

            new_array.set(array_vec4);
            return new_array;
        });

        this.length = other.length;
    }

    select(selected) {
        var sizes = this.array['size'] = this.array['size'].slice(); // copy since we will modify
        var size_selected = this.array['size_selected'];
        var color = this.array_vec3['color'] = this.array_vec3['color'].slice(); // copy since we will modify
        var color_selected = this.array_vec3['color_selected'];
        // this assumes, and requires that color_selected is an array, maybe a bit inefficient
        _.each(selected, function(index: any) {
            if(index < this.length) {
                sizes[index] = size_selected[index];
                color[index*3+0] = color_selected[index*3+0];
                color[index*3+1] = color_selected[index*3+1];
                color[index*3+2] = color_selected[index*3+2];
            }
        }, this);
    }

    merge_to_vec3(names, new_name) {
        var element_length = names.length;
        var array = new Float32Array(this.length * element_length); // Float32Array should be replaced by a good common value
        _.each(names, function(name: any, index) {
            this.ensure_array(name);
            var array1d = this.array[name];
            for(var i = 0; i < this.length; i++) {
                array[i*element_length + index] = array1d[i];
            }
            delete this.array[name];
            delete this.values[name];
        }, this)
        this.array_vec3[new_name] = array;
    }

    pop(names) {
        var names: any = _.isArray(name) ? name : [name];
        _.each(names, function(name: any) {
            _.each([this.scalar, this.scalar_vec3, this.array, this.array_vec3], function(storage) {
                if(typeof storage[name] != 'undefined') {
                    delete storage[name];
                }
            })
        }, this);
    }

    add_attributes(geometry, postfix) {
        var convert = (ar) => {
            if(ar.constructor.name == "Float64Array") {
                const N = ar.length;
                var ar32 = new Float32Array(N);
                for(var i = 0; i < N; i++) {
                    ar32[i] = ar[i];
                }
                return ar32;
            }
            return ar;
        }
        var postfix = postfix || '';
        // set all attributes
        _.each(this.array, function(array, name) {
            //if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                array = convert(array);
                var attr = new THREE.InstancedBufferAttribute(array, 1, 1);
                geometry.addAttribute(name+postfix, attr);
            //}
        }, this);
        _.each(this.array_vec3, function(array, name: any) {
            //if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                array = convert(array);
                var attr = new THREE.InstancedBufferAttribute(array, 3, 1);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            //}
        }, this);
        _.each(this.scalar, function(scalar: any, name) {
            //if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(new Float32Array([scalar]), 1, this.length);
                geometry.addAttribute(name+postfix, attr);
            //}
        }, this);
        _.each(this.scalar_vec3, function(scalar_vec3, name: any) {
            //if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(scalar_vec3, 3, this.length);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            //}
        }, this);
    }

    length: any;
    scalar: any;
    scalar_vec3: any;
    scalar_vec4: any;
    array: any;
    array_vec3: any;
    array_vec4: any;
    values: any;
}
