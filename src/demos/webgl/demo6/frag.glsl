precision mediump float;

uniform sampler2D u_texture;
uniform int u_useTexture;
uniform mat4 invProjMtxLoc;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_viewPosition;
varying vec4 v_ndsPosition;

struct Material {
    vec4 ambient; //ka
    vec4 diffuse; //kd
    vec4 specular; //ks
    vec4 emission; //ke
    float shininess; //ns
    int illum;
};

struct Light {
    vec3 position;
    vec4 color;
};

uniform Material material;
uniform Light light;

vec4 shadeColor(Material material, Light light, vec4 ambient, vec3 normal, vec3 position, vec3 eye) {

    vec3 vlgt = normalize(light.position - position);
    vec3 veye = normalize(eye - position);
    vec3 vhalf = normalize(vlgt + veye);

    vec4 ambientColor = material.ambient * ambient;
    vec4 diffuseColor = material.diffuse * light.color * max(dot(normal, vlgt), 0.0);
    vec4 specularColor = material.specular * light.color * pow(max(dot(normal, vhalf), 0.0), material.shininess);

    vec4 color = ambientColor + diffuseColor + specularColor;
    return clamp(color, 0.0, 1.0);
}

vec4 shadeColorWithTexture(Material material, Light light, vec4 texcolor, vec4 ambient, vec3 normal, vec3 position, vec3 eye) {

    float diffuseAlpha = 1.0;

    vec3 vlgt = normalize(light.position - position);
    vec3 veye = normalize(eye - position);
    vec3 vhalf = normalize(vlgt + veye);

    vec4 ambientColor = material.ambient * ambient;
    vec4 diffuseColor = mix(material.diffuse, texcolor, diffuseAlpha) * light.color * max(dot(normal, vlgt), 0.0);
    vec4 specularColor = material.specular * light.color * pow(max(dot(normal, vhalf), 0.0), material.shininess);

    vec4 color = ambientColor + diffuseColor + specularColor;
    return clamp(color, 0.0, 1.0);

}

void main() {
    //position from clip space to view space
    vec3 pos = (invProjMtxLoc * v_ndsPosition).xyz;
    vec3 eye = vec3(0, 0, 0);
    vec4 ambient = vec4(0.1, 0.1, 0.1, 1);

    if(u_useTexture == 1) {
        vec4 texcolor = texture2D(u_texture, v_texcoord);
        gl_FragColor = shadeColorWithTexture(material, light, texcolor, ambient, v_normal, pos, eye);
    } else {
        gl_FragColor = shadeColor(material, light, ambient, v_normal, pos, eye);
    }
}