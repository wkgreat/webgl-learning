attribute vec4 a_position;
attribute vec4 a_color;
attribute float a_size;

uniform mat4 u_modelMtx;
uniform mat4 u_viewMtx;
uniform mat4 u_projMtx;

uniform bool u_hasColor;
uniform bool u_hasSize;
uniform vec4 u_defaultColor;
uniform float u_defaultSize; 

varying vec4 v_color;

void main() {

    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    
    if(u_hasSize) {
        gl_PointSize = a_size;
    } else {
        gl_PointSize = u_defaultSize;
    }
    
    if(u_hasColor) {
        v_color = a_color;
    } else {
        v_color = u_defaultColor;
    }
}