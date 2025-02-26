precision mediump float;

varying vec3 v_normal;
varying vec3 v_worldPos;

uniform samplerCube u_skybox;
uniform vec3 u_worldCameraPos;

void main() {
    vec3 worldNormal = normalize(v_normal);
    vec3 eyeToSurface = normalize(v_worldPos - u_worldCameraPos);
    vec3 direction = reflect(eyeToSurface, worldNormal); //反射(视点至像素位置的向量经表面反射得到的向量)
    gl_FragColor = textureCube(u_skybox, direction);
}