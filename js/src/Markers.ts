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
// var d3 =Object.assign({}, require("d3-collection"));

const pi = Math.PI,
    radian = pi / 180,
    sqrt3 = Math.sqrt(3),
    tan30 = Math.tan(pi / 6);

const circleSymbol = function(size) {
    const r = Math.sqrt(size / pi);
    return "M0," + r +
        "A" + r + "," + r + " 0 1,1 0," + (-r) +
        "A" + r + "," + r + " 0 1,1 0," + r +
        "Z";
};

const bqSymbolTypes = d3.map({
    "circle": circleSymbol,
    "cross": function(size,e) {
        const r = Math.sqrt(size / 5) / 2;
        return "M" + -3 * r + "," + -r +
            "H" + -r +
            "V" + -3 * r +
            "H" + r +
            "V" + -r +
            "H" + 3 * r +
            "V" + r +
            "H" + r +
            "V" + 3 * r +
            "H" + -r +
            "V" + r +
            "H" + -3 * r +
            "Z";
    },
    "diamond": function(size, s) {
        const ry = Math.sqrt(size / (2 * tan30)),
            rx = ry * tan30;
        return "M0," + -ry +
            "L" + rx + ",0" +
            " 0," + ry +
            " " + -rx + ",0" +
            "Z";
    },
    "square": function(size, s) {
        const r = Math.sqrt(size) / 2;
        return "M" + -r + "," + -r +
            "L" + r + "," + -r +
            " " + r + "," + r +
            " " + -r + "," + r +
            "Z";
    },
    "triangle-down": function(size, s) {
        const rx = Math.sqrt(size / sqrt3),
            ry = rx * sqrt3 / 2;
        return "M0," + ry +
            "L" + rx +"," + -ry +
            " " + -rx + "," + -ry +
            "Z";
    },
    "triangle-up": function(size, s) {
        const rx = Math.sqrt(size / sqrt3),
            ry = rx * sqrt3 / 2;
        return "M0," + -ry +
            "L" + rx +"," + ry +
            " " + -rx + "," + ry +
            "Z";
    },
    "arrow": function(size, skew) {
        const angle = 60 + (5 - 60) * skew,
            s = Math.tan(angle * radian),
            ry = Math.sqrt(size / s),
            rx = ry * s / 2;
        return "M0," + -ry +
            "L" + rx +"," + ry +
            " " + -rx + "," + ry +
            "Z";
    },
    "ellipse": function(size, skew) {
        const s = Math.pow(10, skew),
            rx = Math.sqrt(size / (pi * s)),
            ry = rx * s;
        return "M0," + ry +
            "A" + rx + "," + ry + " 0 1,1 0," + (-ry) +
            "A" + rx + "," + ry + " 0 1,1 0," + ry +
            "Z";
    },
    "rectangle": function(size, skew) {
        const s = Math.pow(10, skew),
            rx = Math.sqrt(size / s) / 2,
            ry = rx * s;
        return "M" + -rx + "," + -ry +
            "L" + rx + "," + -ry +
            " " + rx + "," + ry +
            " " + -rx + "," + ry +
            "Z";
    },
});

function symbolSize() {
    return 64;
}

function symbolType() {
    return "circle";
}

function symbolSkew() {
    return 0.5;
}

function constant(x) {
    return function() {
        return x;
    }
}

function functor(x) {
    return typeof x === "function" ? x : constant(x);
}

const bqSymbol = function() {
    let type = symbolType;
    let size = symbolSize;
    let skew = symbolSkew;

    function symbol(d,i) {
        return (bqSymbolTypes.get(type.call(this,d,i)) || circleSymbol)
            (size.call(this,d,i), skew.call(this, d, i));
    }

    symbol.type = function(x) {
        if (!arguments.length) return type;
        type = functor(x);
        return symbol;
    };

    // size of symbol in square pixels
    symbol.size = function(x) {
        if (!arguments.length) return size;
        size = functor(x);
        return symbol;
    };

    // skew of symbol, in [0, 1]
    symbol.skew = function(x) {
        if (!arguments.length) return skew;
        skew = functor(x);
        return symbol;
    };

    return symbol;
};

export const types = bqSymbolTypes.keys();
export { bqSymbol as symbol };

