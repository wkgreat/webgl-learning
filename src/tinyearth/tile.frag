precision mediump float;

uniform sampler2D u_image;

varying vec2 v_texcoord;
varying vec3 v_color;

void main() {
    // gl_FragColor = vec4(v_color, 1);
    gl_FragColor = texture2D(u_image, v_texcoord);
}