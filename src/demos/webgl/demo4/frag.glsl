precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_image; // 默认使用纹理单元0

void main() {
    gl_FragColor = texture2D(u_image, v_texcoord);
}