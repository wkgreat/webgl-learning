attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 modelMtx;
uniform mat4 viewMtx;
uniform mat4 projMtx;

varying vec3 v_normal;
varying vec3 v_worldPos;

void main() {
    gl_Position = projMtx * viewMtx * modelMtx * a_position;
    v_normal = mat3(modelMtx) * a_normal;
    v_worldPos = (modelMtx * a_position).xyz;
}