import TinyEarth from "./tinyearth.js";
import vertSource from "./skybox.vert";
import fragSource from "./skybox.frag";
import { mat4, vec3, glMatrix, vec4 } from "gl-matrix";
import { checkGLError } from "./debug.js";
import { mat4_inv, mat4_mul, vec3_normalize, vec3_sub, vec4_affine, vec4_t3 } from "./glmatrix_utils.js";
glMatrix.setMatrixArrayType(Array);


export class SkyBoxProgram {

    /** @type {TinyEarth} */
    tinyearth = null;
    /** @type {WebGLProgram}*/
    program = null;
    /** @type {WebGLRenderingContext}*/
    gl = null;

    /** @type {Float32Array}*/
    #vertices = new Float32Array([
        -1, 1, 1,
        -1, -1, 1,
        1, -1, 1,
        1, -1, 1,
        1, 1, 1,
        -1, 1, 1
    ]);

    /** @type {WebGLBuffer} */
    #buffer = null;

    /** @type {WebGLTexture} */
    #texutre = null;

    /**
     * @param {TinyEarth} tinyearth 
    */
    constructor(tinyearth) {
        this.tinyearth = tinyearth;
        this.gl = tinyearth.gl;

        this.program = this.createProgram();
    }

    direction(p, cameraFrom, invProjViewMtx) {
        const wp = vec4_t3(vec4_affine(p, invProjViewMtx));
        const eye = vec4_t3(cameraFrom);
        const d = vec3_normalize(vec3_sub(wp, eye));
        return d;

    }

    createVertexArray() {
        const points = [
            [-1, 1, 1],
            [-1, -1, 1],
            [1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1]
        ]
        const projMtx = this.tinyearth.scene.getProjection().perspective();
        const viewMtx = this.tinyearth.scene.getCamera().getMatrix().viewMtx;
        const invProjViewMtx = mat4_inv(mat4_mul(projMtx, viewMtx));

        const vertices = [];
        for (let p of points) {
            vertices.push(...p);
            const d = this.direction(vec4.fromValues(p[0], p[1], p[2], 1), this.tinyearth.scene.getCamera().getFrom(), invProjViewMtx);
            vertices.push(...d);
        }
        return new Float32Array(vertices);
    }

    createProgram() {
        /* 创建程序 */
        const program = this.gl.createProgram();

        let success;

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, vertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        success = this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(vertShader);
            console.error('vertShader编译失败: ', error);
        }

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragShader, fragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(program, fragShader);

        success = this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(fragShader);
            console.error('fragShader编译失败: ', error);
        }

        this.gl.linkProgram(program);

        success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!success) {
            const error = this.gl.getProgramInfoLog(program);
            console.error('program 连接失败失败: ', error);
        }

        if (!program) {
            console.error("program is null");
        }

        this.program = program;
        return program;
    }

    use() {
        this.gl.useProgram(this.program);
    }


    /** 
     * @typedef CubeMapInfo 
     * @property {number} face
     * @property {string} src
    */

    /**
     * @param {CubeMapInfo[]} info 
    */
    setCubeMap(info) {
        this.use();
        // if (this.#texutre) {
        //     this.gl.deleteTexture(this.#texutre);
        // }
        this.#texutre = this.gl.createTexture();
        const that = this;

        info.forEach((face) => {
            const img = new Image();
            img.src = face.src;
            that.gl.bindTexture(that.gl.TEXTURE_CUBE_MAP, that.#texutre);
            that.gl.texImage2D(face.face, 0, that.gl.RGBA, 256, 256, 0, that.gl.RGBA, that.gl.UNSIGNED_BYTE, null); //立即渲染纹理
            img.onload = function () {
                // 图片加载完成将其拷贝到纹理
                that.gl.bindTexture(that.gl.TEXTURE_CUBE_MAP, that.#texutre);
                that.gl.texImage2D(face.face, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, img);
                that.gl.generateMipmap(that.gl.TEXTURE_CUBE_MAP);
            }
        });
    }

    /**
     * @typedef SkyboxUniformInfo
     * @property {mat4} u_invProjViewMtx
     * @property {vec3} u_worldCameraPos
    */

    /**
     * @param {SkyboxUniformInfo}
    */
    setUniforms(info) {
        this.use();
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_invProjViewMtx"), false, info.u_invProjViewMtx);
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, "u_worldCameraPos"), info.u_worldCameraPos);
    }

    setData() {
        if (!this.#buffer) {
            this.#buffer = this.gl.createBuffer();
        }

        const vertices = this.createVertexArray();

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const a_position = this.gl.getAttribLocation(this.program, "a_position");
        const a_direction = this.gl.getAttribLocation(this.program, "a_direction");

        this.gl.vertexAttribPointer(a_position, 3, this.gl.FLOAT, false, 6 * 4, 0); // 设置属性指针
        this.gl.enableVertexAttribArray(a_position); // 激活属性

        this.gl.vertexAttribPointer(a_direction, 3, this.gl.FLOAT, false, 6 * 4, 3 * 4); // 设置属性指针
        this.gl.enableVertexAttribArray(a_direction); // 激活属性
    }


    render() {
        this.use();
        checkGLError(this.gl, "use");
        // const a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.#texutre);
        checkGLError(this.gl, "bindTexture");

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#buffer);
        checkGLError(this.gl, "bindBuffer");

        this.setData();

        // this.gl.vertexAttribPointer(a_position, 3, this.gl.FLOAT, false, 0, 0); // 设置属性指针
        // this.gl.enableVertexAttribArray(a_position); // 激活属性
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        checkGLError(this.gl, "drawArrays");
    }

}