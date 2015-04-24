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

define(["widgets/js/widget"], function(Widget) {
    "use strict";

    var BaseModel = Widget.WidgetModel.extend({
        get_typed_field: function(param) {
            // function that reads in an array of a field that is typed. It
            // performs tpe conversions that you may require and returns you
            // the appropriate array
            var value = this.get(param);
            var return_value = [];
            var self = this;
            if(value.hasOwnProperty("type") &&
               value.hasOwnProperty("values") &&
               value["values"] !== null) {
                if(value.type === "date") {
                    return_value = this.get(param)["values"];
                    if(return_value[0] instanceof Array) {
                       return_value = return_value.map(function(val) {
                           return val.map(function(elem) {
                               return self.convert_to_date(elem);
                           });
                       });
                    } else {
                        return_value = return_value.map(function(val) {
                            return self.convert_to_date(val);
                        });
                    }
                } else {
                    return_value = this.get(param)["values"];
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
            var self = this;

            if(saved_value[0] instanceof Array) {
                is_date = saved_value[0][0] instanceof Date;
                if(is_date)
                    saved_value = saved_value.map(function(val) {
                        return val.map(function(elem) {
                            return self.convert_to_json(elem);
                        });
                    });
            } else {
                is_date = saved_value[0] instanceof Date;
                if(is_date)
                    saved_value = saved_value.map(function(elem) {
                        return self.convert_to_json(elem);
                    });
            }
            return_object["type"] = (is_date) ? "date" : "float";
            return_object["values"] = saved_value;
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
