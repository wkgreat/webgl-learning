import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo16.css"
import Camera, { CameraMouseControl } from "../common/camera.js";
import { createChessBoardTexture, createCone, createCube, createLineMesh, createLineProgram, createRectangle, createSphere, createTriangleProgram, drawLine, drawMesh, lineBindBuffer, meshBindBuffer } from "../common/webglutils.js";
import { BlinnPhongMaterial, color01Hex2RGB, color01RGB2Hex, colorRGB2Hex } from "../common/material.js";
import { createShadowProgram, drawShadow, setShadowFrameBuffer, shadowBindBuffer } from "../common/shadow.js";
import textureVertSource from './texture.vert';
import textureFragSource from './texture.frag';

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo16-canvas");
    if (canvas !== null) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        height = canvas.height;
        width = canvas.width;
        const gl = canvas.getContext("webgl");
        window.addEventListener('resize', () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            height = canvas.height;
            width = canvas.width;
            gl.viewport(0, 0, width, height);
        })
        draw(gl, canvas);
    } else {
        console.log("demo16 canvas is null");
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
*/
export function createTextureProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, textureVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, textureFragSource);
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
        a_texcoord: gl.getAttribLocation(program, 'a_texcoord')
    };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    //mesh
    const shadowProgramInfo = createShadowProgram(gl);
    const shadowInfo = setShadowFrameBuffer(gl, width, height);
    const sphere = createSphere(gl, 3, 100, 100, [0, 0, 5]);
    const cone = createCone(gl, [-5, 5, 8], [-5, 5, 2], 3, 10, 10);
    const cube = createCube(gl, [3, -3, 3], [7, -7, 7]);
    shadowBindBuffer(gl, sphere);
    shadowBindBuffer(gl, cone);
    shadowBindBuffer(gl, cube);

    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([20, 20, 20], [0, 0, 0], [0, 0, 1]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();

    const textureProgramInfo = createTextureProgram(gl);

    /*几何节点数据 a_position*/
    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    const vertices = new Float32Array([
        -1, -1, 0, 1,
        1, 1, 0, 1,
        -1, 1, 0, 1,
        -1, -1, 0, 1,
        1, -1, 0, 1,
        1, 1, 0, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    /* 纹理坐标数据 */
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texcoords = new Float32Array([
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);


    function dynamicDraw() {

        //shadow
        gl.useProgram(shadowProgramInfo.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowInfo.frameBuffer);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 10, 40);
        gl.uniformMatrix4fv(shadowProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(shadowProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(shadowProgramInfo.u_projMtx, false, projMtx);
        drawShadow(gl, shadowInfo, shadowProgramInfo, sphere);
        drawShadow(gl, shadowInfo, shadowProgramInfo, cone);
        drawShadow(gl, shadowInfo, shadowProgramInfo, cube);

        //show depth
        gl.useProgram(textureProgramInfo.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.vertexAttribPointer(textureProgramInfo.a_position, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureProgramInfo.a_position);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(textureProgramInfo.a_texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureProgramInfo.a_texcoord);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, shadowInfo.depthTexture);
        //设置纹理参数
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();