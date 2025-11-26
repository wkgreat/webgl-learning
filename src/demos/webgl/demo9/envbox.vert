attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelMtx;
uniform mat4 u_viewMtx;
uniform mat4 u_projMtx;

varying vec3 v_normal;
varying vec3 v_worldPos;

void main() {
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    v_normal = mat3(u_modelMtx) * a_normal;
    v_worldPos = (u_modelMtx * a_position).xyz;
}