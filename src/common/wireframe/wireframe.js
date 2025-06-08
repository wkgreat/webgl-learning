import Shader from "../shader";
import vertSource from "./wireframe.vs"
import fragSource from "./wireframe.fs"

export default class WireFrame {

    /** @type {Shader} */
    shader = null;
    /** @type {WebGLBuffer} */
    positionBuffer = null;
    /** @type {WebGLBuffer} */
    indicesBuffer = null;
    /** @type {number} */
    nvertices = 0;
    /** @type {number} */
    nindices = 0;

    /** @type {GLint} */
    a_position = 0;
    /** @type {GLint} */
    u_modelMtx = 0;
    /** @type {GLint} */
    u_viewMtx = 0;
    /** @type {GLint} */
    u_projMtx = 0;

    /**  @type {GLint} */
    posLen = 0;
    /**  @type {GLint} */
    posStrideNum = 0;
    /**  @type {GLint} */
    posOffset = 0;

    constructor(gl) {
        this.gl = gl;
        this.shader = new Shader(gl, vertSource, fragSource);
        this.a_position = this.shader.getWebGLContext().getAttribLocation(this.shader.getProgram(), "a_position");
        this.u_modelMtx = this.shader.getWebGLContext().getUniformLocation(this.shader.getProgram(), "u_modelMtx");
        this.u_viewMtx = this.shader.getWebGLContext().getUniformLocation(this.shader.getProgram(), "u_viewMtx");
        this.u_projMtx = this.shader.getWebGLContext().getUniformLocation(this.shader.getProgram(), "u_projMtx");

        this.positionBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();

    }

    /**
     * @param {float[]} positions
     * @param {GLint} poslen  
     * @param {GLint} posStrideNum  
     * @param {GLint} posOffset  
    */
    wireframeSetData(positions, posLen, posStrideNum, posOffset) {

        this.nvertices = positions.length / posStrideNum;

        const gl = this.shader.getWebGLContext();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        console.log(positions);

        const indices = [];
        console.log(indices);
        for (let i = 0; i < this.nvertices; i += 3) {
            indices.push(i, i + 1, i + 1, i + 2, i + 2, i);
        }
        this.nindices = indices.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); // 动态决定使用的数据类型

        this.posLen = posLen;
        this.posStrideNum = posStrideNum;
        this.posOffset = posOffset;

    }

    draw(modelMtx, viewMtx, projMtx) {

        const gl = this.shader.getWebGLContext();

        this.shader.use();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.a_position, this.posLen, gl.FLOAT, false, this.posStrideNum * 4, this.posOffset);
        gl.enableVertexAttribArray(this.a_position);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.shader.setUniformMatrix4f(this.u_modelMtx, modelMtx);
        this.shader.setUniformMatrix4f(this.u_viewMtx, viewMtx);
        this.shader.setUniformMatrix4f(this.u_projMtx, projMtx);

        console.log(this.nindices);
        gl.drawElements(gl.LINES, this.nindices, gl.UNSIGNED_SHORT, 0);
        // gl.drawArrays(gl.TRIANGLES, 0, this.nvertices);

    }

}


