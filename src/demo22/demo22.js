import { mat4 } from "gl-matrix";
import { drawLine, drawMesh } from "../common/webglutils.js";
import "./demo22.css";
import fragSource from "./frag.glsl";
import vertSource from "./vert.glsl";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo22-canvas");
    if (canvas !== null) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        height = canvas.height;
        width = canvas.width;
        const gl = canvas.getContext("webgl2");
        window.addEventListener('resize', () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            height = canvas.height;
            width = canvas.width;
            gl.viewport(0, 0, width, height);
        })
        draw(gl, canvas);
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

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program failed to link:', gl.getProgramInfoLog(program));
    }

    return {
        program: program
    };

}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    const programInfo = createProgram(gl, vertSource, fragSource);

    const ninstance = 100;
    const offsets = [];
    for (let i = 0; i < ninstance; i++) {
        offsets.push(Math.random() * 2, Math.random() * 2);
    }

    function dynamicDraw() {

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        const vertices = new Float32Array([
            -0.9, -0.9, 0.0,
            -0.8, -0.9, 0.0,
            -0.8, -0.8, 0.0
        ]);

        const verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const posAttributeLocation = gl.getAttribLocation(programInfo.program, "a_position");
        gl.vertexAttribPointer(posAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posAttributeLocation);

        const offsetBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);

        const a_offset = gl.getAttribLocation(programInfo.program, "a_offset");
        gl.vertexAttribPointer(a_offset, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_offset);
        gl.vertexAttribDivisor(a_offset, 1);

        gl.useProgram(programInfo.program);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 9, ninstance);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();