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
class ElementReference {
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
var ElementReference = (function () {
    function ElementReference(elt) {
        this.elt = elt;
    }
    ElementReference.prototype.getBoundingClientRect = function () {
        return this.elt.getBoundingClientRect();
    };
    Object.defineProperty(ElementReference.prototype, "clientWidth", {
        get: function () {
            return this.elt.clientWidth;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementReference.prototype, "clientHeight", {
        get: function () {
            return this.elt.clientHeight;
        },
        enumerable: true,
        configurable: true
    });
    return ElementReference;
}());



/* Generated from the Typescript code:

class PositionReference {
    constructor({ x, y, width, height }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    getBoundingClientRect() {
        let halfwidth = this.width / 2;
        let halfheight = this.height / 2;
        return {
            left: this.x - halfwidth,
            right: this.x + halfwidth,
            top: this.y - halfheight,
            bottom: this.y + halfheight,
            width: this.width,
            height: this.height
        }
    }
    get clientWidth() { return this.width; }
    get clientHeight() { return this.height; }

    x: number;
    y: number;
    width: number;
    height: number;
}
*/

/**
 * A reference for a specific position.
 */
var PositionReference = (function () {
    function PositionReference(_a) {
        var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    PositionReference.prototype.getBoundingClientRect = function () {
        var halfwidth = this.width / 2;
        var halfheight = this.height / 2;
        return {
            left: this.x - halfwidth,
            right: this.x + halfwidth,
            top: this.y - halfheight,
            bottom: this.y + halfheight,
            width: this.width,
            height: this.height
        };
    };
    Object.defineProperty(PositionReference.prototype, "clientWidth", {
        get: function () { return this.width; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PositionReference.prototype, "clientHeight", {
        get: function () { return this.height; },
        enumerable: true,
        configurable: true
    });
    return PositionReference;
}());


module.exports = {
    ElementReference: ElementReference,
    PositionReference: PositionReference
};
