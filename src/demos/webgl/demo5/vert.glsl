attribute vec4 a_position;
attribute vec4 a_color;

uniform mat4 modelMtx;
uniform mat4 viewMtx;
uniform mat4 projMtx;

varying vec4 v_color;

void main() {
    gl_Position = projMtx * viewMtx * modelMtx * a_position;
    v_color = a_color;
}