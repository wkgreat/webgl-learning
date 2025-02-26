import sphereVertSource from "./sphere.vert"
import sphereFragSource from "./sphere.frag"

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createSphereProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, sphereVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, sphereFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        u_modelMtx: gl.getUniformLocation(program, "u_modelMtx"),
        u_viewMtx: gl.getUniformLocation(program, "u_viewMtx"),
        u_projMtx: gl.getUniformLocation(program, "u_projMtx"),
        u_color: gl.getUniformLocation(program, "u_color")
    }

}

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createSphereBuffer(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    return {
        buffer: buffer,
        numElements: 0
    };
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {object} bufferInfo
 * @param {Float32Array} data 
*/
export function setSphereBufferData(gl, bufferInfo, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    bufferInfo.numElements = data.length;
}

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function drawSphere(gl, programInfo, bufferInfo, modelMtx, viewMtx, projMtx, color) {

    gl.useProgram(programInfo.program);

    // a_position
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    gl.vertexAttribPointer(programInfo.a_position, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, 0);
    gl.enableVertexAttribArray(programInfo.a_position);

    gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
    gl.uniformMatrix4fv(programInfo.u_viewMtx, false, viewMtx);
    gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

    gl.uniform4fv(programInfo.u_color, color);

    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);

}