import { mat4 } from "gl-matrix";
import "./demo14.css"
import Camera, { CameraMouseControl } from "../common/camera";
import { createLineMesh, createLineProgram, createPointProgram, createPoints, drawLine, drawPoint, lineBindBuffer, pointBindBuffer } from "../common/webglutils";
import { pointCouldFromCSV } from "./pointcloud";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo14-canvas");
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
        console.log("demo14 canvas is null");
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
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    const thepath = "assets/data/pointcloud/dragon.csv"
    const pointcloud = await pointCouldFromCSV(thepath);
    console.log(pointcloud);
    // console.log(`pointcloud: ${pointcloud.slice}`);

    //axis
    const lineProgramInfo = createLineProgram(gl);
    const xline = createLineMesh(gl, [-40, 0, 0, 40, 0, 0], [1.0, 0.0, 0.0, 1.0]);
    const yline = createLineMesh(gl, [0, -40, 0, 0, 40, 0], [0.0, 1.0, 0.0, 1.0]);
    const zline = createLineMesh(gl, [0, 0, -40, 0, 0, 40], [0.0, 0.0, 1.0, 1.0]);
    lineBindBuffer(gl, xline);
    lineBindBuffer(gl, yline);
    lineBindBuffer(gl, zline);

    //point
    const pointProgramInfo = createPointProgram(gl);
    const dragon = createPoints(gl, pointcloud.positions, [1.0, 0.0, 0.0, 1.0], 1);
    pointBindBuffer(gl, dragon);

    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([100, 100, 100], [0, 0, 0], [0, 1, 0]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();

    const loadingDiv = document.getElementById("loading-div");
    if (loadingDiv) {
        loadingDiv.remove();
    }

    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 1000);

        // draw axis
        gl.useProgram(lineProgramInfo.program);
        gl.uniformMatrix4fv(lineProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(lineProgramInfo.u_projMtx, false, projMtx);
        drawLine(gl, lineProgramInfo, xline);
        drawLine(gl, lineProgramInfo, yline);
        drawLine(gl, lineProgramInfo, zline);

        //draw point cloud
        gl.useProgram(pointProgramInfo.program);
        gl.uniformMatrix4fv(pointProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(pointProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(pointProgramInfo.u_projMtx, false, projMtx);
        drawPoint(gl, pointProgramInfo, dragon);


        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();


}

main();