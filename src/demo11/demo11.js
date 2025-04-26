import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo11.css"
import Camera, { CameraMouseControl } from "../common/camera";
import vertSource from "./vert.glsl"
import fragSource from "./frag.glsl"
import { createChessBoardTexture, createRectangle, drawMesh } from "../common/webglutils";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo11-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl, canvas);
    } else {
        console.log("demo11 canvas is null");
    }
}

function glConfig(gl) {
    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} fragSource
 * @param {string} vertSource
*/
function createProgram(gl, vertSource, fragSource) {

    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_normal: gl.getAttribLocation(program, 'a_normal'),
        a_texcoord: gl.getAttribLocation(program, 'a_texcoord'),

        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx'),
    };

}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    const programInfo = createProgram(gl, vertSource, fragSource);
    gl.useProgram(programInfo.program);

    //attribute
    const rectangle = createRectangle(gl);

    const bufferInfo = {
        positionBuffer: gl.createBuffer(),
        normalBuffer: gl.createBuffer(),
        texcoordBuffer: gl.createBuffer()
    };


    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([0, 0, 5], [0, 0, 0], [0, 1, 0]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000);

    //texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const textureInfo = createChessBoardTexture(gl, 8, 8, 100, 200);

    // 上传纹理数据
    gl.texImage2D(
        gl.TEXTURE_2D,       // target
        0,                   // level
        textureInfo.internalFormat,        // internalFormat (WebGL1用LUMINANCE)
        textureInfo.width, textureInfo.height,       // width and height
        0,                   // border (必须是0)
        textureInfo.format,        // format (也是LUMINANCE)
        textureInfo.type,    // type
        textureInfo.data             // data
    );

    //设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

        drawMesh(gl, programInfo, bufferInfo, rectangle);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();