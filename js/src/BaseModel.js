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

var widgets = require("@jupyter-widgets/base");
var _ = require("underscore");
var semver_range = "^" + require("../package.json").version;
var serialize = require('./serialize.js')

var BaseModel = widgets.WidgetModel.extend({

    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name: "BaseModel",
            _model_module: "bqplot",
            _model_module_version: semver_range
        });
    },

    get_typed_field: function(param) {
        // Function that reads in an array of a field that is typed. It
        // performs tpe conversions that you may require and returns you
        // the appropriate array.
        var value = this.get(param);
        if(!value) {
            return [];
        }
        // we do the deserialization at the fly ftm
        if(value.dtype && value.value) {
            console.error('Missing (de)serializer for attribute ' +param  +' of '+this.attributes._model_name)
            return serialize.array_or_json['deserialize'](value, this.manager)
        }
        return value;
    },

    set_typed_field: function(param, value, options) {
        // function takes a value which has to be set for a typed field and
        // performs the conversion needed before sending it across to
        // Python. This **only** sets the attribute. The caller is
        // responsible for calling save_changes
        var saved_value = value;
        var return_object = {};
        var that = this;
        var current_type = this.get(param) ? this.get(param).type : undefined;

        if (saved_value[0] instanceof Array && saved_value[0][0] instanceof Date ||
            saved_value[0] instanceof Date) {
            current_type = "date";
        }

        // dates are serialized using the timestamp only, some parts of the code
        // use the Data objects, detect that and convert.
        // also, we set the .type property of TypedArray, to keep track of it being a
        // date array
        var convert_to_date = function(x) {
            var ar = new Float64Array(x.map(Number));
            ar.type = 'date'
            return ar;
        }
        if(saved_value[0] instanceof Array) {
            if(current_type === "date")
                saved_value = saved_value.map(convert_to_date);
        } else {
            if(current_type === "date")
                saved_value = convert_to_date(saved_value);
        }
        this.set(param, saved_value, options);
    },

    get_date_elem: function(param) {
        return this.convert_to_date(this.get(param));
    },

    set_date_elem: function(param, value) {
        this.set(param, this.convert_to_json(value));
    },

    convert_to_date: function(elem) {
        // Function to convert the string to a date element
        if(elem === undefined || elem === null) {
            return null;
        }
        return new Date(elem);
    },

    convert_to_json: function(elem) {
        // converts the date to a json compliant format
        if(elem === undefined || elem === null) {
            return null;
        } else {
            if (elem.toJSON === undefined) {
                return elem;
            } else {
                // the format of the string to be sent across is
                // '%Y-%m-%dT%H:%M:%S.%f'
                // by default, toJSON returns '%Y-%m-%dT%H:%M:%S.%uZ'
                // %u is milliseconds. Hence adding 000 to convert it into
                // microseconds.
                return elem.toJSON().slice(0, -1) + '000';
            }
        }
    }
});

module.exports = {
    BaseModel: BaseModel
};
