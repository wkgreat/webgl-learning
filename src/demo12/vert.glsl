attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

uniform mat4 u_modelMtx;
uniform mat4 u_projMtx;
uniform mat4 u_viewMtx;

varying vec2 v_texcoord;

void main() {

    gl_Position = u_projMtx * u_viewMtx * u_modelMtx *  a_position;
    v_texcoord = a_texcoord;
    
}