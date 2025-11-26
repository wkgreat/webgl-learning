import { mat4 } from "gl-matrix";

export default class Shader {

    /** @type {WebGLProgram|null} */
    program = null;

    /** @type {WebGLRenderingContext|null} */
    gl = null;
    /**
     * @param {WebGLRenderingContext} gl 
     * @param {string} vertSource
     * @param {string} fragSource  
    */
    constructor(gl, vertSource, fragSource) {

        let success;

        this.gl = gl;

        /* 创建程序 */
        this.program = gl.createProgram();

        /* 程序加载着色器 */
        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertSource);
        gl.compileShader(vertShader);
        success = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
        if (!success) {
            const infolog = gl.getShaderInfoLog(vertShader);
            console.error("vertex shader compile error: ", infolog);
        }
        gl.attachShader(this.program, vertShader);


        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, fragSource);
        gl.compileShader(fragShader);
        success = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
        if (!success) {
            const infolog = gl.getShaderInfoLog(fragShader);
            console.error("fragment shader compile error: ", infolog);
        }
        gl.attachShader(this.program, fragShader);

        gl.linkProgram(this.program);

        if (!this.program) {
            console.error("program is null");
        }

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program failed to link:', gl.getProgramInfoLog(this.program));
        }

    }

    /**
     * @returns {WebGLProgram}
    */
    getProgram() {
        return this.program;
    }

    /**
     * @returns {WebGLRenderingContext}
    */
    getWebGLContext() {
        return this.gl;
    }

    /**
     * @param {GLint|string} nameOrLoc 
     * @param {mat4} m
     * @returns {void} 
    */
    setUniformMatrix4f(nameOrLoc, m) {
        if (this.gl && this.program) {
            let loc = 0;
            if (typeof nameOrLoc === 'string') {
                loc = this.gl.getUniformLocation(this.program, nameOrLoc);
            } else {
                loc = nameOrLoc;
            }
            this.gl.uniformMatrix4fv(loc, false, m);
        }

    }

    setUniformVec4f(nameOrLoc, v) {
        if (this.gl && this.program) {
            let loc = 0;
            if (typeof nameOrLoc === 'string') {
                loc = this.gl.getUniformLocation(this.program, nameOrLoc);
            } else {
                loc = nameOrLoc;
            }
            this.gl.uniform4fv(loc, v);
        }
    }

    use() {
        this.gl.useProgram(this.program);
    }

};