import { mat4 } from "gl-matrix";
import { buildFrustum } from "./frustum.js";
import Scene from "./scene.js";
import { getSunPositionECEF } from "./sun.js";
import { addTileProviderHelper, createTileProgram, createTileProgramBuffer, drawTileMesh, TileProvider } from "./tilerender.js";
import Timer, { addTimeHelper } from "./timer.js";
import "./tinyearth.css";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";

let tinyearth = null;

class TinyEarth {

    /**@type {HTMLCanvasElement|null}*/
    canvas = null;
    /**@type {WebGLRenderingContext}*/
    gl = null;

    /**@type {Scene|null}*/
    scene = null;

    /**@type {Timer|null}*/
    timer = null;

    /**@type {TileProvider|null}*/
    tileProvider = null;

    currentFrameT = 0;

    lastFrameT = 0;

    programInfo = null;

    bufferInfo = null;

    viewWidth = 512;

    viewHeight = 512;

    /**@param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl");
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        this.viewHeight = canvas.height;
        this.viewWidth = canvas.width;
        const that = this;
        window.addEventListener('resize', () => {
            that.canvas.height = that.canvas.clientHeight;
            that.canvas.width = that.canvas.clientWidth;
            that.viewHeight = canvas.height;
            that.viewWidth = canvas.width;
            that.gl.viewport(0, 0, that.viewWidth, that.viewHeight);
        })
    }

    glInit() {
        /*清理及配置*/
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    addScene(scene) {
        this.scene = scene;
    }
    addTimer(timer) {
        this.timer = timer;
    }
    addTileProvider(provider) {
        this.tileProvider = provider;
    }
    addProgramInfo(programInfo) {
        this.programInfo = programInfo;
    }
    addBufferInfo(bufferInfo) {
        this.bufferInfo = bufferInfo;
    }

    draw() {
        this.glInit();

        const programInfo = createTileProgram(this.gl);
        const bufferInfo = createTileProgramBuffer(this.gl);
        this.addProgramInfo(programInfo);
        this.addBufferInfo(bufferInfo);

        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.767335, 32.050471, 1E7]);
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];

        const scene = new Scene({
            camera: {
                from: cameraFrom,
                to: cameraTo,
                up: cameraUp
            },
            projection: {
                fovy: Math.PI / 3,
                near: 0.1,
                far: 1E10
            },
            viewport: {
                width: this.viewWidth,
                height: this.viewHeight
            }
        });

        scene.addCameraControl(tinyearth.canvas);

        this.addScene(scene);

        // const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        const tileProvider = new TileProvider(url, scene.getCamera());
        addTileProviderHelper(document.getElementById("helper"), tileProvider);

        this.addTileProvider(tileProvider);

        const sunPos = getSunPositionECEF();
        this.gl.uniform3f(programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);
        this.gl.uniform4f(programInfo.light.color, 1.0, 1.0, 1.0, 1.0);
        this.gl.uniform3f(programInfo.camera.position, cameraFrom[0], cameraFrom[1], cameraFrom[2]);
        this.gl.uniform4f(programInfo.material.ambient, 0.1, 0.1, 0.1, 1.0);
        this.gl.uniform4f(programInfo.material.diffuse, 1.0, 1.0, 1.0, 1.0);
        this.gl.uniform4f(programInfo.material.specular, 1.0, 1.0, 1.0, 1.0);
        this.gl.uniform4f(programInfo.material.emission, 0.0, 0.0, 0.0, 1.0);
        this.gl.uniform1f(programInfo.material.shininess, 1000);;

        const timer = new Timer(Date.now());
        timer.setMultipler(10000);
        timer.start();
        addTimeHelper(timer, document.getElementById("helper"));

        this.addTimer(timer);

        let that = this;

        function drawFrame(t) {
            that.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            that.gl.clearDepth(1.0);
            that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
            that.scene.setViewWidth(that.viewWidth);
            that.scene.setViewHeight(that.viewHeight);

            const modelMtx = mat4.create();

            const projMtx = that.scene.getProjection().perspective();

            that.currentFrameT = t;
            let dt = Math.trunc((t - that.lastFrameT));
            that.timer.addTime(dt);
            const currentTime = that.timer.getDate();

            const sunPos = getSunPositionECEF(currentTime);

            that.gl.uniform3f(that.programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);

            const frustum = buildFrustum(that.scene.getProjection().perspective(), that.scene.getCamera().getMatrix().viewMtx, that.scene.getCamera().getFrom());
            that.tileProvider.setFrustum(frustum);

            that.tileProvider.tiletree.forEachTilesOfLevel(that.tileProvider.curlevel, (tile) => {
                if (tile && tile.ready) {
                    drawTileMesh(that.gl, that.programInfo, that.bufferInfo, tile, modelMtx, that.scene.getCamera(), projMtx);
                }
            });

            that.lastFrameT = that.currentFrameT;
            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}

function main() {

    const canvas = document.getElementById("tinyearth-canvas");
    if (canvas !== null) {

        tinyearth = new TinyEarth(canvas);
        // draw(tinyearth.gl, tinyearth.canvas);
        tinyearth.draw();
    } else {
        console.log("tinyearth canvas is null");
    }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas 
*/
async function draw(gl, canvas) {

    tinyearth.glInit();

    const programInfo = createTileProgram(gl);
    const bufferInfo = createTileProgramBuffer(gl);

    const modelMtx = mat4.create();
    const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.767335, 32.050471, 1E7]);
    const cameraTo = [0, 0, 0];
    const cameraUp = [0, 0, 1];

    const scene = new Scene({
        camera: {
            from: cameraFrom,
            to: cameraTo,
            up: cameraUp
        },
        projection: {
            fovy: Math.PI / 3,
            near: 0.1,
            far: 1E10
        },
        viewport: {
            width: tinyearth.viewWidth,
            height: tinyearth.viewHeight
        }
    });

    scene.addCameraControl(tinyearth.canvas);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    const url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
    const tileProvider = new TileProvider(url, scene.getCamera());
    addTileProviderHelper(document.getElementById("helper"), tileProvider);

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
        scene.setViewWidth(tinyearth.viewWidth);
        scene.setViewHeight(tinyearth.viewHeight);
        const projMtx = scene.getProjection().perspective();

        currentFrameT = t;
        let dt = Math.trunc((t - lastFrameT));
        timer.addTime(dt);
        const currentTime = timer.getDate();

        const sunPos = getSunPositionECEF(currentTime);

        gl.uniform3f(programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);

        const frustum = buildFrustum(scene.getProjection().perspective(), scene.getCamera().getMatrix().viewMtx, scene.getCamera().getFrom());
        tileProvider.setFrustum(frustum);

        tileProvider.tiletree.forEachTilesOfLevel(tileProvider.curlevel, (tile) => {
            if (tile && tile.ready) {
                drawTileMesh(gl, programInfo, bufferInfo, tile, modelMtx, scene.getCamera(), projMtx);
            }
        });

        lastFrameT = currentFrameT;
        requestAnimationFrame(dynamicDraw);
    }

    requestAnimationFrame(dynamicDraw);



}

main();