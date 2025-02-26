import "./demo5.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"
import { mat4 } from "gl-matrix";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo5-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo5 canvas is null");
    }
}

/**
 * @param {WebGLRenderingContext} gl
*/
function draw(gl) {

    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSrouce);
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

    /* 指定使用的程序 */
    gl.useProgram(program);

    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /*节点位置 + 颜色*/
    const vertices = new Float32Array([
        /*pos*/ -0.5, -0.5, -0.5, /*color*/ 0.5, 0.0, 0.0, 1.0,
        /*pos*/  0.5, -0.5, -0.5, /*color*/ 0.0, 0.5, 0.0, 1.0,
        /*pos*/  0.5, 0.5, -0.5, /*color*/ 0.0, 0.0, 0.5, 1.0,
        /*pos*/ -0.5, 0.5, -0.5, /*color*/ 0.5, 0.0, 0.0, 1.0,
        /*pos*/ -0.5, -0.5, 0.5, /*color*/ 0.0, 0.5, 0.0, 1.0,
        /*pos*/  0.5, -0.5, 0.5, /*color*/ 0.0, 0.0, 0.5, 1.0,
        /*pos*/  0.5, 0.5, 0.5, /*color*/ 0.5, 0.0, 0.0, 1.0,
        /*pos*/ -0.5, 0.5, 0.5, /*color*/ 0.0, 0.5, 0.0, 1.0,
    ]);

    const verticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer); // 绑定缓冲

    const a_position = gl.getAttribLocation(program, "a_position"); // 获取GLSL中a_position对应属性位置
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 4 * 7, 0); // 设置属性指针
    gl.enableVertexAttribArray(a_position); // 激活属性

    const a_color = gl.getAttribLocation(program, "a_color"); // 获取GLSL中a_color对应属性位置
    gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 4 * 7, 4 * 3); // 设置属性指针
    gl.enableVertexAttribArray(a_color); // 激活属性

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); // 注入数据

    /*顶点索引数据*/
    const indexBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); //绑定缓冲，顶点索引缓冲需要指定为ELEMENT_ARRAY_BUFFER
    const indices = new Uint8Array([ //索引数组，注意索引从0开始计算，不是1
        0, 2, 3, 0, 1, 2, // 前面
        5, 7, 6, 5, 4, 7, // 背面
        4, 3, 7, 4, 0, 3, // 左面
        1, 6, 2, 1, 5, 6, // 右面
        4, 1, 0, 4, 5, 1, // 底面
        3, 6, 7, 3, 2, 6, // 顶面
    ]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW); //往刚才绑定的缓冲中注入数据

    /* model matrix */
    let modelMtx = mat4.create();
    const modelMtxLoc = gl.getUniformLocation(program, "modelMtx");
    gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx);

    /* view (camera) matrix*/
    const viewMtx = mat4.create();
    mat4.lookAt(viewMtx, [2, 2, 2], [0, 0, 0], [0, 0, 1]);
    const viewMtxMtxLoc = gl.getUniformLocation(program, "viewMtx");
    gl.uniformMatrix4fv(viewMtxMtxLoc, false, viewMtx);

    /* projection matrix */
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 1, 100);
    const projMtxMtxLoc = gl.getUniformLocation(program, "projMtx");
    gl.uniformMatrix4fv(projMtxMtxLoc, false, projMtx);

    // 绘制，每帧使正方体旋转一定角度
    let a = 0;
    function dynamicDraw() {
        // 每次绘制前清理
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 加个小角度
        a = (a + Math.PI / 360) % (Math.PI * 2);
        modelMtx = mat4.create();
        mat4.rotateX(modelMtx, modelMtx, a);
        mat4.rotateY(modelMtx, modelMtx, a);
        mat4.rotateZ(modelMtx, modelMtx, a);
        gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx); // 设置模型矩阵

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0); //使用drawElements方法
        requestAnimationFrame(dynamicDraw);
    }

    requestAnimationFrame(dynamicDraw);

}

main();