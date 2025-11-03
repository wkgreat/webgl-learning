#version 300 es
precision highp float;

in vec4 a_position;
in vec2 a_offset;

void main() {
    vec4 pos = vec4(a_position.x + a_offset.x, a_position.y + a_offset.y, a_position.z, 1.0);
    gl_Position = pos;
}