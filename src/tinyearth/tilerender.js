import tileVertSource from "./tile.vert"
import tileFragSource from "./tile.frag"
import { Tile, TileMesher } from "./maptiler";
import { mat4 } from "gl-matrix";
import Camera from "./camera";
import { EPSG_4978 } from "./proj";

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createTileProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    let success;

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, tileVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    success = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
    if (!success) {
        const error = gl.getShaderInfoLog(vertShader);
        console.error('vertShader编译失败: ', error);
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, tileFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    success = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
    if (!success) {
        const error = gl.getShaderInfoLog(fragShader);
        console.error('fragShader编译失败: ', error);
    }

    gl.linkProgram(program);

    success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        const error = gl.getProgramInfoLog(program);
        console.error('program 连接失败失败: ', error);
    }


    if (!program) {
        console.error("program is null");
    }

    gl.useProgram(program);

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        a_texcoord: gl.getAttribLocation(program, "a_texcoord"),
        a_normal: gl.getAttribLocation(program, "a_normal"),
        u_modelMtx: gl.getUniformLocation(program, "u_modelMtx"),
        u_viewMtx: gl.getUniformLocation(program, "u_viewMtx"),
        u_projMtx: gl.getUniformLocation(program, "u_projMtx"),
        light: {
            position: gl.getUniformLocation(program, "light.position"),
            color: gl.getUniformLocation(program, "light.color")
        },
        camera: {
            position: gl.getUniformLocation(program, "camera.position")
        },
        material: {
            ambient: gl.getUniformLocation(program, "material.ambient"),
            diffuse: gl.getUniformLocation(program, "material.diffuse"),
            specular: gl.getUniformLocation(program, "material.specular"),
            emission: gl.getUniformLocation(program, "material.emission"),
            shininess: gl.getUniformLocation(program, "material.shininess"),
        }
    };
}

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createTileProgramBuffer(gl) {
    const verticesBuffer = gl.createBuffer();
    const texture = gl.createTexture();

    return {
        verticesBuffer: verticesBuffer,
        numElements: 0,
        texture: texture
    }
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {object} programInfo 
 * @param {object} bufferInfo 
 * @param {Array} data 
*/
export function setTileProgramBufferData(gl, bufferInfo, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    bufferInfo.numElements = data.length;
}

export function setTileProgramTextureData(gl, bufferInfo, image) {
    /* 纹理 */

    gl.bindTexture(gl.TEXTURE_2D, bufferInfo.texture);
    //设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    //纹理数据
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo
 * @param {object} mesh
 * @param {mat4} modelMtx
 * @param {Camera} camera
 * @param {mat4} projMtx       
*/
export function drawTileMesh(gl, programInfo, bufferInfo, mesh, modelMtx, camera, projMtx) {

    gl.useProgram(programInfo.program);

    setTileProgramBufferData(gl, bufferInfo, mesh.vertices);
    setTileProgramTextureData(gl, bufferInfo, mesh.texImage);

    gl.vertexAttribPointer(programInfo.a_position, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, 0); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_position); // 激活属性

    gl.vertexAttribPointer(programInfo.a_texcoord, 2, gl.FLOAT, false, (3 + 2 + 3) * 4, 3 * 4); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_texcoord); // 激活属性

    gl.vertexAttribPointer(programInfo.a_normal, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, (3 + 2) * 4); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_normal); // 激活属性

    gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
    gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
    gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements / 8);
}

class TileProvider {
    height = 0;
    source = null;

    getFrameTiles() {
        return null;
    }

}