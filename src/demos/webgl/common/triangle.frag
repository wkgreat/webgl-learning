precision mediump float;

uniform sampler2D u_texture;
uniform mat4 u_invProjViewMtx;
uniform sampler2D u_depthTexture;

uniform highp mat4 u_modelMtx;
uniform highp mat4 u_projMtx;
uniform highp mat4 u_viewMtx;

uniform float u_shadow_bias;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_ndsPosition;
varying vec4 v_projectedTexcoord;

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

mat4 inverseMat4(mat4 m) {
    float
        a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],
        a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],
        a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],
        a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3];

    float
        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    float det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (abs(det) < 1e-6) return mat4(0.0); // 不可逆，返回零矩阵

    float invDet = 1.0 / det;

    return mat4(
        ( a11 * b11 - a12 * b10 + a13 * b09) * invDet,
        (-a01 * b11 + a02 * b10 - a03 * b09) * invDet,
        ( a31 * b05 - a32 * b04 + a33 * b03) * invDet,
        (-a21 * b05 + a22 * b04 - a23 * b03) * invDet,

        (-a10 * b11 + a12 * b08 - a13 * b07) * invDet,
        ( a00 * b11 - a02 * b08 + a03 * b07) * invDet,
        (-a30 * b05 + a32 * b02 - a33 * b01) * invDet,
        ( a20 * b05 - a22 * b02 + a23 * b01) * invDet,

        ( a10 * b10 - a11 * b08 + a13 * b06) * invDet,
        (-a00 * b10 + a01 * b08 - a03 * b06) * invDet,
        ( a30 * b04 - a31 * b02 + a33 * b00) * invDet,
        (-a20 * b04 + a21 * b02 - a23 * b00) * invDet,

        (-a10 * b09 + a11 * b07 - a12 * b06) * invDet,
        ( a00 * b09 - a01 * b07 + a02 * b06) * invDet,
        (-a30 * b03 + a31 * b01 - a32 * b00) * invDet,
        ( a20 * b03 - a21 * b01 + a22 * b00) * invDet
    );
}

void main() {

    vec3 pos = (u_invProjViewMtx * v_ndsPosition).xyz;
    vec3 eye = camera.position;
    vec4 ambient = vec4(1, 1, 1, 1); //环境光
    vec4 texcolor = vec4(0, 0, 0, 1);

    texcolor = texture2D(u_texture, v_texcoord);

    //shadow
    vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
    projectedTexcoord = projectedTexcoord * 0.5 + 0.5;
    float currentDepth = projectedTexcoord.z;

    bool inRange =
        projectedTexcoord.x >= 0.0 &&
        projectedTexcoord.x <= 1.0 &&
        projectedTexcoord.y >= 0.0 &&
        projectedTexcoord.y <= 1.0;

    // the 'r' channel has the depth values
    float projectedDepth = texture2D(u_depthTexture, projectedTexcoord.xy).r;
    float shadowLight = (inRange && projectedDepth <= currentDepth - u_shadow_bias) ? 0.0 : 1.0;

    vec4 shadeColor = shadeColorWithTexture(material, light, texcolor, ambient, v_normal, pos, eye);
    gl_FragColor = vec4(shadeColor.rgb * shadowLight, shadeColor.a);
    // gl_FragColor = inRange ? vec4(1.0,0.0,0.0,1.0) : vec4(0.0,1.0,0.0,1.0) ;
    // gl_FragColor = vec4(projectedDepth,projectedDepth,projectedDepth,1.0);

}