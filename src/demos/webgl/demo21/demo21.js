import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo21.css"
import Camera, { CameraMouseControl } from "../common/camera.js";
import vertSource from "./vert.glsl"
import fragSource from "./frag.glsl"
import { createChessBoardTexture, createCone, createLineMesh, createLineProgram, createRectangle, createSphere, drawLine, drawMesh, lineBindBuffer, meshBindBuffer } from "../common/webglutils.js";
import { BlinnPhongMaterial, color01Hex2RGB, color01RGB2Hex, colorRGB2Hex } from "../common/material.js";
import WireFrame from "../common/wireframe/wireframe.js";
import { addWireframeHelper, createWireframeInfo } from "../common/helpers/wireframeHelper.js";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo21-canvas");
    if (canvas !== null) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        height = canvas.height;
        width = canvas.width;
        const gl = canvas.getContext("webgl"); // 注意这里一定要设置模板缓冲
        window.addEventListener('resize', () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            height = canvas.height;
            width = canvas.width;
            gl.viewport(0, 0, width, height);
        })
        draw(gl, canvas);
    }
}

function glConfig(gl) {
    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} fragSource
 * @param {string} vertSource
*/
function createProgram(gl, vertSource, fragSource) {

    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program failed to link:', gl.getProgramInfoLog(program));
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_normal: gl.getAttribLocation(program, 'a_normal'),
        a_texcoord: gl.getAttribLocation(program, 'a_texcoord'),

        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx'),
        u_texture: gl.getUniformLocation(program, 'u_texture'),
        u_texture0: gl.getUniformLocation(program, 'u_texture0'),
        u_texture1: gl.getUniformLocation(program, 'u_texture1'),

        u_invProjViewMtx: gl.getUniformLocation(program, 'u_invProjViewMtx'),

        material: {
            u_ambient: gl.getUniformLocation(program, 'material.ambient'),
            u_diffuse: gl.getUniformLocation(program, 'material.diffuse'),
            u_specular: gl.getUniformLocation(program, 'material.specular'),
            u_emission: gl.getUniformLocation(program, 'material.emission'),
            u_shininess: gl.getUniformLocation(program, 'material.shininess'),
            u_ambient: gl.getUniformLocation(program, 'material.ambient'),
        },

        light: {
            u_position: gl.getUniformLocation(program, 'light.position'),
            u_color: gl.getUniformLocation(program, 'light.color'),
        },

        camera: {
            u_position: gl.getUniformLocation(program, 'camera.position')
        }

    };

}

function lightHelper(gl, program, position, color) {
    const inputLightX = document.getElementById("lgt-pos-x");
    const inputLightY = document.getElementById("lgt-pos-y");
    const inputLightZ = document.getElementById("lgt-pos-z");
    inputLightX.value = position[0];
    inputLightY.value = position[1];
    inputLightZ.value = position[2];
    const lightPos = position;
    gl.useProgram(program.program);
    gl.uniform3fv(program.light.u_position, lightPos);
    gl.uniform4fv(program.light.u_color, color);
    inputLightX.addEventListener("input", (e) => {
        lightPos[0] = e.target.value;
        gl.useProgram(program.program);
        gl.uniform3fv(program.light.u_position, lightPos);
    });
    inputLightY.addEventListener("input", (e) => {
        lightPos[1] = e.target.value;
        gl.useProgram(program.program);
        gl.uniform3fv(program.light.u_position, lightPos);
    });
    inputLightZ.addEventListener("input", (e) => {
        lightPos[2] = e.target.value;
        gl.useProgram(program.program);
        gl.uniform3fv(program.light.u_position, lightPos);
    });
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} program
 * @param {BlinnPhongMaterial} material   
