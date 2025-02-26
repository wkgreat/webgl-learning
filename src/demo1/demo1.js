import "./demo1.css"

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo1-canvas");
    if (canvas !== null) {
        //需要配置canvas尺寸
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {Elemnt} canvas
*/
function draw(gl) {

    /* 定义着色器 */
    const vertSrouce = `
    attribute vec4 a_position;
    attribute vec4 a_color;
    varying vec4 v_color;

    void main(){
        gl_Position = a_position;
        v_color = a_color;
    }
    `;
    const fragSource = `
    varying lowp vec4 v_color;
    void main(){
        gl_FragColor = v_color;
    }
    `;

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

    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, width, height); // 设置视口
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /*几何节点数据*/
    const vertices = new Float32Array([
        0.5, 0.5, 0.0, 1.0,
        -0.5, 0.5, 0.0, 1.0,
        0.5, -0.5, 0.0, 1.0
    ]);
    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); // STATIC_DRAW:数据不会或几乎不会改变
    const posAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(posAttributeLocation, 4, gl.FLOAT, false, 0, 0); // index, size, type, normalized, stride, offset
    gl.enableVertexAttribArray(posAttributeLocation);

    /* 节点颜色数据*/
    const colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0, //red
        0.0, 1.0, 0.0, 1.0, //green
        0.0, 0.0, 1.0, 1.0  //blue
    ]);
    const colorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    const colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorAttributeLocation);

    /* 指定使用的程序 */
    gl.useProgram(program);

    /* 绘制 
        gl.drawArrays(mode, first, count);
        https://juejin.cn/post/6992934014411620365
    */
    gl.drawArrays(gl.TRIANGLES, 0, 4); // 从第0个顶点开始，绘制4个顶点


}

main();