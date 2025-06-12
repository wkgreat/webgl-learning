import tileVertSource from "./tile.vert"
import tileFragSource from "./tile.frag"
import { Tile, TileMesher, TileSource } from "./maptiler.js";
import { mat4, vec3, vec4 } from "gl-matrix";
import Camera from "./camera.js";
import { EPSG_4978, EPSG_4326, EARTH_RADIUS } from "./proj.js";
import proj4 from "proj4";
import { create, all } from 'mathjs';
const math = create(all);

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createTileProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    let success;

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, tileVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    success = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
    if (!success) {
        const error = gl.getShaderInfoLog(vertShader);
        console.error('vertShader编译失败: ', error);
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, tileFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    success = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
    if (!success) {
        const error = gl.getShaderInfoLog(fragShader);
        console.error('fragShader编译失败: ', error);
    }

    gl.linkProgram(program);

    success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        const error = gl.getProgramInfoLog(program);
        console.error('program 连接失败失败: ', error);
    }


    if (!program) {
        console.error("program is null");
    }

    gl.useProgram(program);

    return {
        program: program,
        a_position: gl.getAttribLocation(program, "a_position"),
        a_texcoord: gl.getAttribLocation(program, "a_texcoord"),
        a_normal: gl.getAttribLocation(program, "a_normal"),
        u_modelMtx: gl.getUniformLocation(program, "u_modelMtx"),
        u_viewMtx: gl.getUniformLocation(program, "u_viewMtx"),
        u_projMtx: gl.getUniformLocation(program, "u_projMtx"),
        light: {
            position: gl.getUniformLocation(program, "light.position"),
            color: gl.getUniformLocation(program, "light.color")
        },
        camera: {
            position: gl.getUniformLocation(program, "camera.position")
        },
        material: {
            ambient: gl.getUniformLocation(program, "material.ambient"),
            diffuse: gl.getUniformLocation(program, "material.diffuse"),
            specular: gl.getUniformLocation(program, "material.specular"),
            emission: gl.getUniformLocation(program, "material.emission"),
            shininess: gl.getUniformLocation(program, "material.shininess"),
        }
    };
}

/**
 * @param {WebGL2RenderingContext} gl 
*/
export function createTileProgramBuffer(gl) {
    const verticesBuffer = gl.createBuffer();
    const texture = gl.createTexture();

    return {
        verticesBuffer: verticesBuffer,
        numElements: 0,
        texture: texture
    }
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {object} programInfo 
 * @param {object} bufferInfo 
 * @param {Array} data 
*/
export function setTileProgramBufferData(gl, bufferInfo, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    bufferInfo.numElements = data.length;
}

export function setTileProgramTextureData(gl, bufferInfo, image) {
    /* 纹理 */

    gl.bindTexture(gl.TEXTURE_2D, bufferInfo.texture);
    //设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    //纹理数据
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo
 * @param {object} mesh
 * @param {mat4} modelMtx
 * @param {Camera} camera
 * @param {mat4} projMtx       
*/
export function drawTileMesh(gl, programInfo, bufferInfo, mesh, modelMtx, camera, projMtx) {

    gl.useProgram(programInfo.program);

    setTileProgramBufferData(gl, bufferInfo, mesh.vertices);
    setTileProgramTextureData(gl, bufferInfo, mesh.texImage);

    gl.vertexAttribPointer(programInfo.a_position, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, 0); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_position); // 激活属性

    gl.vertexAttribPointer(programInfo.a_texcoord, 2, gl.FLOAT, false, (3 + 2 + 3) * 4, 3 * 4); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_texcoord); // 激活属性

    gl.vertexAttribPointer(programInfo.a_normal, 3, gl.FLOAT, false, (3 + 2 + 3) * 4, (3 + 2) * 4); // 设置属性指针
    gl.enableVertexAttribArray(programInfo.a_normal); // 激活属性

    gl.uniformMatrix4fv(programInfo.u_modelMtx, false, modelMtx);
    gl.uniformMatrix4fv(programInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
    gl.uniformMatrix4fv(programInfo.u_projMtx, false, projMtx);

    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements / 8);
}


export class TileProvider {

    url = "";
    camera = null;
    curlevel = 0;
    whichList = 0;
    meshes0 = [];
    meshes1 = [];
    tileSource = null;

    #stop = false;

    /**
     * @type {{left:vec4,right:vec4,bottom:vec4,top:vec4,near:vec4,far:vec4}|null}
    */
    frustum = null;
    callback = this.provideCallbackGen();

    /**
     * @param {Camera} camera 
    */
    constructor(url, camera) {
        this.url = url;
        this.tileSource = new TileSource(url);
        this.camera = camera;
        this.callback(camera);
        camera.addOnchangeEeventListener(this.callback);
    }

    /**
     * @param {Frustum} frustum 
    */
    setFrustum(frustum) {
        this.frustum = frustum;
        this.tileSource.setFrustum(frustum);
    }

    switchList() {
        if (this.whichList === 0) {
            this.whichList = 1;
        } else {
            this.whichList = 0;
        }
    }

    getMeshes() {
        if (this.whichList === 0) {
            return this.meshes0;
        } else {
            return this.meshes1;
        }
    }

    stop() {
        this.#stop = true;
    }

    start() {
        this.#stop = false;
    }

    isStop() {
        return this.#stop;
    }


    /**
     * @param {Camera} camera 
    */
    tileLevel(camera) {
        const tileSize = 256;
        let pos = proj4(EPSG_4978, EPSG_4326, Array.from(camera.getFrom().slice(0, 3)));
        let height = pos[2];
        const initialResolution = 2 * Math.PI * EARTH_RADIUS / tileSize;

        const groundResolution = height * 2 / tileSize;

        const zoom = Math.log2(initialResolution / groundResolution);
        return Math.min(Math.max(Math.floor(zoom) + 1, 2), 20);
    }


    provideCallbackGen() {

        let that = this;

        /**
         * @param {Camera} camera 
        */
        function provideCallback(camera) {

            const level = that.tileLevel(camera);

            if (!that.isStop()) {
                if (that.curlevel !== level) {
                    console.log("LEVEL:", level);
                    that.curlevel = level;
                    that.meshes = [];

                    that.meshes0 = [];
                    that.meshes1 = [];
                    that.switchList();

                    that.tileSource.fetchTilesOfLevelAsync(level, (tile) => {
                        if (tile) {
                            if (that.whichList === 0) {
                                that.meshes0.push(TileMesher.toMesh(tile, 4, EPSG_4978));
                            } else {
                                that.meshes1.push(TileMesher.toMesh(tile, 4, EPSG_4978));
                            }
                        }
                    });
                }
            }
        }

        return provideCallback;
    }

}

/**
 * @param {HTMLDivElement} root  
 * @param {TileProvider} tileProvider 
*/
export function addTileProviderHelper(root, tileProvider) {
    const html = `
    <table>
            <tr>
                <th> 瓦片获取启动 </th>
                <th> <input type="checkbox" id="tile-provide-input" checked></th>
            </tr>
        </table>
    `;

    root.innerHTML = root.innerHTML + html;

    const checkbox = document.getElementById("tile-provide-input");
    checkbox.checked = !tileProvider.isStop();
    checkbox.addEventListener('change', (event) => {
        if (event.target.checked) {
            tileProvider.start();
        } else {
            tileProvider.stop();
        }
    });

}

