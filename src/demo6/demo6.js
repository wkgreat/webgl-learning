import "./demo6.css"
import vertSrouce from "./vert.glsl"
import fragSource from "./frag.glsl"
import { mat4 } from "gl-matrix";
import { ObjMesh, ObjProvider } from "../common/objreader";
import GLProgram from "./glprogram";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo6-canvas");
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
        console.log("demo6 canvas is null");
    }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {GLProgram} program 
 * @param {WebGLBuffer} buffer
 * @param {WebGLTexture} textureBuffer
 * @param {ObjMesh[]} mesh   
*/
function draw_mesh(gl, program, buffer, textureBuffer, meshes) {
    for (let mesh of meshes) {

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // 绑定缓冲
        //position
        gl.vertexAttribPointer(program.positionLoc, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, 0); // 设置属性指针
        gl.enableVertexAttribArray(program.positionLoc);
        //texcoord
        gl.vertexAttribPointer(program.texcoordLoc, 2, gl.FLOAT, false, (3 + 2 + 3) * 4, 3 * 4); // 设置属性指针
        gl.enableVertexAttribArray(program.texcoordLoc);
        //normal
        gl.vertexAttribPointer(program.normalLoc, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, (3 + 2) * 4); // 设置属性指针
        gl.enableVertexAttribArray(program.normalLoc);
        //inject data
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW); // 注入数据

        //Material
        const u_materialAmbientLoc = gl.getUniformLocation(program.program, "material.ambient");
        const u_materialDiffuseLoc = gl.getUniformLocation(program.program, "material.diffuse");
        const u_materialSpecularLoc = gl.getUniformLocation(program.program, "material.specular");
        const u_materialEmissionLoc = gl.getUniformLocation(program.program, "material.emission");
        const u_materialShininessLoc = gl.getUniformLocation(program.program, "material.shininess");
        const material = mesh.getMaterial();

        gl.uniform4f(u_materialAmbientLoc, material.Ka[0], material.Ka[1], material.Ka[2], 1);
        gl.uniform4f(u_materialDiffuseLoc, material.Kd[0], material.Kd[1], material.Kd[2], 1);
        gl.uniform4f(u_materialSpecularLoc, material.Ks[0], material.Ks[1], material.Ks[2], 1);
        gl.uniform4f(u_materialEmissionLoc, material.Ke[0], material.Ke[1], material.Ke[2], 1);
        gl.uniform1f(u_materialShininessLoc, material.Ns);

        //纹理数据
        // 为什么在封装类里面的location为空？？
        const u_usetextureLoc = program.gl.getUniformLocation(program.program, "u_useTexture");
        const textureImage = mesh.getTexture();
        if (textureImage === null) {
            gl.uniform1i(u_usetextureLoc, 0);
        } else {
            gl.uniform1i(u_usetextureLoc, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

            /*
                着色器调用 texture2D(t, st) 方法从纹理中取色时，
                传入的取色坐标 st 的原点是左下角。换言之，如果传入的坐标是 (0, 0)，
                那么 OpenGL 期望取到的是左下角的那个像素的颜色。
                由于在 Web 上图片数据的存储是从左上角开始的，传入坐标 (0,0) 时，
                实际上会取到左上角坐标的值。如果我们设置了 FlipY 配置项，
                那么在向纹理中加载数据的时候，就会对数据作一次翻转，使纹理坐标原点变为左下角。
            */
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);


        }

        gl.drawArrays(gl.TRIANGLES, 0, mesh.vertices.length / 8);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('WebGL error code:', error, "length: ", mesh.vertices.length / 3);
        }

    }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {GLProgram} program
 * @description 设置光照
