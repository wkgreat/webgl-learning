attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

uniform highp mat4 u_modelMtx;
uniform highp mat4 u_projMtx;
uniform highp mat4 u_viewMtx;

uniform highp mat4 u_textureMatrix;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_ndsPosition;
varying vec4 v_projectedTexcoord;

void main() {
    v_projectedTexcoord = u_textureMatrix * u_modelMtx * a_position;
    v_ndsPosition = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    gl_Position = v_ndsPosition;
    v_texcoord = a_texcoord;
    v_normal = normalize(a_normal);
}