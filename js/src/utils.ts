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
// var d3 =Object.assign({}, require("d3-array"), require("d3-scale"));
import isTypedArray from 'is-typedarray';
import * as _ from 'underscore';

// the following is a regex to match all valid time formats that can be
// generated with d3 as of 2nd March 2015. If new formats are added to d3
// those new formats need to be added to the regex
const time_format_regex = new RegExp("^(((((\\*)|(/*)|(-*))(\\s*)%([aAbBdeHIjmMLpSUwWyYZ]{1}))+)|((\\s*)%([cxX]{1})))$");

export function deepCopy(obj) {
    // This makes a deep copy of JSON-parsable objects
    // (no cycling or recombining)
    // Backbone model attributes must be JSON parsable. Hence there is
    // no need for a fancier logic, and it is surprisingly efficient.
    if(isTypedArray(obj))
        return obj.slice()
    else if(_.isArray(obj)) {
        return obj.map(x => deepCopy(x))
    } else if(_.isNumber(obj) || _.isString(obj)) {
        return obj;
    } else if(_.isDate(obj)) {
        return new Date(obj.getTime());
    } else {
        const newobj = {}
        for(let key in obj) {
            if(obj.hasOwnProperty(key)) {
                newobj[key] = deepCopy(obj[key])
            }
        }
        return newobj;
    }
}

export function convert_dates(value) {
    // check if the array of value contains Date objects, if so
    // dates are serialized using the timestamp only, some parts of the code
    // use the Data objects, detect that and convert.
    // also, we set the .type property of TypedArray, to keep track of it being a
    // date array
    if(isTypedArray(value))
        return value;
    const convert_to_date = function(x) {
        const ar: any = new Float64Array(x.map(Number));
        ar.type = 'date';
        return ar;
    }
    if(value[0] instanceof Array && value[0][0] instanceof Date)
        value = value.map(convert_to_date);
    else if(value[0] instanceof Date)
        value = convert_to_date(value);
    return value;
}

export function getCustomRange(array) {
    const first = array[0];
    const end = array[array.length - 1];
    let pivot;
    if(array[0] > array[1]) {
        pivot = d3.min(array);
    } else {
        pivot = d3.max(array);
    }
    return [d3.scaleLinear().range([first, pivot]), d3.scaleLinear().range([pivot, end])];
}

export function is_valid_time_format(format) {
    return time_format_regex.test(format);
}

export function is_array(x) {
    return (x instanceof Array) || isTypedArray(x)
}
