#include <fog_pars_fragment>
#include <alphamap_pars_fragment>

precision highp float;
precision highp int;

#define FAST_CIRCLE 1
#define FAST_SQUARE 2
#define FAST_ARROW 3
#define FAST_CROSS 4
#define FAST_TRIANGLE_UP 5
#define FAST_TRIANGLE_DOWN 6

// This parameter is used for reducing aliasing
#define SMOOTH_PIXELS 1.0

// ANGLE_X = X * PI / 180.
#define ANGLE_20 0.3490658503988659
#define ANGLE_60 1.0471975511965976

varying vec4 v_fill_color;
varying vec4 v_stroke_color;
varying float v_inner_size;
varying float v_outer_size;
varying vec2 v_pixel;

uniform float stroke_width;


/*
 * Rotate a point in the 2-D plane, given an angle in radians
 */
vec2 rotate_xy(vec2 x, float angle) {
    float sina = sin(angle);
    float cosa = cos(angle);
    mat2 m = mat2(cosa, -sina, sina, cosa);
    return m * x.xy;
}

/*
 * Returns 1.0 if pixel inside of a circle (0.0 otherwise) given the circle radius and the
 * pixel position.
 */
float smooth_circle(in float radius, in vec2 pixel_position) {
    // This function does not use the ellipse function for optimization purpose
    // Circle equation: x^2 + y^2 = radius^2
    float d = dot(pixel_position, pixel_position);
    float r1 = pow(radius - SMOOTH_PIXELS, 2.0);
    float r2 = pow(radius + SMOOTH_PIXELS, 2.0);
    return 1.0 - smoothstep(r1, r2, d);
}

/*
 * Returns 1.0 if pixel inside of an ellipse (0.0 otherwise) given the ellipse radius and the
 * pixel position.
 */
float smooth_ellipse(in float a, in float b, in vec2 pixel_position) {
    // Ellipse equation: b^2 * x^2 + a^2 * y^2 = a^2 * b^2
    float r_x = pow(a, 2.0);
    float r_y = pow(b, 2.0);
    float d = r_y * pow(pixel_position.x, 2.0) + r_x * pow(pixel_position.y, 2.0);
    float r1 = pow(a - SMOOTH_PIXELS, 2.0) * pow(b - SMOOTH_PIXELS, 2.0);
    float r2 = pow(a + SMOOTH_PIXELS, 2.0) * pow(b + SMOOTH_PIXELS, 2.0);
    return 1.0 - smoothstep(r1, r2, d);
}

/*
 * Returns 1.0 if pixel inside of a rectangle (0.0 otherwise) given the rectangle half-size
 * on the x and y axes and the pixel position.
 */
float smooth_rectangle(in vec2 size, in vec2 pixel_position) {
    vec2 rec = smoothstep(vec2(-SMOOTH_PIXELS), vec2(SMOOTH_PIXELS), size - abs(pixel_position));
    return rec.x * rec.y;
}

/*
 * Returns 1.0 if pixel inside of a rectangle (0.0 otherwise) given the rectangle half-size
 * on the x and y axes and the pixel position.
 */
float rectangle(in vec2 size, in vec2 pixel_position) {
    vec2 rec = step(0.0, size - abs(pixel_position));
    return rec.x * rec.y;
}

/*
 * Returns 1.0 if pixel inside of a square (0.0 otherwise) given the square half-size
 * and the pixel position.
 */
float smooth_square(in float size, in vec2 pixel_position) {
    return smooth_rectangle(vec2(size), pixel_position);
}

float smooth_isosceles_triangle(in float angle, in float height, in vec2 pixel_position) {
    float half_angle = angle / 2.0;

    // The triangle center is on vec2(0.0, -height/3.0)
    vec2 translated_pixel = vec2(pixel_position.x, pixel_position.y - height / 3.0);

    vec2 pixel_left = rotate_xy(translated_pixel, -half_angle);
    vec2 pixel_right = rotate_xy(translated_pixel, half_angle);

    float half_height = height * 0.5;

    float half_bottom = half_height * tan(half_angle);

    return smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, half_bottom + pixel_left.x) *
           smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, half_bottom - pixel_right.x) *
           smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, translated_pixel.y + half_height);
}


/*
 * Returns 1.0 if pixel inside of a cross shape (0.0 otherwise) given the cross half-size
 * on the x and y axes and the pixel position.
 */
float cross(in vec2 size, in vec2 pixel_position) {
    float cross_shape = rectangle(size.xy, pixel_position) +
                        rectangle(size.yx, pixel_position);
    return clamp(cross_shape, 0.0, 1.0);
}


void main(void) {
    // fill_weight and stroke_weight are color factors
    // e.g. if fill_weight == 1.0 then the pixel color will be v_fill_color
    // e.g. if stroke_weight == 1.0 then the pixel color will be v_stroke_color
    float fill_weight = 0.0;
    float stroke_weight = 0.0;

    // Note for the reader: In the following code,
    // - `1.0`     -> True
    // - `0.0`     -> False
    // - `1.0 - A` -> NOT A
    // - `A + B`   -> A OR B
    // - `A * B`   -> A AND B

    float inner_shape = 0.0;
    float outer_shape = 0.0;

#if FAST_DRAW == FAST_CIRCLE

    inner_shape = smooth_circle(v_inner_size, v_pixel);
    outer_shape = smooth_circle(v_outer_size, v_pixel);

#elif FAST_DRAW == FAST_SQUARE

    inner_shape = smooth_square(v_inner_size, v_pixel);
    outer_shape = 1.0; // Always in the outer_shape

#elif FAST_DRAW == FAST_CROSS

    float r = v_outer_size / 3.0;

    inner_shape = cross(vec2(v_inner_size, r - 2.0 * stroke_width), v_pixel);
    outer_shape = cross(vec2(r, v_outer_size), v_pixel);

#elif FAST_DRAW == FAST_ARROW

    inner_shape = smooth_isosceles_triangle(ANGLE_20, v_inner_size, v_pixel);
    outer_shape = smooth_isosceles_triangle(ANGLE_20, v_outer_size, v_pixel);

#elif FAST_DRAW == FAST_TRIANGLE_UP

    inner_shape = smooth_isosceles_triangle(ANGLE_60, v_inner_size, v_pixel);
    outer_shape = smooth_isosceles_triangle(ANGLE_60, v_outer_size, v_pixel);

#elif FAST_DRAW == FAST_TRIANGLE_DOWN

    vec2 reversed_pixel = vec2(v_pixel.x, -v_pixel.y);

    inner_shape = smooth_isosceles_triangle(ANGLE_60, v_inner_size, reversed_pixel);
    outer_shape = smooth_isosceles_triangle(ANGLE_60, v_outer_size, reversed_pixel);

#endif

    // `inner_shape` is the shape without the stroke, `outer_shape` is the shape with the stroke
    // note that the stroke is always drawn, only that it has the `v_fill_color` if stroke is None
    fill_weight = inner_shape;
    stroke_weight = (1.0 - inner_shape) * outer_shape;

#if !FILL
    fill_weight = 0.0;
#endif

    gl_FragColor = v_fill_color * fill_weight + v_stroke_color * stroke_weight;
}
