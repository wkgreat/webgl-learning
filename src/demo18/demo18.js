import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo18.css"
import Camera, { CameraMouseControl } from "../common/camera";
import { createChessBoardTexture, createCone, createCube, createLineMesh, createLineProgram, createRectangle, createSphere, createTriangleProgram, drawLine, drawMesh, lineBindBuffer, meshBindBuffer } from "../common/webglutils";
import { BlinnPhongMaterial, color01Hex2RGB, color01RGB2Hex, colorRGB2Hex } from "../common/material";
import { createShadowProgram, drawShadow, setShadowFrameBuffer, shadowBindBuffer } from "../common/shadow";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo18-canvas");
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
        console.log("demo18 canvas is null");
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
    const programInfo = createTriangleProgram(gl);
    const sphere = createSphere(gl, 3, 100, 100, [0, 0, 5]);
    const plane = createRectangle(gl, [-20, -20, 0], [20, 20, 0]);
    const cone = createCone(gl, [-5, 5, 8], [-5, 5, 2], 3, 10, 10);
    const cube = createCube(gl, [5, -5, 5], [10, -10, 10]);
    meshBindBuffer(gl, sphere);
    meshBindBuffer(gl, plane);
    meshBindBuffer(gl, cone);
    meshBindBuffer(gl, cube);

    //shadow
    const shadowProgramInfo = createShadowProgram(gl);
    const shadowInfo = setShadowFrameBuffer(gl, 2048, 2048);
    shadowBindBuffer(gl, sphere, sphere.bufferInfo);
    shadowBindBuffer(gl, cone, cone.bufferInfo);
    shadowBindBuffer(gl, cube, cube.bufferInfo);

    //axis
    const lineProgramInfo = createLineProgram(gl);
    const xline = createLineMesh(gl, [-20, 0, 0, 20, 0, 0], [1.0, 0.0, 0.0, 1.0]);
    const yline = createLineMesh(gl, [0, -20, 0, 0, 20, 0], [0.0, 1.0, 0.0, 1.0]);
    const zline = createLineMesh(gl, [0, 0, -20, 0, 0, 20], [0.0, 0.0, 1.0, 1.0]);
    lineBindBuffer(gl, xline);
    lineBindBuffer(gl, yline);
    lineBindBuffer(gl, zline);

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
    const lightPosition = [100, 100, 100];
    const ligthColor = [1.0, 1.0, 1.0, 1];
    gl.uniform3fv(programInfo.light.u_position, lightPosition);
    gl.uniform4fv(programInfo.light.u_color, ligthColor);
    lightHelper(gl, programInfo, lightPosition, ligthColor);

    //数据纹理
    const textureInfo = createChessBoardTexture(gl, 10, 10, 100, 200);
    gl.activeTexture(gl.TEXTURE0); //纹理单元0
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, textureInfo.internalFormat, textureInfo.width, textureInfo.height,
        0, textureInfo.format, textureInfo.type, textureInfo.data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    //阴影纹理
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowInfo.depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.useProgram(programInfo.program);
    gl.uniform1i(programInfo.u_texture, 0); // 设置u_texture为纹理单元 0
    gl.uniform1i(programInfo.u_depthTexture, 1); // 设置u_depthTexture为纹理单元 1
    gl.uniform1f(programInfo.u_shadow_bias, 1E-5);

    function dynamicDraw() {

        //shadow
        gl.useProgram(shadowProgramInfo.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowInfo.frameBuffer);
        gl.viewport(0, 0, shadowInfo.width, shadowInfo.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        let lightProjMtx = mat4.create();
        mat4.perspective(lightProjMtx, Math.PI / 3, shadowInfo.width / shadowInfo.height, 0.1, 200);
        const shadowViewMtx = mat4.lookAt(mat4.create(), lightPosition, camera.to, camera.up);
        gl.uniformMatrix4fv(shadowProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(shadowProgramInfo.u_viewMtx, false, shadowViewMtx);
        gl.uniformMatrix4fv(shadowProgramInfo.u_projMtx, false, lightProjMtx);
        drawShadow(gl, shadowInfo, shadowProgramInfo, sphere);
        drawShadow(gl, shadowInfo, shadowProgramInfo, cone);
        drawShadow(gl, shadowInfo, shadowProgramInfo, cube);

        const textureMatrix = mat4.create();
        mat4.multiply(textureMatrix, lightProjMtx, shadowViewMtx);

        //绘制物体
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.useProgram(programInfo.program);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix4fv(programInfo.u_textureMatrix, false, textureMatrix);

        let projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000);

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

        drawMesh(gl, programInfo, plane);
        drawMesh(gl, programInfo, sphere);
        drawMesh(gl, programInfo, cone);
        drawMesh(gl, programInfo, cube);

        // draw axis
        gl.useProgram(lineProgramInfo.program);
        gl.uniformMatrix4fv(lineProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_projMtx, false, projMtx);
        drawLine(gl, lineProgramInfo, xline);
        drawLine(gl, lineProgramInfo, yline);
        drawLine(gl, lineProgramInfo, zline);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();