
import * as _ from 'underscore';
import isTypedArray from 'is-typedarray';

const typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
}

const arrayToTypes = {
    Int8Array: 'int8',
    Int16Array: 'int16',
    Int32Array: 'int32',
    Uint8Array: 'uint8',
    Uint16Array: 'uint16',
    Uint32Array: 'uint32',
    Float32Array: 'float32',
    Float64Array: 'float64'
}


function deserialize_typed_array(data) {
    const type = typesToArray[data.dtype];

    if(data == null || !data.value || !data.value.buffer) {
        throw new Error('Failed to deserialize data');
    }

    const ar = new type(data.value.buffer);
    ar.type = data.type;
    if(data.shape && data.shape.length >= 2) {
        if(data.shape.length > 2)
            throw new Error("only arrays with rank 1 or 2 supported")
        const arrays = []
        // slice the 1d typed arrays in multiple arrays and put them in a
        // regular array
        for(let i=0; i < data.shape[0]; i++) {
            arrays.push(ar.slice(i*data.shape[1], (i+1)*data.shape[1]));
        }
        return arrays;
    } else {
        return ar;
    }
}

function serialize_typed_array(ar) {
    if(ar == null) {
        console.log('data is null');
    }
    if(!ar.buffer) {
        console.log('ar.buffer is null or not defined');
    }
    const dtype = arrayToTypes[ar.constructor.name];
    const type = ar.type || null;
    const wire = {dtype: dtype, value: new DataView(ar.buffer), shape: [ar.length], type: type};
    return wire;
}

function deserialize_array_or_json(data, manager) {
    if (!_.isArray(data) && !_.isObject(data)) {
        return data;
    }

    if (_.isArray(data)) {
        return _.map(data, (subdata) => {
            return deserialize_array_or_json(subdata, manager);
        });
    }

    if(data.value && data.dtype) {
        return deserialize_typed_array(data);
    }

    throw new Error('Failed to deserialize data');
}

function serialize_array_or_json(data, manager) {
    if(!_.isArray(data) && !_.isObject(data)) {
        return data;
    }

    if(_.isArray(data)) {
        return _.map(data, serialize_array_or_json);
    }

    if(isTypedArray(data)) {
        return serialize_typed_array(data);
    }

    throw new Error('Failed to serialize data');
}

export const array_or_json = { deserialize: deserialize_array_or_json, serialize: serialize_array_or_json };