*/
function lightSettings(gl, program) {
    const u_lightPosLoc = gl.getUniformLocation(program.program, "light.position");
    const u_lightColorLoc = gl.getUniformLocation(program.program, "light.color");
    const inputLightX = document.getElementById("lgt-pos-x");
    const inputLightY = document.getElementById("lgt-pos-y");
    const inputLightZ = document.getElementById("lgt-pos-z");
    let lightPos = [inputLightX.value, inputLightY.value, inputLightZ.value];
    gl.uniform3fv(u_lightPosLoc, lightPos);
    gl.uniform4fv(u_lightColorLoc, [1.0, 1.0, 1.0, 1.0]);
    inputLightX.addEventListener("input", (e) => {
        lightPos[0] = e.target.value;
        gl.uniform3fv(u_lightPosLoc, lightPos);
    });
    inputLightY.addEventListener("input", (e) => {
        lightPos[1] = e.target.value;
        gl.uniform3fv(u_lightPosLoc, lightPos);
    });
    inputLightZ.addEventListener("input", (e) => {
        lightPos[2] = e.target.value;
        gl.uniform3fv(u_lightPosLoc, lightPos);
    });
}

/**
 * @param {WebGLRenderingContext} gl
*/
async function draw(gl) {

    // 配置程序
    // const program = genProgram(gl);
    const program = new GLProgram(gl, vertSrouce, fragSource);
    gl.useProgram(program.program);

    // 配置
    gl.enable(gl.DEPTH_TEST); //启动深度检测
    gl.depthFunc(gl.LEQUAL); //设置深度函数
    gl.enable(gl.CULL_FACE); //启动背面剔除
    gl.viewport(0, 0, width, height); //设置视口

    // 读取obj节点数据
    const objpath = "assets/data/f16/F16fin.obj"
    const provider = new ObjProvider(objpath);
    let meshes = await provider.fetchObjVertex();

    //节点缓冲
    const verticesBuffer = gl.createBuffer(); // 创建缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer); // 绑定缓冲
    const a_position = gl.getAttribLocation(program.program, "a_position"); // 获取GLSL中a_position对应属性位置

    //纹理缓冲
    const textureBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureBuffer);
    //设置纹理参数
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    /* model matrix */
    let modelMtx = mat4.create();
    const modelMtxLoc = gl.getUniformLocation(program.program, "modelMtx");
    gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx);

    /* view (camera) matrix*/
    const viewMtx = mat4.create();
    mat4.lookAt(viewMtx, [-100, 100, 100], [0, 0, 0], [0, 1, 0]);
    const viewMtxMtxLoc = gl.getUniformLocation(program.program, "viewMtx");
    gl.uniformMatrix4fv(viewMtxMtxLoc, false, viewMtx);

    /* projection matrix */
    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.1, 1000);
    const projMtxMtxLoc = gl.getUniformLocation(program.program, "projMtx");
    gl.uniformMatrix4fv(projMtxMtxLoc, false, projMtx);

    // nds -> view matrix
    const invProjMtx = mat4.create();
    mat4.invert(invProjMtx, projMtx);
    const invProjMtxLoc = gl.getUniformLocation(program.program, "invProjMtx");
    gl.uniformMatrix4fv(invProjMtxLoc, false, invProjMtx);

    // normal from local to view
    const normalModelViewMtx = mat4.create();
    const normalModelViewMtxLoc = gl.getUniformLocation(program.program, "normalModelViewMtx");

    //light
    lightSettings(gl, program);

    // 绘制，每帧使物体旋转一定角度
    let a = 0;
    function dynamicDraw() {
        // 每次绘制前清理
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //更新projection
        const projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 0.1, 1000);
        const projMtxMtxLoc = gl.getUniformLocation(program.program, "projMtx");
        gl.uniformMatrix4fv(projMtxMtxLoc, false, projMtx);

        // 加个小角度
        a = (a + Math.PI / (180 * 2)) % (Math.PI * 2);
        modelMtx = mat4.create();
        mat4.rotateY(modelMtx, modelMtx, a);
        gl.uniformMatrix4fv(modelMtxLoc, false, modelMtx); // 设置模型矩阵

        // 更新normalModelViewMtx
        mat4.multiply(normalModelViewMtx, viewMtx, modelMtx);
        mat4.invert(normalModelViewMtx, normalModelViewMtx);
        mat4.transpose(normalModelViewMtx, normalModelViewMtx);
        gl.uniformMatrix4fv(normalModelViewMtxLoc, false, normalModelViewMtx);

        //绘制每个meshes
        draw_mesh(gl, program, verticesBuffer, textureBuffer, meshes);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();

}

main();