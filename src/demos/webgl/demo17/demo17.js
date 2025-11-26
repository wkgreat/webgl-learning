import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo17.css"
import Camera, { CameraMouseControl } from "../common/camera.js";
import { createChessBoardTexture, createCone, createCube, createLineMesh, createLineProgram, createRectangle, createSphere, createTriangleProgram, drawLine, drawMesh, lineBindBuffer, meshBindBuffer } from "../common/webglutils.js";
import { BlinnPhongMaterial, color01Hex2RGB, color01RGB2Hex, colorRGB2Hex } from "../common/material.js";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo17-canvas");
    if (canvas !== null) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        height = canvas.height;
        width = canvas.width;
        const gl = canvas.getContext("webgl");
        window.addEventListener('resize', () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            height = canvas.height;
            width = canvas.width;
            gl.viewport(0, 0, width, height);
        })
        draw(gl, canvas);
    } else {
        console.log("demo17 canvas is null");
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

function lightHelper(gl, program, position, color) {
    const inputLightX = document.getElementById("lgt-pos-x");
    const inputLightY = document.getElementById("lgt-pos-y");
    const inputLightZ = document.getElementById("lgt-pos-z");
    const inputLightColor = document.getElementById("lgt-color");
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

    inputLightColor.value = color01RGB2Hex(color.slice(0, 3));
    gl.uniform4fv(program.light.u_color, color);
    inputLightColor.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        color = [...rgb, 1];
        gl.useProgram(program.program);
        gl.uniform4fv(program.light.u_color, color);
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
    const programInfo = createTriangleProgram(gl);
    const cube = createCube(gl, [-5, -5, -5], [5, 5, 5]);
    meshBindBuffer(gl, cube);

    //=========目标texture===========
    const targetTextureWidth = 200;
    const targetTextureHeight = 200;
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    // 定义 0 级的大小和格式
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null; //这里data是null，因为不需要我们提供数据
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        targetTextureWidth, targetTextureHeight, border,
        format, type, data);

    // 设置筛选器，不需要使用贴图
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // 创建帧缓冲
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

    //===========数据texture============
    const textureInfo = createChessBoardTexture(gl, 10, 10, 100, 200);
    gl.activeTexture(gl.TEXTURE0); //纹理单元0
    const dataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, textureInfo.internalFormat, textureInfo.width, textureInfo.height,
        0, textureInfo.format, textureInfo.type, textureInfo.data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.useProgram(programInfo.program);

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


    function dynamicDraw() {

        gl.useProgram(programInfo.program);

        //===============绘制到纹理========================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); // 设置framebuffer至目标纹理
        gl.bindTexture(gl.TEXTURE_2D, dataTexture); // 绘制数据纹理至目标纹理
        gl.viewport(0, 0, targetTextureWidth, targetTextureHeight); //viewport要符合目标纹理大小
        const projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, targetTextureWidth / targetTextureHeight, 0.5, 1000); //投影aspect要符合目标纹理尺寸比例

        // 一些常规代码
        gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);
        // invProjViewMtx
        const invProjViewMtx = mat4.create();
        mat4.multiply(invProjViewMtx, projMtx, camera.getMatrix().viewMtx);
        mat4.invert(invProjViewMtx, invProjViewMtx);
        gl.uniformMatrix4fv(programInfo.u_invProjViewMtx, false, invProjViewMtx);
        //camera
        const from = camera.getFrom();
        gl.uniform3f(programInfo.camera.u_position, from[0], from[1], from[2]);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawMesh(gl, programInfo, cube);

        //===============绘制到画布========================================

        gl.bindFramebuffer(gl.FRAMEBUFFER, null); //设置framebuffer为空，则渲染到画布
        gl.bindTexture(gl.TEXTURE_2D, targetTexture); //绘制目标纹理至画布
        gl.viewport(0, 0, width, height); // 设置viewport为画布尺寸
        mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000); //投影aspect要符合画布尺寸比例
        gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

        drawMesh(gl, programInfo, cube);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();