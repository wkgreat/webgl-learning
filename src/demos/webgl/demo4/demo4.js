import "./demo4.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"
import imageUrl from './leaves.jpg'

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo4-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo4 canvas is null");
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


    /*几何节点数据 a_position*/
    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    const posAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(posAttributeLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttributeLocation);
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
    const texCoordAttrLocation = gl.getAttribLocation(program, "a_texcoord");
    gl.vertexAttribPointer(texCoordAttrLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttrLocation);
    const texcoords = new Float32Array([
        0, 1,
        1, 0,
        0, 0,
        0, 1,
        1, 1,
        1, 0
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

    /* 纹理 */
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
        //创建纹理
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //设置纹理参数
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //纹理数据
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        //绘制
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

main();