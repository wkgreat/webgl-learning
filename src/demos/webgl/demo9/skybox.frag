precision mediump float;

uniform mat4 u_invProjViewMtx;
uniform vec3 u_worldCameraPos;
uniform samplerCube u_skybox;

varying vec4 v_position;

void main() {

    vec4 worldpos4 = u_invProjViewMtx * v_position;
    vec3 worldpos3 = worldpos4.xyz / worldpos4.w;
    vec3 direction = normalize(worldpos3 - u_worldCameraPos);
    gl_FragColor = textureCube(u_skybox, direction);

}