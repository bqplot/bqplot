varying vec2 pixel_coordinate;

void main(void) {
    vec4 view_position = modelViewMatrix * vec4(position,1.0);
    pixel_coordinate = view_position.xy;
    gl_Position = projectionMatrix * view_position;
}
