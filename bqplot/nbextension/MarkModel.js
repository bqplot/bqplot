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

define(["widgets/js/widget", "./d3"], function(Widget, d3) {
    "use strict";

    var BaseModel = Widget.WidgetModel.extend({
        get_typed_field: function(param) {
            // function that reads in an array of a field that is typed. It
            // performs tpe conversions that you may require and returns you
            // the appropriate array
            var value = this.get(param);
            var return_value = [];
            var self = this;
            if(value.hasOwnProperty("type") && value.hasOwnProperty("values") && value["values"] !== null) {
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
        set_typed_field: function(param, value) {
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
            this.set(param, return_object);
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

    var MarkModel = BaseModel.extend({
        // These two attributes are the pixel values which should be appended
        // to the area of the plot to make sure that the entire mark is visible
        initialize: function() {
            this.on("change:scales", this.update_scales, this);
            this.once("destroy", this.handle_destroy, this);
            // `this.dirty` is set to `true` before starting computations that
            // might lead the state of the model to be temporarily inconsistent.
            // certain functions of views on that model might check the value
            // of `this.dirty` before rendering
            this.dirty = false;
        },
        update_data : function() {
            // Update_data is typically overloaded in each mark
            // it triggers the "data_updated" event
            this.update_domains();
            this.trigger("data_updated");
        },
        update_domains: function() {
            // update_domains is typically overloaded in each mark to update
            // the domains related to it's scales
        },
        update_scales: function() {
            this.unregister_all_scales(this.previous("scales"));
            this.trigger("scales_updated");
            this.update_domains();
        },
        unregister_all_scales: function(scales) {
            // disassociates the mark with the scale
            for (var key in scales) {
                scales[key].del_domain([], this.id);
            }
            //TODO: Check if the views are being removed
        },
        handle_destroy: function() {
            this.unregister_all_scales(this.get("scales"));
        },
    });

    return {
        BaseModel: BaseModel,
        MarkModel: MarkModel,
    };
});
