import "./tinyearth.css"
import { TileMesher, TileSource } from "./maptiler";
import { createTileProgram, createTileProgramBuffer, drawTileMesh, TileProvider } from "./tilerender";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj";
import { mat4 } from "gl-matrix";
import Camera, { CameraMouseControl } from "./camera";
import proj4 from "proj4";
import Projection from "./projection";
import { getSunPositionECEF } from "./sun";
import Timer, { addTimeHelper } from "./timer";

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
    // const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    // const tileSource = new TileSource(url);

    const modelMtx = mat4.create();
    const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
    const cameraTo = [0, 0, 0];
    const cameraUp = [0, 0, 1];
    const camera = new Camera(cameraFrom, cameraTo, cameraUp);
    const control = new CameraMouseControl(camera, canvas);
    control.enable();

    const projection = new Projection(Math.PI / 3, width / height, 0.1, 1E10);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const meshes = [];

    const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    const tileProvider = new TileProvider(url, camera);

    // tileSource.fetchTilesOfLevelAsync(3, (tile) => {
    //     meshes.push(TileMesher.toMesh(tile, 4, EPSG_4978));
    // });

    const sunPos = getSunPositionECEF();
    gl.uniform3f(programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);
    gl.uniform4f(programInfo.light.color, 1.0, 1.0, 1.0, 1.0);
    gl.uniform3f(programInfo.camera.position, cameraFrom[0], cameraFrom[1], cameraFrom[2]);
    gl.uniform4f(programInfo.material.ambient, 0.1, 0.1, 0.1, 1.0);
    gl.uniform4f(programInfo.material.diffuse, 1.0, 1.0, 1.0, 1.0);
    gl.uniform4f(programInfo.material.specular, 1.0, 1.0, 1.0, 1.0);
    gl.uniform4f(programInfo.material.emission, 0.0, 0.0, 0.0, 1.0);
    gl.uniform1f(programInfo.material.shininess, 1000);;

    const timer = new Timer(Date.now());
    timer.setMultipler(10000);
    timer.start();
    addTimeHelper(timer, document.getElementById("helper"));

    let currentFrameT = 0;
    let lastFrameT = 0;

    function dynamicDraw(t) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        projection.setAspect(width / height);
        const projMtx = projection.perspective();

        currentFrameT = t;
        let dt = Math.trunc((t - lastFrameT));
        timer.addTime(dt);
        const currentTime = timer.getDate();

        const sunPos = getSunPositionECEF(currentTime);

        gl.uniform3f(programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);

        for (let mesh of tileProvider.getMeshes()) {
            drawTileMesh(gl, programInfo, bufferInfo, mesh, modelMtx, camera, projMtx);
        }

        lastFrameT = currentFrameT;
        requestAnimationFrame(dynamicDraw);
    }

    requestAnimationFrame(dynamicDraw);



}

main();