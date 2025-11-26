import envboxVertSource from "./envbox.vert"
import envboxFragSource from "./envbox.frag"

/**
 * @param {WebGLRenderingContext} gl
*/
export function createEnvBoxProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, envboxVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, envboxFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        a_normal: gl.getAttribLocation(program, "a_normal"),
        u_modelMtx: gl.getUniformLocation(program, "u_modelMtx"),
        u_viewMtx: gl.getUniformLocation(program, "u_viewMtx"),
        u_projMtx: gl.getUniformLocation(program, "u_projMtx"),
        u_worldCameraPos: gl.getUniformLocation(program, "u_worldCameraPos")
    };
}

/**
 * @param {WebGLRenderingContext} gl
*/
export function createEnvBoxBuffer(gl) {
    /*正方形节点*/
    const envboxVertices = new Float32Array([
        -0.5, -0.5, -0.5, 0, 0, -1,
        -0.5, 0.5, -0.5, 0, 0, -1,
        0.5, -0.5, -0.5, 0, 0, -1,
        -0.5, 0.5, -0.5, 0, 0, -1,
        0.5, 0.5, -0.5, 0, 0, -1,
        0.5, -0.5, -0.5, 0, 0, -1,

        -0.5, -0.5, 0.5, 0, 0, 1,
        0.5, -0.5, 0.5, 0, 0, 1,
        -0.5, 0.5, 0.5, 0, 0, 1,
        -0.5, 0.5, 0.5, 0, 0, 1,
        0.5, -0.5, 0.5, 0, 0, 1,
        0.5, 0.5, 0.5, 0, 0, 1,

        -0.5, 0.5, -0.5, 0, 1, 0,
        -0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, -0.5, 0, 1, 0,
        -0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, -0.5, 0, 1, 0,

        -0.5, -0.5, -0.5, 0, -1, 0,
        0.5, -0.5, -0.5, 0, -1, 0,
        -0.5, -0.5, 0.5, 0, -1, 0,
        -0.5, -0.5, 0.5, 0, -1, 0,
        0.5, -0.5, -0.5, 0, -1, 0,
        0.5, -0.5, 0.5, 0, -1, 0,

        -0.5, -0.5, -0.5, -1, 0, 0,
        -0.5, -0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, -0.5, -1, 0, 0,
        -0.5, -0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, -0.5, -1, 0, 0,

        0.5, -0.5, -0.5, 1, 0, 0,
        0.5, 0.5, -0.5, 1, 0, 0,
        0.5, -0.5, 0.5, 1, 0, 0,
        0.5, -0.5, 0.5, 1, 0, 0,
        0.5, 0.5, -0.5, 1, 0, 0,
        0.5, 0.5, 0.5, 1, 0, 0,
    ]);

    const envboxVerticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, envboxVerticesBuffer); // 绑定缓冲
    gl.bufferData(gl.ARRAY_BUFFER, envboxVertices, gl.STATIC_DRAW); // 注入数据

    return {
        verticeBuffer: envboxVerticesBuffer,
        numElements: envboxVertices.length,
        count: envboxVertices.length / 6
    }
}

/**
 * @param {WebGLRenderingContext} gl
*/
export function drawEnvBox(gl, envBoxProgramInfo, envBoxBufferInfo, cameraFrom, modelMtx, viewMtx, projMtx) {

    gl.useProgram(envBoxProgramInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, envBoxBufferInfo.verticeBuffer);

    gl.vertexAttribPointer(envBoxProgramInfo.a_position, 3, gl.FLOAT, false, 4 * 6, 0); // 设置属性指针
    gl.enableVertexAttribArray(envBoxProgramInfo.a_position); // 激活属性

    gl.vertexAttribPointer(envBoxProgramInfo.a_normal, 3, gl.FLOAT, false, 4 * 6, 4 * 3); // 设置属性指针
    gl.enableVertexAttribArray(envBoxProgramInfo.a_normal); // 激活属性

    /* model matrix */
    gl.uniformMatrix4fv(envBoxProgramInfo.u_modelMtx, false, modelMtx);

    /* view (camera) matrix*/
    gl.uniformMatrix4fv(envBoxProgramInfo.u_viewMtx, false, viewMtx);
    gl.uniform3fv(envBoxProgramInfo.u_worldCameraPos, cameraFrom);

    /* projection matrix */
    gl.uniformMatrix4fv(envBoxProgramInfo.u_projMtx, false, projMtx);

    // world camera position
    gl.uniform3fv(envBoxProgramInfo.u_worldCameraPos, cameraFrom);

    gl.drawArrays(gl.TRIANGLES, 0, envBoxBufferInfo.count);
}