import "./demo8.css"
import { mat4, vec3, vec4 } from "gl-matrix";
import skyboxVertSource from "./skybox.vert";
import skyboxFragSource from "./skybox.frag";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo8-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo8 canvas is null");
    }
}

/**
 * @param {WebGLRenderingContext} gl
*/
function skyboxProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, skyboxVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, skyboxFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        u_invProjViewMtx: gl.getUniformLocation(program, "u_invProjViewMtx"),
        u_worldCameraPos: gl.getUniformLocation(program, "u_worldCameraPos"),
        u_skybox: gl.getUniformLocation(program, "u_skybox")
    };
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
async function draw(gl) {

    /* 创建程序 */
    const skyboxProgramInfo = skyboxProgram(gl);

    /* gl环境配置 */
    glConfig(gl);

    //定义转换矩阵============================================================================================
    /* model matrix */
    let modelMtx = mat4.create();

    /* view (camera) matrix*/
    const cameraFrom = vec3.fromValues(1, 1, 1);
    const cameraTo = vec3.fromValues(0, 0, 0);
    const cameraUp = vec3.fromValues(0, 1, 0); //!注意相机的UP方向
    const viewMtx = mat4.create();


    /* projection matrix */
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 1, 2000);


    //天空盒===========================================================================================

    /* 绘制天空盒 */
    /* 指定使用的程序 */
    gl.useProgram(skyboxProgramInfo.program);

    gl.depthFunc(gl.LEQUAL); // !!注意深度测试函数要设置为LEQUAL，不能为LESS，否则深度1会被裁掉

    // NDS空间中z=1的面的顶点坐标
    const skyboxVertices = new Float32Array([
        -1, 1, 1,
        -1, -1, 1,
        1, -1, 1,
        1, -1, 1,
        1, 1, 1,
        -1, 1, 1
    ]);

    // 设置天空盒节点
    const skyboxVerticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVerticesBuffer); // 绑定缓冲
    gl.vertexAttribPointer(skyboxProgramInfo.a_position, 3, gl.FLOAT, false, 0, 0); // 设置属性指针
    gl.enableVertexAttribArray(skyboxProgramInfo.a_position); // 激活属性
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW); // 注入数据

    // 设置天空盒纹理
    const envTexture = gl.createTexture();
    const envFaces = [
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/box_zoom/pos-x.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/box_zoom/neg-x.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/box_zoom/pos-y.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/box_zoom/neg-y.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/box_zoom/pos-z.jpg" },
        { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/box_zoom/neg-z.jpg" },
    ];
    envFaces.forEach((face) => {
        const img = new Image();
        img.src = face.src;
        gl.texImage2D(face.face, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); //立即渲染纹理
        img.onload = function () {
            // 图片加载完成将其拷贝到纹理
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTexture);
            gl.texImage2D(face.face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }
    });

    //动态绘制==============================================================================================
    function dynamicDraw() {
        // 每次绘制前清理
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.depthFunc(gl.LEQUAL);

        // 旋转相机
        vec3.rotateY(cameraTo, cameraTo, cameraFrom, Math.PI / 720);
        mat4.lookAt(viewMtx, cameraFrom, cameraTo, cameraUp);

        // 设置天空盒变量
        gl.uniform3fv(skyboxProgramInfo.u_worldCameraPos, cameraFrom);
        const invProjViewMtx = mat4.create();
        mat4.multiply(invProjViewMtx, projMtx, viewMtx);
        mat4.invert(invProjViewMtx, invProjViewMtx);
        gl.uniformMatrix4fv(skyboxProgramInfo.u_invProjViewMtx, false, invProjViewMtx);

        // 绘制天空盒
        gl.drawArrays(gl.TRIANGLES, 0, skyboxVertices.length / 3);

        //
        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();

}

main();