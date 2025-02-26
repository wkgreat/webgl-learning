/**
 * @class GLProgram
 * @property {WebGLRenderingContext|null} gl
 * @property {WebGLProgram|null} program
 * @property {GLint} positionLoc
 * @property {WebGLUniformLocation|null} texcoordLoc
 * @property {WebGLUniformLocation|null} normalLoc
*/
class GLProgram {
    gl = null;
    program = null;
    positionLoc = 0;
    texcoordLoc = 0;
    normalLoc = 0;

    /**
     * @param {WebGLRenderingContext} gl
     * @param {string} vertSource
     * @param {string} fragSource
    */
    constructor(gl, vertSource, fragSource) {
        this.gl = gl;
        /* 创建程序 */
        this.program = this.gl.createProgram();

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, vertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(this.program, vertShader);

        const fragShader = this.gl.createShader(gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragShader, fragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(this.program, fragShader);

        this.gl.linkProgram(this.program);

        if (!this.program) {
            console.error("program is null");
        }

        this.gl.useProgram(this.program);

        this.positionLoc = this.gl.getAttribLocation(this.program, "a_position");
        this.texcoordLoc = this.gl.getAttribLocation(this.program, "a_texcoord");
        this.normalLoc = this.gl.getAttribLocation(this.program, "a_normal");

    }
};

export default GLProgram;