import "./demo2.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo2-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo2 canvas is null");
    }
}

/**
 * @param {WebGLRenderingContext} gl
*/
function draw(gl) {

    /* 创建程序 */
    const program = gl.createProgram();

    gl.viewport(0, 0, width, height);

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

    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /*几何节点数据*/
    const vertices = new Float32Array([
        0.5, 0.5, 0.0, 1.0,
        -0.5, 0.5, 0.0, 1.0,
        0.5, -0.5, 0.0, 1.0
    ]);
    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    /* 节点颜色数据*/
    const colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0, //red
        0.0, 1.0, 0.0, 1.0, //green
        0.0, 0.0, 1.0, 1.0  //blue
    ]);
    const colorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    /* 指定使用的程序 */
    gl.useProgram(program);

    /* 绘制 */
    gl.drawArrays(gl.TRIANGLES, 0, 4);


}

main();