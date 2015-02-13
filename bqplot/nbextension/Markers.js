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

define(["d3"], function(d3) {

    var pi = Math.PI
    var tan5 = Math.tan(5 * pi / 180);
    var tan30 = Math.tan(30 * pi / 180);
    var tan60 = Math.tan(60 * pi / 180);

    var bqSymbolTypes = d3.map({
        "arrow": function(size, eccentricity) {
            var ecc = tan60 + (tan5 - tan60) * eccentricity
            var ry = Math.sqrt(size / ecc),
                rx = ry * ecc / 2;
            return "M0," + -ry
                + "L" + rx +"," + ry
                + " " + -rx + "," + ry
                + "Z";
        },
        "ellipse": function(size, eccentricity) {
            var ecc = Math.pow(10, eccentricity)
            var rx = Math.sqrt(size / (pi * ecc));
            var ry = rx * ecc;
            return "M0," + ry
                + "A" + rx + "," + ry + " 0 1,1 0," + (-ry)
                + "A" + rx + "," + ry + " 0 1,1 0," + ry
                + "Z";
        },
        "rectangle": function(size, eccentricity) {
            var ecc = Math.pow(10, eccentricity)
            var rx = Math.sqrt(size / ecc) / 2;
            var ry = rx * ecc;
            return "M" + -rx + "," + -ry
                + "L" + rx + "," + -ry
                + " " + rx + "," + ry
                + " " + -rx + "," + ry
            + "Z";
        }
    });

    function symbolSize() {
        return 64;
    }

    function symbolType() {
        return "arrow";
    }

    function symbolEccentricity() {
        return 0.5;
    }


    var bqSymbol = function() {
        var type = symbolType,
            size = symbolSize;
            eccentricity = symbolEccentricity;

        function symbol(d,i) {
            return bqSymbolTypes.get(type.call(this,d,i))
                (size.call(this,d,i), eccentricity.call(this, d, i));
        }

        symbol.type = function(x) {
            if (!arguments.length) return type;
            type = d3.functor(x);
            return symbol;
        };

        // size of symbol in square pixels
        symbol.size = function(x) {
            if (!arguments.length) return size;
            size = d3.functor(x);
            return symbol;
        };

        // eccentricity of symbol, in [0, 1]
        symbol.eccentricity = function(x) {
            if (!arguments.length) return eccentricity;
            eccentricity = d3.functor(x);
            return symbol;
        };

        return symbol;
    };

    return {symbol: bqSymbol, types: bqSymbolTypes.keys()}
});
