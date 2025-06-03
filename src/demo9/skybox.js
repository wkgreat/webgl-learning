import skyboxVertSource from "./skybox.vert";
import skyboxFragSource from "./skybox.frag";
import { mat4 } from "gl-matrix";

/**
 * @param {WebGLRenderingContext} gl
*/
export function createSkyBoxProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, skyboxVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, skyboxFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        u_invProjViewMtx: gl.getUniformLocation(program, "u_invProjViewMtx"),
        u_worldCameraPos: gl.getUniformLocation(program, "u_worldCameraPos"),
        u_skybox: gl.getUniformLocation(program, "u_skybox")
    };
}

/**
 * @param {WebGLRenderingContext} gl
*/
export function createSkyBoxBuffer(gl) {
    // NDS空间中z=1的面的顶点坐标
    const skyboxVertices = new Float32Array([
        -1, 1, 1,
        -1, -1, 1,
        1, -1, 1,
        1, -1, 1,
        1, 1, 1,
        -1, 1, 1
    ]);

    const skyboxVerticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVerticesBuffer); // 绑定缓冲
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW); // 注入数据

    return {
        verticeBuffer: skyboxVerticesBuffer,
        numElements: skyboxVertices.length,
        count: skyboxVertices.length / 3
    };
}

/**
 * @param {WebGLRenderingContext} gl
*/
export function drawSkybox(gl, skyboxProgramInfo, skyBoxBufferInfo, cameraFrom, modelMtx, viewMtx, projMtx) {

    gl.useProgram(skyboxProgramInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyBoxBufferInfo.verticeBuffer);
    gl.vertexAttribPointer(skyboxProgramInfo.a_position, 3, gl.FLOAT, false, 0, 0); // 设置属性指针
    gl.enableVertexAttribArray(skyboxProgramInfo.a_position); // 激活属性

    // NDS -> World inverse matrix
    const invProjViewMtx = mat4.create();
    mat4.multiply(invProjViewMtx, projMtx, viewMtx);
    mat4.invert(invProjViewMtx, invProjViewMtx);
    gl.uniformMatrix4fv(skyboxProgramInfo.u_invProjViewMtx, false, invProjViewMtx);

    // World Camera Position
    gl.uniform3fv(skyboxProgramInfo.u_worldCameraPos, cameraFrom);

    gl.drawArrays(gl.TRIANGLES, 0, skyBoxBufferInfo.count);
}