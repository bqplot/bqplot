#include <fog_pars_fragment>
#include <alphamap_pars_fragment>
varying vec4 fill_color;
varying vec4 stroke_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;
varying vec2 vUv;

uniform sampler2D texture;
#ifdef USE_TEXTURE
uniform sampler2D texture_previous;
uniform float animation_time_texture;
#endif

#define FAST_CIRCLE 1
#define FAST_SQUARE 2

void main(void) {
    #if FAST_DRAW == FAST_CIRCLE
        float r = length(vUv - vec2(0.5))*2.;
        float radius = 0.7;
        float thickness = 0.1;
        float ir = (radius-r)/radius;// inverse, 0 at border, 1 at center
        float overlap = 0.1;
        float alpha_fill   = smoothstep(thickness-overlap, thickness+overlap, ir);
        float alpha_stroke = smoothstep(0., overlap, ir) - alpha_fill;// * (1. - alpha_fill);
        gl_FragColor =  fill_color * alpha_fill + stroke_color * alpha_stroke;
        gl_FragColor.a = fill_color.a * alpha_fill + stroke_color.a *alpha_stroke;
    #elif FAST_DRAW == FAST_SQUARE
        gl_FragColor.rgb =  fill_color.rgb * fill_color.a;
        gl_FragColor.a = fill_color.a;
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
