attribute vec4 a_position;
attribute vec4 a_basecolor;
attribute float a_weight;

uniform mat4 u_modelMtx;
uniform mat4 u_viewMtx;
uniform mat4 u_projMtx;

varying vec4 v_basecolor;
varying float v_weight;

void main() {
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    v_basecolor = a_basecolor;
    v_weight = a_weight;
}