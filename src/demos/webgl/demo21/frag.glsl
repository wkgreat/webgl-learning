precision mediump float;

uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform int u_texture;
uniform mat4 u_invProjViewMtx;

uniform mat4 u_modelMtx;
uniform mat4 u_projMtx;
uniform mat4 u_viewMtx;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_ndsPosition;


struct Material {
    vec4 ambient; //ka
    vec4 diffuse; //kd
    vec4 specular; //ks
    vec4 emission; //ke
    float shininess; //ns
};

struct Light {
    vec3 position;
    vec4 color;
};

struct Camera {
    vec3 position;
};

uniform Material material;
uniform Light light;
uniform Camera camera;

vec4 shadeColorWithTexture(Material material, Light light, vec4 texcolor, vec4 ambient, vec3 normal, vec3 position, vec3 eye) {

    float diffuseAlpha = 1.0;

    vec3 vlgt = normalize(light.position - position);
    vec3 veye = normalize(eye - position);
    vec3 vhalf = normalize(vlgt + veye);

    vec4 ambientColor = material.ambient * ambient;
    vec4 diffuseColor = mix(material.diffuse, texcolor, diffuseAlpha) * light.color * max(dot(normal, vlgt), 0.0);
    vec4 specularColor = material.specular * light.color * pow(max(dot(normal, vhalf), 0.0), material.shininess);

    vec4 color = ambientColor + diffuseColor + specularColor + material.emission;
    return clamp(color, 0.0, 1.0);


}

void main() {

    vec3 pos = (u_invProjViewMtx * v_ndsPosition).xyz;
    vec3 eye = camera.position;
    vec4 ambient = vec4(1, 1, 1, 1); //环境光
    vec4 texcolor = vec4(0, 0, 0, 1);

    if(u_texture==0) {
        texcolor = texture2D(u_texture0, v_texcoord);
    } else if(u_texture==1) {
        texcolor = texture2D(u_texture1, v_texcoord);
    }

    gl_FragColor = shadeColorWithTexture(material, light, texcolor, ambient, v_normal, pos, eye);
}