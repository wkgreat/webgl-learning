attribute vec4 a_position;
attribute vec4 a_color;
attribute float a_size;

uniform mat4 u_modelMtx;
uniform mat4 u_viewMtx;
uniform mat4 u_projMtx;

varying vec4 v_color;

void main() {

    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    gl_PointSize = a_size;
    v_color = a_color;

}