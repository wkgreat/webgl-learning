attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelMtx;
uniform mat4 u_projMtx;
uniform mat4 u_viewMtx;

uniform float u_outline_factor;

void main() {
    vec3 pos = a_position.xyz + normalize(a_normal) * u_outline_factor;
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * vec4(pos, 1.0);
}