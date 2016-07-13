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

define(["jupyter-js-widgets", "underscore"], function(widgets, _) {
    "use strict";

    var BaseModel = widgets.WidgetModel.extend({

        defaults: _.extend({}, widgets.WidgetModel.prototype.defaults, {
            _model_name: "BaseModel",
            _model_module: "bqplot",
        }),

       b64decode: function(base64) {
            // lightly adapted from Niklas

            /*
             * base64-arraybuffer
             * https://github.com/niklasvh/base64-arraybuffer
             *
             * Copyright (c) 2012 Niklas von Hertzen
             * Licensed under the MIT license.
             */
            var chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var bufferLength = base64.length * 0.75,
                len = base64.length,
                i, p = 0,
                encoded1, encoded2, encoded3, encoded4;

            if (base64[base64.length - 1] === "=") {
                bufferLength--;
                if (base64[base64.length - 2] === "=") {
                    bufferLength--;
                }
            }

            var arraybuffer = new ArrayBuffer(bufferLength),
                bytes = new Uint8Array(arraybuffer);

            for (i = 0; i < len; i += 4) {
                encoded1 = chars.indexOf(base64[i]);
                encoded2 = chars.indexOf(base64[i + 1]);
                encoded3 = chars.indexOf(base64[i + 2]);
                encoded4 = chars.indexOf(base64[i + 3]);

                bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
                bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
                bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
            }

            return arraybuffer;
        },

        get_typed_field: function(param) {
            // Function that reads in an array of a field that is typed. It
            // performs tpe conversions that you may require and returns you
            // the appropriate array.
            var value = this.get(param);
            var return_value = [];
            var that = this;
            if(value.hasOwnProperty("type") &&
               value.hasOwnProperty("values") &&
               value.values !== null) {
                if(value.type === "date") {
                    return_value = this.get(param).values;
                    if(return_value[0] instanceof Array) {
                       return_value = return_value.map(function(val) {
                           return val.map(function(elem) {
                               return that.convert_to_date(elem);
                           });
                       });
                    } else {
                        return_value = return_value.map(function(val) {
                            return that.convert_to_date(val);
                        });
                    }
                } else if (value.type === "float" || value.type === "float64") {
                    return_value = new Float64Array(this.b64decode(value.data), 0, value.size);
                } else {
                    return_value = this.get(param).values;
                }
            }
            return return_value;
        },

        set_typed_field: function(param, value, options) {
            // function takes a value which has to be set for a typed field and
            // performs the conversion needed before sending it across to
            // Python. This **only** sets the attribute. The caller is
            // responsible for calling save_changes
            var saved_value = value;
            var is_date = false;
            var return_object = {};
            var that = this;

            if(saved_value[0] instanceof Array) {
                is_date = saved_value[0][0] instanceof Date;
                if(is_date)
                    saved_value = saved_value.map(function(val) {
                        return val.map(function(elem) {
                            return that.convert_to_json(elem);
                        });
                    });
            } else {
                is_date = saved_value[0] instanceof Date;
                if(is_date)
                    saved_value = saved_value.map(function(elem) {
                        return that.convert_to_json(elem);
                    });
            }
            //TODO: this is not good. Need to think of something better
            return_object.type = (is_date) ? "date" : "object";
            return_object.values = saved_value;
            this.set(param, return_object, options);
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
            }
            return (elem.toJSON === undefined) ? elem : elem.toJSON();
        },
    });

    return {
        BaseModel: BaseModel,
    };

});
