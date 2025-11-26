precision mediump float;

uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform int u_texture;

varying vec2 v_texcoord;

void main() {
    if(u_texture==0) {
        gl_FragColor = texture2D(u_texture0, v_texcoord);
    } else if(u_texture==1) {
        gl_FragColor = texture2D(u_texture1, v_texcoord);
    }
}