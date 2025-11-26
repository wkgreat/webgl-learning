attribute vec4 a_position;

uniform mat4 u_modelMtx;
uniform mat4 u_projMtx;
uniform mat4 u_viewMtx;
void main() {
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx *  a_position;
}