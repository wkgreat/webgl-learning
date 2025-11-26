import shadowVertSource from './shadow.vert'
import shadowFragSource from './shadow.frag'
import { mat4 } from 'gl-matrix';

export class ShadowMap {

    bias = 1E-6;

    /**
     * @param {WebGLRenderingContext} gl 
    */
    constructor(gl, width, heigth) {
        this.gl = gl;
        this.width = width;
        this.height = heigth;
        this.bias = 1E-6;

        this.createProgram();
        this.setShadowFrameBuffer();
    }

    createProgram() {
        const ext = this.gl.getExtension('WEBGL_depth_texture');
        if (!ext) {
            console.error("WEBGL_depth_texture get ERROR");
            return {};
        }

        /* 创建程序 */
        const program = this.gl.createProgram();

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, shadowVertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragShader, shadowFragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(program, fragShader);

        this.gl.linkProgram(program);

        if (!program) {
            console.error("program is null");
        }

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program failed to link:', this.gl.getProgramInfoLog(program));
        }

        this.program = program;
        this.attributes = {
            a_position: this.gl.getAttribLocation(program, 'a_position')
        };
        this.uniforms = {
            u_modelMtx: this.gl.getUniformLocation(program, 'u_modelMtx'),
            u_viewMtx: this.gl.getUniformLocation(program, 'u_viewMtx'),
            u_projMtx: this.gl.getUniformLocation(program, 'u_projMtx')
        };
    }

    setShadowFrameBuffer() {

        const depthTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, depthTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,      // target
            0,                  // mip level
            this.gl.DEPTH_COMPONENT, // internal format
            this.width,   // width
            this.height,   // height
            0,                  // border
            this.gl.DEPTH_COMPONENT, // format
            this.gl.UNSIGNED_INT,    // type
            null);              // data
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        const depthFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, depthFramebuffer);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,       // target
            this.gl.DEPTH_ATTACHMENT,  // attachment point
            this.gl.TEXTURE_2D,        // texture target
            depthTexture,         // texture
            0);

        // 创建一个和深度纹理相同尺寸的颜色纹理
        const unusedTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, unusedTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.width,
            this.height,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            null,
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // 把它附加到该帧缓冲上
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,        // target
            this.gl.COLOR_ATTACHMENT0,  // attachment point
            this.gl.TEXTURE_2D,         // texture target
            unusedTexture,         // texture
            0);                    // mip level

        this.frameBuffer = depthFramebuffer;
        this.depthTexture = depthTexture;
        this.colorTexture = this.colorTexture;
    }

    setShadowInfo(lightPos, targetPos, worldMtx) {
        this.lightPosition = lightPos;
        this.targetPos = targetPos;

        let projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, this.width / this.height, 0.1, 1000);
        const viewMtx = mat4.lookAt(mat4.create(), this.lightPosition, this.targetPos, [0, 0, 1]);

        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.uniforms.u_modelMtx, false, worldMtx);
        this.gl.uniformMatrix4fv(this.uniforms.u_viewMtx, false, viewMtx);
        this.gl.uniformMatrix4fv(this.uniforms.u_projMtx, false, projMtx);

        this.textureMatrix = mat4.create();
        mat4.multiply(this.textureMatrix, projMtx, viewMtx);
    }

    prepareDraw() {
        this.gl.useProgram(this.program);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);;
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    drawShadow(mesh) {
        if (this.attributes.a_position >= 0) {
            const positionBuffer = mesh.bufferInfo.positionBuffer;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.vertexAttribPointer(this.attributes.a_position, mesh.verticeSize, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attributes.a_position);
        }
        this.gl.drawArrays(this.gl.TRIANGLES, 0, mesh.nvertices);
    }

}

/**
 * @param {WebGLRenderingContext} gl 
*/
export function createShadowProgram(gl) {

    const ext = gl.getExtension('WEBGL_depth_texture');
    if (!ext) {
        console.error("WEBGL_depth_texture get ERROR");
        return {};
    }

    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, shadowVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, shadowFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program failed to link:', gl.getProgramInfoLog(program));
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, 'a_position'),
        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx')
    };
}

/**
 * @param {WebGLRenderingContext} gl 
*/
export function setShadowFrameBuffer(gl, width, height) {

    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,      // target
        0,                  // mip level
        gl.DEPTH_COMPONENT, // internal format
        width,   // width
        height,   // height
        0,                  // border
        gl.DEPTH_COMPONENT, // format
        gl.UNSIGNED_INT,    // type
        null);              // data
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,       // target
        gl.DEPTH_ATTACHMENT,  // attachment point
        gl.TEXTURE_2D,        // texture target
        depthTexture,         // texture
        0);

    // 创建一个和深度纹理相同尺寸的颜色纹理
    const unusedTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, unusedTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // 把它附加到该帧缓冲上
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,        // target
        gl.COLOR_ATTACHMENT0,  // attachment point
        gl.TEXTURE_2D,         // texture target
        unusedTexture,         // texture
        0);                    // mip level

    return {
        frameBuffer: depthFramebuffer,
        depthTexture: depthTexture,
        colorTexture: unusedTexture,
        width: width,
        height: height
    };
}

export function shadowBindBuffer(gl, mesh, bufferInfo = {
    positionBuffer: gl.createBuffer()
}) {
    mesh.bufferInfo = bufferInfo;
    const positionBuffer = bufferInfo.positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo 
 * @param {object} mesh   
*/
export function drawShadow(gl, shadowInfo, programInfo, mesh) {

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, shadowInfo.width, shadowInfo.height);

    if (programInfo.a_position >= 0) {
        const positionBuffer = mesh.bufferInfo.positionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.a_position, mesh.verticeSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_position);
    }

    gl.drawArrays(gl.TRIANGLES, 0, mesh.nvertices);

}