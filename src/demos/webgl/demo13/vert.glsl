attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

uniform mat4 u_modelMtx;
uniform mat4 u_projMtx;
uniform mat4 u_viewMtx;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_ndsPosition;

void main() {
    v_ndsPosition = u_projMtx * u_viewMtx * u_modelMtx *  a_position;
    gl_Position = v_ndsPosition;
    v_texcoord = a_texcoord;
    v_normal = normalize(a_normal);
}