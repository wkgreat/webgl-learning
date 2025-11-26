import { mat4 } from "gl-matrix";
import "./demo15.css"
import Camera, { CameraMouseControl } from "../common/camera.js";
import { createPointCloudPorgram, drawPointCloud, PointCloud, PointCloudSetData } from "./pointcloud.js";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo15-canvas");
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
        console.log("demo15 canvas is null");
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

    const colormap = {
        field: "classification",
        cmap: {
            1: [1.0, 1.0, 1.0, 1.0],
            2: [242 / 255.0, 149 / 255.0, 0.0, 1.0],
            3: [209 / 255.0, 255 / 255.0, 196 / 255.0, 1.0],
            4: [181 / 255.0, 255 / 255.0, 140 / 255.0, 1.0],
            5: [145 / 255.0, 255 / 255.0, 78 / 255.0, 1.0],
            6: [245 / 255.0, 103 / 255.0, 93 / 255.0, 1.0],
            9: [95 / 255.0, 189 / 255.0, 183 / 255.0, 1.0],
            17: [244 / 255.0, 87 / 255.0, 230 / 255.0, 1.0]
        }
    }

    // point cloud
    const uri = "assets/data/pointcloud/swisssurface3d_2601_1199_EPSG3857_samples.csv"
    const pointcloudObj = new PointCloud();
    await pointcloudObj.frowCSV(uri);

    const pointCloudProgramInfo = createPointCloudPorgram(gl);
    const pointcloud = pointcloudObj.toMesh(colormap);
    PointCloudSetData(gl, pointCloudProgramInfo, pointcloud);

    //uniform
    const modelMtx = mat4.create();
    const from = [pointcloud.center[0] + 100, pointcloud.center[1] + 100, pointcloud.center[2] + 100];
    const to = pointcloud.center;
    const camera = new Camera(from, to, [0, 0, 1]); // 相机对象
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

        //draw point cloud
        gl.useProgram(pointCloudProgramInfo.program);
        gl.uniformMatrix4fv(pointCloudProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(pointCloudProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(pointCloudProgramInfo.u_projMtx, false, projMtx);
        drawPointCloud(gl, pointCloudProgramInfo, pointcloud);

        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();

}

main();