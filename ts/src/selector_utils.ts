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

/* This module contains elementary geometric functions to determine whether
 * shapes are contained within selectors.
 */

export { point_in_lasso } from './lasso_test';

export function point_in_rectangle(point, x, y) {
    // Checks whether `point` is within the rectangle of coordinates
    // (x0, y0) (x1, y0) (x1, y1) (x0, y1)
    // If one of x or y is undefined, treat them as [-inf, inf]

    if (x.length == 0 && y.length == 0) { return false; }

    let is_inside = true;

    if (x.length != 0) {
        is_inside = is_inside && x[0] <= point[0] && point[0] <= x[1];
    }
    if (y.length != 0) {
        is_inside = is_inside && y[0] <= point[1] && point[1] <= y[1];
    }
    return is_inside;
}

export function rect_inter_rect(x0, y0, x1, y1) {
    // Checks whether two rectangles intersect
    return seg_inter_seg(x0, x1) && seg_inter_seg(y0, y1);
}

export function lasso_inter_rect(x, y, vertices) {
    // checks whether the lasso intersects the rectangle of coordinates
    // (x0, y0) (x1, y0) (x1, y1) (x0, y1)

    for (let i = 0; i < vertices.length; i++) {
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
