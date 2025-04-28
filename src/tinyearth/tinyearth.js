import "./tinyearth.css"
import { TileMesher, TileSource } from "./maptiler";
import { createTileProgram, createTileProgramBuffer, drawTileMesh } from "./tilerender";
import { EPSG_4326, EPSG_4978 } from "./proj";
import { mat4 } from "gl-matrix";
import Camera, { CameraMouseControl } from "./camera";
import proj4 from "proj4";
import Projection from "./projection";

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("tinyearth-canvas");
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
        console.log("tinyearth canvas is null");
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

    const programInfo = createTileProgram(gl);
    const bufferInfo = createTileProgramBuffer(gl);
    const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    const tileSource = new TileSource(url);

    const modelMtx = mat4.create();
    const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
    const cameraTo = [0, 0, 0];
    const cameraUp = [0, 0, 1];
    const camera = new Camera(cameraFrom, cameraTo, cameraUp);
    const control = new CameraMouseControl(camera, canvas);
    control.enable();

    const projection = new Projection(Math.PI / 3, width / height, 0.1, 1E10);

    console.log(projection.getViewFrustum());

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const meshes = [];

    tileSource.fetchTilesOfLevelAsync(3, (tile) => {
        meshes.push(TileMesher.toMesh(tile, 4, EPSG_4978));
    });

    function dynamicDraw() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        projection.setAspect(width / height);
        const projMtx = projection.perspective();
        for (let mesh of meshes) {
            drawTileMesh(gl, programInfo, bufferInfo, mesh, modelMtx, camera, projMtx);
        }
        requestAnimationFrame(dynamicDraw);
    }

    dynamicDraw();



}

main();