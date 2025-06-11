import "./demo9.css"
import { mat4, vec3 } from "gl-matrix";
import { createEnvBoxProgram, createEnvBoxBuffer, drawEnvBox } from "./envbox.js";
import { createSkyBoxBuffer, createSkyBoxProgram, drawSkybox } from "./skybox.js";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo9-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo9 canvas is null");
    }
}

function glConfig(gl) {
    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL); //!!注意深度测试函数要设置为LEQUAL，不能为LESS，否则深度1会被裁掉
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * @param {WebGLRenderingContext} gl
*/
async function draw(gl) {

    //环境配置====================================================================================
    glConfig(gl);

    //纹理========================================================================================
    const envFaces = [
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/box_zoom/pos-x.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/box_zoom/neg-x.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/box_zoom/pos-y.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/box_zoom/neg-y.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/box_zoom/pos-z.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/box_zoom/neg-z.jpg" },
    ];
    // 设置天空盒纹理
    const envTexture = gl.createTexture();
    envFaces.forEach((face) => {
        const img = new Image();
        img.src = face.src;
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTexture);
        gl.texImage2D(face.face, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); //立即渲染纹理
        img.onload = function () {
            // 图片加载完成将其拷贝到纹理
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTexture);
            gl.texImage2D(face.face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }
    });

    //程序========================================================================================

    const skyboxProgramInfo = createSkyBoxProgram(gl); //天空盒程序
    const skyboxBufferInfo = createSkyBoxBuffer(gl); //天空盒缓冲

    const envBoxProgramInfo = createEnvBoxProgram(gl); //环境贴图程序
    const envBoxBufferInfo = createEnvBoxBuffer(gl); //创建环境贴图缓冲

    //定义转换矩阵============================================================================================
    /* model matrix */
    let modelMtx = mat4.create();

    /* view (camera) matrix*/
    const cameraFrom = vec3.fromValues(1, 1, 1);
    const cameraTo = vec3.fromValues(0, 0, 0);
    const cameraUp = vec3.fromValues(0, 1, 0); //!注意相机的UP方向
    const viewMtx = mat4.create();
    mat4.lookAt(viewMtx, cameraFrom, cameraTo, cameraUp);

    /* projection matrix */
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 100);


    //动态绘制==============================================================================================
    function dynamicDraw() {
        // 每次绘制前清理
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 相机旋转
        vec3.rotateY(cameraFrom, cameraFrom, cameraTo, Math.PI / 1800);
        mat4.lookAt(viewMtx, cameraFrom, cameraTo, cameraUp);

        // 模型旋转
        mat4.rotateX(modelMtx, modelMtx, Math.PI / 1800);
        mat4.rotateY(modelMtx, modelMtx, Math.PI / 1800);
        mat4.rotateZ(modelMtx, modelMtx, Math.PI / 1800);

        //天空盒
        gl.useProgram(skyboxProgramInfo.program);
        drawSkybox(gl, skyboxProgramInfo, skyboxBufferInfo, cameraFrom, modelMtx, viewMtx, projMtx);

        //环境贴图
        gl.useProgram(envBoxProgramInfo.program);
        drawEnvBox(gl, envBoxProgramInfo, envBoxBufferInfo, cameraFrom, modelMtx, viewMtx, projMtx);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();

}

main();