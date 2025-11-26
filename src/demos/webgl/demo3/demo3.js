import "./demo3.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo3-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo3 canvas is null");
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

    /* 指定使用的程序 */
    gl.useProgram(program);

    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /*几何节点数据 a_position*/
    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    const posAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(posAttributeLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttributeLocation);

    //Color Uniform 
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");

    const draw_random_triangle = () => {
        // 生成随机三角形
        const p1 = [Math.random() * 2 - 1, Math.random() * 2 - 1, 0.0];
        const p2 = [Math.random() * 2 - 1, Math.random() * 2 - 1, 0.0];
        const p3 = [Math.random() * 2 - 1, Math.random() * 2 - 1, 0.0];
        const vertices = new Float32Array([
            ...p1, 1.0,
            ...p2, 1.0,
            ...p3, 1.0
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // 设置颜色
        gl.uniform4fv(colorUniformLocation, [Math.random(), Math.random(), Math.random(), 1.0]);

        /* 绘制 */
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);

    }

    /*
    循环绘制100个随机三角形
    */
    for (let i = 0; i < 100; ++i) {
        draw_random_triangle();
    }
}

main();