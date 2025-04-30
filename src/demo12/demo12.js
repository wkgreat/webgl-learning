import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo12.css"
import "../index.css"
import Camera, { CameraMouseControl } from "../common/camera";
import vertSource from "./vert.glsl"
import fragSource from "./frag.glsl"
import { createChessBoardTexture, createCone, createConeAtOrigin, createLineMesh, createLineProgram, createPointProgram, createPoints, createRectangle, createSphere, drawLine, drawMesh, drawPoint, lineBindBuffer, meshBindBuffer, pointBindBuffer } from "../common/webglutils";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo12-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl, canvas);
    } else {
        console.log("demo12 canvas is null");
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
        u_texture1: gl.getUniformLocation(program, 'u_texture1')
    };

}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    // mesh
    const programInfo = createProgram(gl, vertSource, fragSource);
    const sphere = createSphere(gl, 1, 100, 100, [5, 5, 5]); // sphere
    const plane = createRectangle(gl, [-20, -20, 0], [20, 20, 0]); // rectangle
    const cone = createCone(gl, [-5, 5, 8], [-5, 5, 2], 3, 10, 10); //cone
    meshBindBuffer(gl, sphere);
    meshBindBuffer(gl, plane);
    meshBindBuffer(gl, cone);

    // axis
    const lineProgramInfo = createLineProgram(gl);
    const xline = createLineMesh(gl, [-20, 0, 0, 20, 0, 0], [1.0, 0.0, 0.0, 1.0]);
    const yline = createLineMesh(gl, [0, -20, 0, 0, 20, 0], [0.0, 1.0, 0.0, 1.0]);
    const zline = createLineMesh(gl, [0, 0, -20, 0, 0, 20], [0.0, 0.0, 1.0, 1.0]);
    lineBindBuffer(gl, xline);
    lineBindBuffer(gl, yline);
    lineBindBuffer(gl, zline);

    //points
    const pointProgramInfo = createPointProgram(gl);
    const points = createPoints(gl, [
        5, -5, 5,
        5, -10, 5
    ], [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0
    ], [10, 20]);
    pointBindBuffer(gl, points);

    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([10, 10, 10], [0, 0, 0], [0, 0, 1]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000);

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

    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(programInfo.program);

        gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

        gl.uniform1i(programInfo.u_texture, 1); //使用第1个纹理
        drawMesh(gl, programInfo, plane);
        gl.uniform1i(programInfo.u_texture, 0); //使用第0个纹理
        drawMesh(gl, programInfo, sphere);
        gl.uniform1i(programInfo.u_texture, 0); //使用第0个纹理
        drawMesh(gl, programInfo, cone);

        gl.useProgram(lineProgramInfo.program);
        gl.uniformMatrix4fv(lineProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_projMtx, false, projMtx);
        drawLine(gl, lineProgramInfo, xline);
        drawLine(gl, lineProgramInfo, yline);
        drawLine(gl, lineProgramInfo, zline);

        gl.useProgram(pointProgramInfo.program);
        gl.uniformMatrix4fv(pointProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(pointProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(pointProgramInfo.u_projMtx, false, projMtx);
        drawPoint(gl, pointProgramInfo, points);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();