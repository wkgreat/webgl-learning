attribute vec4 a_position;
attribute vec3 a_normal;

uniform highp mat4 u_modelMtx;
uniform highp mat4 u_projMtx;
uniform highp mat4 u_viewMtx;

void main() {
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
}