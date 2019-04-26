#include <fog_pars_fragment>
#include <alphamap_pars_fragment>

precision highp float;
precision highp int;

varying vec4 fill_color;
varying vec4 stroke_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;
varying vec2 vUv;
varying float pixel_size;

uniform sampler2D texture;
#ifdef USE_TEXTURE
uniform sampler2D texture_previous;
uniform float animation_time_texture;
#endif

uniform bool fill;
uniform float stroke_width;

#define FAST_CIRCLE 1
#define FAST_SQUARE 2
#define FAST_ARROW 3
#define SMOOTH_PIXELS 1.0

vec2 rotate_xy(vec2 x, float angle) {
    float sina = sin(angle);
    float cosa = cos(angle);
    mat2 m = mat2(cosa, -sina, sina, cosa);
    return m * x.xy;
}


void main(void) {
    #if FAST_DRAW == FAST_CIRCLE
        vec2 pixel = (vUv - 0.5) * (pixel_size + 2.0 * stroke_width);
        float r = length(pixel);
        float fill_weight = 1.0 - smoothstep(pixel_size/2.0 - stroke_width - SMOOTH_PIXELS, pixel_size/2.0 - stroke_width + SMOOTH_PIXELS, r);
        float edge_weight = 1.0 - smoothstep(pixel_size/2.0 + stroke_width - SMOOTH_PIXELS, pixel_size/2.0 + stroke_width + SMOOTH_PIXELS, r);
        float stroke_weight = (1.0 - fill_weight) * edge_weight;

        fill_weight *= (fill ? 1.0 : 0.0);

        vec4 color = fill_color * fill_weight + stroke_color * stroke_weight;
        color.a = fill_color.a * fill_weight + stroke_color.a * stroke_weight;

        gl_FragColor = color;
    #elif FAST_DRAW == FAST_SQUARE
        vec2 pixel = (vUv - 0.5) * (pixel_size + 2.0 * stroke_width);
        float stroke_weight_inverse = smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, -(abs(pixel.x) - pixel_size/2.0 + stroke_width/2.0))
                                    * smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, -(abs(pixel.y) - pixel_size/2.0 + stroke_width/2.0));
        float stroke_weight = 1.0 - stroke_weight_inverse;
        float fill_weight =  1.0*     smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, -(abs(pixel.x) - pixel_size/2.0 + stroke_width/2.0))
                                    * smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, -(abs(pixel.y) - pixel_size/2.0 + stroke_width/2.0));
        fill_weight *= (fill ? 1.0 : 0.0);
        vec4 color = fill_color * fill_weight + stroke_color * stroke_weight;
        color.a = fill_color.a * fill_weight + stroke_color.a * stroke_weight;

        gl_FragColor = color;
    #elif FAST_DRAW == FAST_ARROW
        vec2 pixel = (vUv - 0.5) * (pixel_size + 2.0 * stroke_width);

        // take 2 rotated coordinate systems
        float angle = 10. * 3.14 / 180.;
        vec2 pixel_left = (rotate_xy(vUv - vec2(0.5, 1.0), -angle) + vec2(0.0, 0.5)) * (pixel_size + 2.0 * stroke_width);
        vec2 pixel_right = (rotate_xy(vUv - 1.0, angle) + 0.5) * (pixel_size + 2.0 * stroke_width);

        float bottom_width = tan(angle) * pixel_size;
        float edge_weight_bottom = (1.0 - smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, abs(pixel.y + pixel_size/2.0) - stroke_width/2.0))
                                 * (1.0 - smoothstep(bottom_width - SMOOTH_PIXELS, bottom_width + SMOOTH_PIXELS, abs(pixel.x)));
        float edge_weight_left  = (1.0 - smoothstep(- SMOOTH_PIXELS, + SMOOTH_PIXELS, abs(pixel_left.x) - stroke_width/2.0));
        float edge_weight_right = (1.0 - smoothstep(- SMOOTH_PIXELS, + SMOOTH_PIXELS, abs(pixel_right.x) - stroke_width/2.0));

        float fill_weight = smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, pixel.y + pixel_size/2.0 - stroke_width/2.)
                          * smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, pixel_left.x  - stroke_width/2.)
                          * smoothstep(-SMOOTH_PIXELS, SMOOTH_PIXELS, -pixel_right.x - stroke_width/2.);

        float stroke_weight = 1.0 - (1.0 - edge_weight_bottom) * (1.0 - edge_weight_left) * (1.0 - edge_weight_right);

        vec4 color = fill_color * fill_weight + stroke_color * stroke_weight;
        color.a = fill_color.a * fill_weight + stroke_color.a * stroke_weight;
        gl_FragColor = color;
    #else
        vec4 weights = texture2D(texture, vUv);
        // we use weights.r for the fill weight, and weights.g for the stroke weights
        // we also use the stroke weight as alpha blending, so we don't add fill and stroke
        // colors together, but blend them
        float alpha = weights.g;
        gl_FragColor   = mix(fill_color   * weights.r, stroke_color, alpha);
        gl_FragColor.a = mix(fill_color.a * weights.r, stroke_color.a, alpha);
    #endif
#ifdef ALPHATEST
 if ( gl_FragColor.a < ALPHATEST ) discard;
#endif
}
