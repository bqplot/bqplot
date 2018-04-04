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

// checks if a point is in lasso
function point_in_lasso(point, vertices) {
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

function point_in_rectangle(point, x, y) {
    // checks whether `point` is within the rectangle of coordinates
    // (x0, y0) (x1, y0) (x1, y1) (x0, y1)
    // If one of x or y is undefined, treat them as [-inf, inf]
    
    if (x.length == 0 && y.length == 0) { return false; }

    var is_inside = true;
    x.sort(function(a, b){return a-b});
    y.sort(function(a, b){return a-b});

    if (x.length != 0) {
        is_inside = is_inside && x[0] <= point[0] && point[0] <= x[1];
    }
    if (y.length != 0) {
        is_inside = is_inside && y[0] <= point[1] && point[1] <= y[1];
    } 
    return is_inside;
}

// checks whether two rectangles intersect
function rect_inter_rect(x0, y0, x1, y1) {
    return seg_inter_seg(x0, x1) && seg_inter_seg(y0, y1);
}

function lasso_inter_rect(x, y, vertices) {
    // checks whether the lasso intersects the rectangle of coordinates
    // (x0, y0) (x1, y0) (x1, y1) (x0, y1)

    for (var i = 0; i < vertices.length; i++) {
        if (point_in_rectangle(vertices[i], x, y)) { return true; }
    }
    return false;
}

function seg_inter_seg(p, q) {
    // Checks whether the 1d segments [p0, p1] and [q0, q1] intersect
    // If one of the segments is empty, treat it as [-inf, inf]
    if (p.length == 0 || q.length == 0) {
        return (p.length != 0 || q.length != 0);
    }
    p.sort(function(a, b){return a-b});
    q.sort(function(a, b){return a-b});
    return ((p[0] < q[0] != p[0] < q[1]) || (p[1] < q[0] != p[1] < q[1]) ||
            (q[0] < p[0] != q[0] < p[1]) || (q[1] < p[0] != q[1] < p[1]));
}

module.exports = {
    point_in_lasso: point_in_lasso,
    point_in_rectangle: point_in_rectangle,
    rect_inter_rect: rect_inter_rect,
    lasso_inter_rect: lasso_inter_rect,
}
