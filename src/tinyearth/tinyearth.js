import { mat4 } from "gl-matrix";
import { buildFrustum } from "./frustum.js";
import Scene from "./scene.js";
import { getSunPositionECEF } from "./sun.js";
import { addTileProviderHelper, createTileProgram, createTileProgramBuffer, drawTileMesh, GlobeTileProgram, TileProvider } from "./tilerender.js";
import Timer, { addTimeHelper, EVENT_TIMER_TICK } from "./timer.js";
import "./tinyearth.css";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import EventBus from "./event.js";

let tinyearth = null;

export default class TinyEarth {

    /**@type {HTMLCanvasElement|null}*/
    canvas = null;
    /**@type {WebGLRenderingContext}*/
    gl = null;

    /**@type {Scene|null}*/
    scene = null;

    /**@type {Timer|null}*/
    timer = null;

    viewWidth = 512;

    viewHeight = 512;

    /**@type {EventBus|null} */
    eventBus = null;

    /**@type {GlobeTileProgram|null}*/
    globeTilePorgram = null;

    /**@param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { alpha: true });
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
        });
        this.globeTilePorgram = new GlobeTileProgram(this);
    }

    glInit() {
        /*清理及配置*/
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    addScene(scene) {
        this.scene = scene;
    }

    addTimer(timer) {
        this.timer = timer;
        this.timer.setEventBus(this.eventBus);
    }

    addTileProvider(provider) {
        this.globeTilePorgram.addTileProvider(provider);
    }

    draw() {
        this.glInit();

        this.globeTilePorgram.setMaterial(getSunPositionECEF(this.timer.getDate()), this.scene.getCamera());

        let that = this;

        this.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (timer) => {
                if (timer === that.timer) {
                    const sunPos = getSunPositionECEF(timer.getDate());
                    that.globeTilePorgram.setUniform3f("light.position", sunPos.x, sunPos.y, sunPos.z);
                }
            }
        });

        function drawFrame(t) {
            that.gl.clearColor(0.0, 0.0, 0.0, 0.0);
            that.gl.clearDepth(1.0);
            that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
            that.scene.setViewWidth(that.viewWidth);
            that.scene.setViewHeight(that.viewHeight);

            const modelMtx = mat4.create();
            const projMtx = that.scene.getProjection().perspective();

            const frustum = buildFrustum(
                that.scene.getProjection().perspective(),
                that.scene.getCamera().getMatrix().viewMtx,
                that.scene.getCamera().getFrom());
            that.globeTilePorgram.setFrustum(frustum);

            that.timer.tick(t);

            that.globeTilePorgram.render(modelMtx, that.scene.getCamera(), projMtx);

            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}

function main() {

    const canvas = document.getElementById("tinyearth-canvas");
    if (canvas !== null) {

        tinyearth = new TinyEarth(canvas);

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
        // const url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        // const url = "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg";

        let url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        const tileProvider0 = new TileProvider(url, tinyearth.scene.getCamera());
        tileProvider0.setMinLevel(2);
        tileProvider0.setMaxLevel(20);
        tileProvider0.setIsNight(false);
        addTileProviderHelper(document.getElementById("helper"), tileProvider0);
        tinyearth.addTileProvider(tileProvider0);

        url = "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg"
        const tileProvider1 = new TileProvider(url, tinyearth.scene.getCamera());
        tileProvider1.setOpacity(0.5);
        tileProvider1.setMinLevel(2);
        tileProvider1.setMaxLevel(6);
        tileProvider1.setIsNight(true);
        addTileProviderHelper(document.getElementById("helper"), tileProvider1);
        tinyearth.addTileProvider(tileProvider1);

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