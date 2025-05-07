import shadowVertSource from './shadow.vert'
import shadowFragSource from './shadow.frag'

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