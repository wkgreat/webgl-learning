precision mediump float;

uniform sampler2D u_texture;
varying vec2 v_texcoord;

void main() {
    float depth = 1.0 - texture2D(u_texture, v_texcoord).r;
    gl_FragColor = vec4(depth, depth, depth, 1.0);
}