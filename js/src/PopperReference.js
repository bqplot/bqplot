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

/* Generated from this typescript code:
class PopperReference {
    constructor(elt) {
        this.elt = elt;
    }
    getBoundingClientRect() {
        return this.elt.getBoundingClientRect();
    }
    get clientWidth() {
        return this.elt.clientWidth;
    }
    get clientHeight() {
        return this.elt.clientHeight;
    }

    elt: HTMLElement;
}
*/

/**
 * A delegate reference for the popper js library
 */
var PopperReference = (function () {
    function PopperReference(elt) {
        this.elt = elt;
    }
    PopperReference.prototype.getBoundingClientRect = function () {
        return this.elt.getBoundingClientRect();
    };
    Object.defineProperty(PopperReference.prototype, "clientWidth", {
        get: function () {
            return this.elt.clientWidth;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PopperReference.prototype, "clientHeight", {
        get: function () {
            return this.elt.clientHeight;
        },
        enumerable: true,
        configurable: true
    });
    return PopperReference;
}());

module.exports = {
    PopperReference: PopperReference
};
