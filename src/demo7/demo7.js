import "./demo7.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"
import { mat4 } from "gl-matrix";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo7-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl);
    } else {
        console.log("demo7 canvas is null");
    }
}

async function readCube() {

    const response = await fetch("assets/data/cube.obj");
    const text = await response.text();
    console.log(text);

    const vs = []
    const vns = []
    let vertices = []

    for (let line of text.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === "v") {
            vs.push(parts.slice(1).map(parseFloat));
        } else if (parts[0] === "vn") {
            vns.push(parts.slice(1).map(parseFloat));
        } else if (parts[0] === "f") {
            const ps = parts.slice(1).map((p) => p.split("/"))
            for (let i = 0; i < 3; i++) {
                vertices = vertices.concat(vs[parseInt(ps[i][0]) - 1]);
                vertices = vertices.concat(vns[parseInt(ps[i][2]) - 1]);
            }
        }
    }

    vertices = vertices.map((v) => v / 2);
    return new Float32Array(vertices);

}

/**
 * @param {WebGLRenderingContext} gl
*/
async function draw(gl) {

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


    /*正方形节点*/
    // const vertices = await readCube();
    const vertices = new Float32Array([
        -0.5, -0.5, -0.5, 0, 0, -1,
        -0.5, 0.5, -0.5, 0, 0, -1,
        0.5, -0.5, -0.5, 0, 0, -1,
        -0.5, 0.5, -0.5, 0, 0, -1,
        0.5, 0.5, -0.5, 0, 0, -1,
        0.5, -0.5, -0.5, 0, 0, -1,

        -0.5, -0.5, 0.5, 0, 0, 1,
        0.5, -0.5, 0.5, 0, 0, 1,
        -0.5, 0.5, 0.5, 0, 0, 1,
        -0.5, 0.5, 0.5, 0, 0, 1,
        0.5, -0.5, 0.5, 0, 0, 1,
        0.5, 0.5, 0.5, 0, 0, 1,

        -0.5, 0.5, -0.5, 0, 1, 0,
        -0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, -0.5, 0, 1, 0,
        -0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, 0.5, 0, 1, 0,
        0.5, 0.5, -0.5, 0, 1, 0,

        -0.5, -0.5, -0.5, 0, -1, 0,
        0.5, -0.5, -0.5, 0, -1, 0,
        -0.5, -0.5, 0.5, 0, -1, 0,
        -0.5, -0.5, 0.5, 0, -1, 0,
        0.5, -0.5, -0.5, 0, -1, 0,
        0.5, -0.5, 0.5, 0, -1, 0,

        -0.5, -0.5, -0.5, -1, 0, 0,
        -0.5, -0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, -0.5, -1, 0, 0,
        -0.5, -0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, 0.5, -1, 0, 0,
        -0.5, 0.5, -0.5, -1, 0, 0,

        0.5, -0.5, -0.5, 1, 0, 0,
        0.5, 0.5, -0.5, 1, 0, 0,
        0.5, -0.5, 0.5, 1, 0, 0,
        0.5, -0.5, 0.5, 1, 0, 0,
        0.5, 0.5, -0.5, 1, 0, 0,
        0.5, 0.5, 0.5, 1, 0, 0,
    ]);

    const verticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer); // 绑定缓冲

    const a_position = gl.getAttribLocation(program, "a_position"); // 获取GLSL中a_position对应属性位置
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 4 * 6, 0); // 设置属性指针
    gl.enableVertexAttribArray(a_position); // 激活属性

    const a_normal = gl.getAttribLocation(program, "a_normal"); // 获取GLSL中a_normal对应属性位置
    gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 4 * 6, 4 * 3); // 设置属性指针
    gl.enableVertexAttribArray(a_normal); // 激活属性

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); // 注入数据

    /* model matrix */
    let modelMtx = mat4.create();
    const modelMtxLoc = gl.getUniformLocation(program, "modelMtx");
    gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx);

    /* view (camera) matrix*/
    const cameraFrom = [1, 1, 1];
    const cameraTo = [0, 0, 0];
    const cameraUp = [0, 1, 0]; //!注意相机的UP方向
    const viewMtx = mat4.create();
    mat4.lookAt(viewMtx, cameraFrom, cameraTo, cameraUp);
    const viewMtxMtxLoc = gl.getUniformLocation(program, "viewMtx");
    gl.uniformMatrix4fv(viewMtxMtxLoc, false, viewMtx);
    const worldCameraPos = gl.getUniformLocation(program, "u_worldCameraPos");
    gl.uniform3fv(worldCameraPos, cameraFrom);

    /* projection matrix */
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 100);
    const projMtxMtxLoc = gl.getUniformLocation(program, "projMtx");
    gl.uniformMatrix4fv(projMtxMtxLoc, false, projMtx);

    // 环境贴图
    const envTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTexture);
    // const envFaces = [
    //     { face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/daylight_box/daylight_box_right.bmp" },
    //     { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/daylight_box/daylight_box_left.bmp" },
    //     { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/daylight_box/daylight_box_top.bmp" },
    //     { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/daylight_box/daylight_box_bottom.bmp" },
    //     { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/daylight_box/daylight_box_front.bmp" },
    //     { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/daylight_box/daylight_box_back.bmp" },
    // ];
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

    // 绘制，每帧使正方体旋转一定角度
    let a = 0;
    function dynamicDraw() {
        // 每次绘制前清理
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 加个小角度
        a = (a + Math.PI / 1800) % (Math.PI * 2);
        modelMtx = mat4.create();
        mat4.rotateX(modelMtx, modelMtx, a);
        mat4.rotateY(modelMtx, modelMtx, a);
        mat4.rotateZ(modelMtx, modelMtx, a);
        gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx); // 设置模型矩阵

        gl.drawArrays(gl.TRIANGLES, 0, vertices.length); //使用drawElements方法
        requestAnimationFrame(dynamicDraw);
    }

    requestAnimationFrame(dynamicDraw);

}

main();