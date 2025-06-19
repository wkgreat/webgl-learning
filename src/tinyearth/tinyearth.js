import { mat4 } from "gl-matrix";
import { buildFrustum } from "./frustum.js";
import Scene from "./scene.js";
import { getSunPositionECEF } from "./sun.js";
import { addTileProviderHelper, createTileProgram, createTileProgramBuffer, drawTileMesh, TileProvider } from "./tilerender.js";
import Timer, { addTimeHelper, EVENT_TIMER_TICK } from "./timer.js";
import "./tinyearth.css";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import EventBus from "./event.js";

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

    programInfo = null;

    bufferInfo = null;

    viewWidth = 512;

    viewHeight = 512;

    eventBus = null;

    /**@param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl");
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        this.viewHeight = canvas.height;
        this.viewWidth = canvas.width;
        const that = this;
        this.eventBus = new EventBus();
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
        this.timer.setEventBus(this.eventBus);
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

        let that = this;

        this.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (timer) => {
                if (timer === that.timer) {
                    const sunPos = getSunPositionECEF(timer.getDate());
                    that.gl.uniform3f(that.programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);
                }
            }
        });

        function drawFrame(t) {
            that.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            that.gl.clearDepth(1.0);
            that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
            that.scene.setViewWidth(that.viewWidth);
            that.scene.setViewHeight(that.viewHeight);

            const modelMtx = mat4.create();
            const projMtx = that.scene.getProjection().perspective();

            const frustum = buildFrustum(that.scene.getProjection().perspective(), that.scene.getCamera().getMatrix().viewMtx, that.scene.getCamera().getFrom());
            that.tileProvider.setFrustum(frustum);

            that.timer.tick(t);

            that.tileProvider.tiletree.forEachTilesOfLevel(that.tileProvider.curlevel, (tile) => {
                if (tile && tile.ready) {
                    drawTileMesh(that.gl, that.programInfo, that.bufferInfo, tile, modelMtx, that.scene.getCamera(), projMtx);
                }
            });

            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}

function main() {

    const canvas = document.getElementById("tinyearth-canvas");
    if (canvas !== null) {

        tinyearth = new TinyEarth(canvas);

        const programInfo = createTileProgram(tinyearth.gl);
        const bufferInfo = createTileProgramBuffer(tinyearth.gl);
        tinyearth.addProgramInfo(programInfo);
        tinyearth.addBufferInfo(bufferInfo);

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

        tinyearth.addScene(scene);

        // const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        const tileProvider = new TileProvider(url, tinyearth.scene.getCamera());
        addTileProviderHelper(document.getElementById("helper"), tileProvider);

        tinyearth.addTileProvider(tileProvider);

        const sunPos = getSunPositionECEF();

        tinyearth.gl.uniform3f(programInfo.light.position, sunPos.x, sunPos.y, sunPos.z);
        tinyearth.gl.uniform4f(programInfo.light.color, 1.0, 1.0, 1.0, 1.0);
        tinyearth.gl.uniform3f(programInfo.camera.position, cameraFrom[0], cameraFrom[1], cameraFrom[2]);
        tinyearth.gl.uniform4f(programInfo.material.ambient, 0.1, 0.1, 0.1, 1.0);
        tinyearth.gl.uniform4f(programInfo.material.diffuse, 1.0, 1.0, 1.0, 1.0);
        tinyearth.gl.uniform4f(programInfo.material.specular, 1.0, 1.0, 1.0, 1.0);
        tinyearth.gl.uniform4f(programInfo.material.emission, 0.0, 0.0, 0.0, 1.0);
        tinyearth.gl.uniform1f(programInfo.material.shininess, 1000);;

        const timer = new Timer(Date.now());
        timer.setEventBus(tinyearth.eventBus);
        timer.setMultipler(10000);
        timer.start();
        addTimeHelper(timer, document.getElementById("helper"));
        tinyearth.addTimer(timer);

        tinyearth.draw();
    } else {
        console.log("tinyearth canvas is null");
    }
}

main();