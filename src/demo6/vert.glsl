attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 modelMtx;
uniform mat4 viewMtx;
uniform mat4 projMtx;
uniform mat4 normalModelViewMtx; // Normal from local to view space

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_viewPosition; // position in view space
varying vec4 v_ndsPosition;

void main() {
    v_ndsPosition = projMtx * viewMtx * modelMtx * a_position;
    gl_Position = v_ndsPosition;
    v_viewPosition = viewMtx * modelMtx * a_position;
    v_texcoord = a_texcoord;
    v_normal = normalize((normalModelViewMtx * vec4(a_normal, 0)).xyz); // normal from local to view space
}