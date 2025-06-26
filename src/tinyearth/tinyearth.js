import { mat4, vec4, glMatrix } from "gl-matrix";
import { buildFrustum } from "./frustum.js";
import Scene from "./scene.js";
import { getSunPositionECEF } from "./sun.js";
import { addTileProviderHelper, addTileSelectHelper, GlobeTileProgram, TileProvider } from "./tilerender.js";
import Timer, { addTimeHelper, EVENT_TIMER_TICK } from "./timer.js";
import "./tinyearth.css";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import EventBus from "./event.js";
import { addDebugHelper } from "./helper.js";
import { MousePositionTool } from "./tools.js";
import { addMenu } from "./menu.js";
import { SkyBoxProgram } from "./skybox.js";
import { mat4_inv, mat4_mul, vec4_t3 } from "./glmatrix_utils.js";
import { checkGLError } from "./debug.js";
glMatrix.setMatrixArrayType(Array);

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

    /** @type {SkyBoxProgram} */
    skyboxProgram = null;


    /**@type {boolean}*/
    #startDrawFrame = true;


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
            if (that.scene) {
                this.scene.setViewHeight(that.viewHeight);
                this.scene.setViewWidth(that.viewWidth);
            }
        });
        this.globeTilePorgram = new GlobeTileProgram(this);
        this.skyboxProgram = new SkyBoxProgram(this);
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

    startDraw() {
        this.#startDrawFrame = true;
    }

    stopDraw() {
        this.#startDrawFrame = false;
    }

    isStartDraw() {
        return this.#startDrawFrame;
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


        async function drawFrame(t) {
            if (that.isStartDraw()) {

                that.timer.tick(t);

                that.gl.clearColor(0.0, 0.0, 0.0, 0.0);
                that.gl.clearDepth(1.0);
                that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
                that.scene.setViewWidth(that.viewWidth);
                that.scene.setViewHeight(that.viewHeight);

                const modelMtx = mat4.create();
                const projMtx = that.scene.getProjection().perspective();
                const viewMtx = that.scene.getCamera().getMatrix().viewMtx;

                const invProjViewMtx = mat4.create();
                mat4.multiply(invProjViewMtx, projMtx, viewMtx);
                mat4.invert(invProjViewMtx, invProjViewMtx);
                const cameraWorldPos = vec4_t3(that.scene.getCamera().getFrom());

                that.skyboxProgram.setUniforms({
                    u_invProjViewMtx: invProjViewMtx,
                    u_worldCameraPos: cameraWorldPos
                });

                that.skyboxProgram.render();

                checkGLError(that.gl, "render");

                const frustum = buildFrustum(
                    that.scene.getProjection(),
                    that.scene.getCamera());
                that.globeTilePorgram.setFrustum(frustum);

                that.globeTilePorgram.render(modelMtx, that.scene.getCamera(), projMtx);
            }
            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}

function main() {

    const canvas = document.getElementById("tinyearth-canvas");
    if (canvas !== null) {

        tinyearth = new TinyEarth(canvas);

        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.778869, 32.043823, 1E7]);
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

        //常规底图
        let url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        // let url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        const tileProvider0 = new TileProvider(url, tinyearth.scene.getCamera());
        tileProvider0.setMinLevel(2);
        tileProvider0.setMaxLevel(20);
        tileProvider0.setIsNight(false);
        addTileProviderHelper(document.getElementById("helper"), "影像瓦片底图", tileProvider0);
        addTileSelectHelper(document.getElementById("helper"), "影像瓦片底图", tileProvider0);
        tinyearth.addTileProvider(tileProvider0);

        //夜间底图
        url = "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg"
        const tileProvider1 = new TileProvider(url, tinyearth.scene.getCamera());
        tileProvider1.setMinLevel(2);
        tileProvider1.setMaxLevel(6);
        tileProvider1.setIsNight(true);
        addTileProviderHelper(document.getElementById("helper"), "夜晚灯光瓦片底图", tileProvider1);

        tinyearth.addTileProvider(tileProvider1);

        //skybox
        // tinyearth.skyboxProgram.setCubeMap([
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/starsky/px.png" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/starsky/py.png" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/starsky/pz.png" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/starsky/nx.png" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/starsky/ny.png" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/starsky/nz.png" }
        // ]);

        tinyearth.skyboxProgram.setCubeMap([
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/box_zoom/pos-x.jpg" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/box_zoom/neg-x.jpg" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/box_zoom/pos-y.jpg" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/box_zoom/neg-y.jpg" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/box_zoom/pos-z.jpg" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/box_zoom/neg-z.jpg" },
        ]);


        //timer
        const timer = new Timer(Date.now());
        timer.setEventBus(tinyearth.eventBus);
        timer.setMultipler(10000);
        timer.start();
        addTimeHelper(timer, document.getElementById("helper"));
        tinyearth.addTimer(timer);

        addDebugHelper(document.getElementById("helper"), tinyearth);

        const mousePosTool = new MousePositionTool(tinyearth);
        mousePosTool.enable();

        addMenu(tinyearth);

        tinyearth.draw();
    } else {
        console.log("tinyearth canvas is null");
    }
}

main();