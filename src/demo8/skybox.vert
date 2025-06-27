attribute vec4 a_position;

uniform mat4 u_invProjViewMtx;

varying vec4 v_position;

void main() {
    v_position = u_invProjViewMtx * a_position;
    v_position = v_position / v_position.w;
    gl_Position = a_position;
}