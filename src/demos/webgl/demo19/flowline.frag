precision highp float;

varying vec4 v_basecolor;
varying float v_weight;

uniform float u_currentWeight;

void main() {

    float w = 1.0 - abs(v_weight - u_currentWeight);

    w = pow(w, 5.0);

    vec4 color = mix(v_basecolor, vec4(1.0,1.0,1.0,1.0), w);

    gl_FragColor = color;

}