*/
function materialHelper(gl, program, material) {

    gl.useProgram(program.program);

    const shininessInput = document.getElementById("material-shininess");
    shininessInput.value = material.shininess;
    gl.uniform1f(program.material.u_shininess, material.shininess);
    shininessInput.addEventListener("input", (e) => {
        let v = e.target.value
        material.shininess = v;
        gl.useProgram(program.program);
        gl.uniform1f(program.material.u_shininess, material.shininess);
    });
    //ambient
    const ambientInput = document.getElementById("material-ambient");
    ambientInput.value = color01RGB2Hex(material.ambient.slice(0, 3));
    gl.uniform4fv(program.material.u_ambient, material.ambient);
    ambientInput.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        material.ambient = [...rgb, 1];
        gl.useProgram(program.program);
        gl.uniform4fv(program.material.u_ambient, material.ambient);
    });
    //diffuse
    const diffuseInput = document.getElementById("material-diffuse");
    diffuseInput.value = color01RGB2Hex(material.diffuse.slice(0, 3));
    gl.uniform4fv(program.material.u_diffuse, material.diffuse);
    diffuseInput.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        material.diffuse = [...rgb, 1];
        gl.useProgram(program.program);
        gl.uniform4fv(program.material.u_diffuse, material.diffuse);
    });
    //specular
    const specularInput = document.getElementById("material-specular");
    specularInput.value = color01RGB2Hex(material.specular.slice(0, 3));
    gl.uniform4fv(program.material.u_specular, material.specular);
    specularInput.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        material.specular = [...rgb, 1];
        gl.useProgram(program.program);
        gl.uniform4fv(program.material.u_specular, material.specular);
    });
    //emission
    const emissionInput = document.getElementById("material-emission");
    emissionInput.value = color01RGB2Hex(material.emission.slice(0, 3));
    gl.uniform4fv(program.material.u_emission, material.emission);
    emissionInput.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        material.emission = [...rgb, 1];
        gl.useProgram(program.program);
        gl.uniform4fv(program.material.u_emission, material.emission);
    });
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    //mesh
    const programInfo = createProgram(gl, vertSource, fragSource);
    const sphere = createSphere(gl, 3, 100, 100, [0, 0, 5]);
    const plane = createRectangle(gl, [-20, -20, 0], [20, 20, 0]);
    const cone = createCone(gl, [-5, 5, 8], [-5, 5, 2], 3, 10, 10);
    meshBindBuffer(gl, sphere);
    meshBindBuffer(gl, plane);
    meshBindBuffer(gl, cone);

    //axis
    const lineProgramInfo = createLineProgram(gl);
    const xline = createLineMesh(gl, [-20, 0, 0, 20, 0, 0], [1.0, 0.0, 0.0, 1.0]);
    const yline = createLineMesh(gl, [0, -20, 0, 0, 20, 0], [0.0, 1.0, 0.0, 1.0]);
    const zline = createLineMesh(gl, [0, 0, -20, 0, 0, 20], [0.0, 0.0, 1.0, 1.0]);
    lineBindBuffer(gl, xline);
    lineBindBuffer(gl, yline);
    lineBindBuffer(gl, zline);

    //第一个纹理
    const textureInfo1 = createChessBoardTexture(gl, 10, 10, 100, 200);
    gl.activeTexture(gl.TEXTURE0); //纹理单元0
    const texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, textureInfo1.internalFormat, textureInfo1.width, textureInfo1.height,
        0, textureInfo1.format, textureInfo1.type, textureInfo1.data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    //第二个纹理
    const textureInfo2 = createChessBoardTexture(gl, 40, 40, 180, 200);
    gl.activeTexture(gl.TEXTURE1); //纹理单元1
    const texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, textureInfo2.internalFormat, textureInfo2.width, textureInfo2.height,
        0, textureInfo2.format, textureInfo2.type, textureInfo2.data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.useProgram(programInfo.program);
    gl.uniform1i(gl.getUniformLocation(programInfo.program, "u_texture0"), 0); // 设置u_texture0为纹理单元 0
    gl.uniform1i(gl.getUniformLocation(programInfo.program, "u_texture1"), 1); // 设置u_texture1为纹理单元 1

    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([20, 20, 20], [0, 0, 0], [0, 0, 1]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();

    //material
    const ambient = [0.1, 0.1, 0.1, 1];
    const diffuse = [0, 0, 0, 1];
    const specular = [0.1, 1.0, 0.1, 1];
    const emission = [0, 0, 0, 1];
    const shininess = 10;

    const material = new BlinnPhongMaterial;
    material.ambient = ambient;
    material.diffuse = diffuse;
    material.specular = specular;
    material.emission = emission;
    material.shininess = shininess;
    materialHelper(gl, programInfo, material);

    //light
    const lightPosition = [50, 50, 50];
    const ligthColor = [1.0, 1.0, 1.0, 1];
    gl.uniform3fv(programInfo.light.u_position, lightPosition);
    gl.uniform4fv(programInfo.light.u_color, ligthColor);
    lightHelper(gl, programInfo, lightPosition, ligthColor);

    const wireframe = new WireFrame(gl);
    const wireframeInfo = createWireframeInfo(wireframe, true, [1.0, 0.0, 0.0, 1.0]);
    const helperDiv = document.getElementById("helper");
    addWireframeHelper(helperDiv, wireframeInfo);

    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); // 需要清空模板缓冲

        const projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 1.0, 1000);

        gl.useProgram(programInfo.program);

        gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

        // invProjViewMtx
        const invProjViewMtx = mat4.create();
        mat4.multiply(invProjViewMtx, projMtx, camera.getMatrix().viewMtx);
        mat4.invert(invProjViewMtx, invProjViewMtx);
        gl.uniformMatrix4fv(programInfo.u_invProjViewMtx, false, invProjViewMtx);

        // camera
        const from = camera.getFrom();
        gl.uniform3f(programInfo.camera.u_position, from[0], from[1], from[2]);

        // 绘制平面
        gl.uniform1i(programInfo.u_texture, 1); //使用第1个纹理
        drawMesh(gl, programInfo, plane);

        // 绘制物理
        gl.uniform1i(programInfo.u_texture, 0); //使用第0个纹理
        drawMesh(gl, programInfo, sphere);
        gl.uniform1i(programInfo.u_texture, 0); //使用第0个纹理
        drawMesh(gl, programInfo, cone);



        // 绘制坐标轴
        gl.useProgram(lineProgramInfo.program);
        gl.uniformMatrix4fv(lineProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_projMtx, false, projMtx);
        drawLine(gl, lineProgramInfo, xline);
        drawLine(gl, lineProgramInfo, yline);
        drawLine(gl, lineProgramInfo, zline);

        if (wireframeInfo.show) {
            wireframe.shader.use();
            wireframe.shader.setUniformVec4f("u_color", wireframeInfo.color);

            wireframe.wireframeSetData(sphere.vertices, 3, 3, 0);
            wireframe.draw(modelMtx, camera.getMatrix().viewMtx, projMtx);

            wireframe.wireframeSetData(cone.vertices, 3, 3, 0);
            wireframe.draw(modelMtx, camera.getMatrix().viewMtx, projMtx);
        }

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();