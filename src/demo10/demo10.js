import { vec3, vec4, mat4, mat3 } from "gl-matrix";
import "./demo10.css"
import { createSphereBuffer, createSphereProgram, drawSphere, setSphereBufferData } from "./sphere.js";
import { ObjProvider } from "../common/objreader.js";
import Camera, { CameraMouseControl } from "./camera.js";

const width = 1000;
const height = 500;

function main() {
    const canvas = document.getElementById("demo10-canvas");
    if (canvas !== null) {
        canvas.height = height;
        canvas.width = width;
        const gl = canvas.getContext("webgl");
        draw(gl, canvas);
    } else {
        console.log("demo10 canvas is null");
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

async function genSpheres() {
    const provider = new ObjProvider("assets/data/sphere.obj");
    const meshes = await provider.fetchObjVertex();
    let mesh = meshes[0];
    let spheres = {
        vertices: mesh.vertices,
        worldmtx: mat4.create(),
        localmtx: mat4.translate(mat4.create(), mat4.create(), [0, 0, 0]),
        color: [1, 0, 0, 1],
        move: (that) => {
            mat4.rotateY(that.localmtx, that.localmtx, Math.PI / 1800);
        },
        children: [
            {
                vertices: mesh.vertices,
                worldmtx: null,
                localmtx: mat4.translate(mat4.create(), mat4.create(), [20, 0, 20]),
                color: [0, 1, 0, 1],
                move: (that) => {
                    mat4.rotateY(that.localmtx, that.localmtx, Math.PI / 180);
                },
                children: [{
                    vertices: mesh.vertices,
                    worldmtx: null,
                    localmtx: mat4.translate(mat4.create(), mat4.create(), [5, 0, 5]),
                    color: [0, 0, 1, 1],
                    move: (that) => {
                        mat4.rotateY(that.localmtx, that.localmtx, Math.PI / 360);
                    },
                    children: []
                }]
            }
        ]
    }
    return spheres;
}


function drawSpheres(sphere, worldmtx, gl, programInfo, bufferInfo, viewMtx, projMtx) {
    sphere.move(sphere);

    sphere.worldmtx = mat4.create();

    mat4.multiply(sphere.worldmtx, worldmtx, sphere.localmtx);

    setSphereBufferData(gl, bufferInfo, new Float32Array(sphere.vertices));

    drawSphere(gl, programInfo, bufferInfo, sphere.worldmtx, viewMtx, projMtx, sphere.color);

    for (let child of sphere.children) {
        drawSpheres(child, sphere.worldmtx, gl, programInfo, bufferInfo, viewMtx, projMtx);
    }
};

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas 
*/
async function draw(gl, canvas) {

    glConfig(gl);

    const programInfo = createSphereProgram(gl);
    const bufferInfo = createSphereBuffer(gl);

    const worldmtx = mat4.create();

    const camera = new Camera([50, 50, 50], [0, 0, 0], [0, 1, 0]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();

    const projMtx = mat4.create();
    mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000);

    const spheres = await genSpheres();

    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawSpheres(spheres, worldmtx, gl, programInfo, bufferInfo, camera.getMatrix().viewMtx, projMtx);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();