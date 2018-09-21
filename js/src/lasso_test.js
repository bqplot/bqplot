/* Based on http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 *
 * This file is licensed under the following license:
 * 
 * Copyright (c) 1970-2003, Wm. Randolph Franklin
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimers.
 * 2. Redistributions in binary form must reproduce the above
 *    copyright notice in the documentation and/or other materials
 *    provided with the distribution.
 * 3. The name of W. Randolph Franklin may not be used to endorse or
 *    promote products derived from this Software without specific prior
 *    written permission.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

function point_in_lasso(point, vertices) {
    // Checks if a point is in lasso
    var xi, xj, yi, yj, intersect,
        x = point[0], y = point[1], is_inside = false;

    for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        xi = vertices[i][0],
        yi = vertices[i][1],
        xj = vertices[j][0],
        yj = vertices[j][1],
        intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) is_inside = !is_inside;
    }
    return is_inside;
}

function points_in_lasso(vertx, verty, x, y) {
    var meanx = 0;
    var meany = 0;
    var N = x.length;
    var Nvert = vertx.length;
    for(var i = 0; i < N; i++) {
        meanx += x[i];
        meany += y[i];
    }
    meanx /= N;
    meany /= N;
    var radius_squared = 0;
    for(var i = 0; i < N; i++) {
        var rx = x[i] - meanx;
        var ry = y[i] - meany;
        radius_squared = Math.max(radius_squared, rx*rx + ry*ry);
    }
    var mask = new Uint8Array(N);
    var indices = new Uint32Array(N);
    var count = 0;
    console.log(meanx, meany, Math.sqrt(radius_squared))
    for(var k = 0; k < N; k++){
        var testx = x[k];
        var testy = y[k];
        var i, j, c = 0;
        mask[k] = 0;
        var distancesq = Math.pow(testx - meanx, 2) + Math.pow(testy - meany, 2);
        if(distancesq < radius_squared)
        {
            for (i = 0, j = Nvert-1; i < Nvert; j = i++) {
                if ( ((verty[i]>testy) != (verty[j]>testy)) &&
                    (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i]) )
                    c = !c;
            }
            mask[k] = c;
            if(c)
                indices[count++] = k;
        }
    }
    indices = indices.slice(0, count);
    return {mask: mask, indices: indices}
}



module.exports = {
    point_in_lasso: point_in_lasso,
    points_in_lasso: points_in_lasso,
}
