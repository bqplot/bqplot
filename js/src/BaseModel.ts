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

import { WidgetModel } from '@jupyter-widgets/base';
import { semver_range } from './version';

export class BaseModel extends WidgetModel {

    defaults() {
        return {...WidgetModel.prototype.defaults(), 
            _model_name: "BaseModel",
            _model_module: "bqplot",
            _model_module_version: semver_range
        };
    }

    get_date_elem(param) {
        return this.convert_to_date(this.get(param));
    }

    set_date_elem(param, value) {
        this.set(param, this.convert_to_json(value));
    }

    convert_to_date(elem) {
        // Function to convert the string to a date element
        if(elem === undefined || elem === null) {
            return null;
        }
        return new Date(elem);
    }

    convert_to_json(elem) {
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
}
