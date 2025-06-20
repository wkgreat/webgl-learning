import { mat4, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Camera from "./camera.js";
import { Tile, TileSource } from "./maptiler.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj.js";
import tileFragSource from "./tile.frag";
import tileVertSource from "./tile.vert";
import { vec4_t3 } from "./glmatrix_utils.js";
import Frustum from "./frustum.js";
import TinyEarth from "./tinyearth.js";

export class GlobeTileProgram {


    /**@type {WebGLRenderingContext|null}*/
    gl = null;

    /**@type {TinyEarth|null}*/
    tinyearth = null;

    /**@type {WebGLProgram|null}*/
    program = null;

    buffers = {};

    numElements = 0;

    constructor(tinyearth) {
        this.tinyearth = tinyearth;
        this.gl = this.tinyearth.gl;
        this.program = this.createTileProgram();
        this.createBuffer();
    }

    createTileProgram() {
        /* 创建程序 */
        const program = this.gl.createProgram();

        let success;

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, tileVertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        success = this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(vertShader);
            console.error('vertShader编译失败: ', error);
        }

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragShader, tileFragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(program, fragShader);

        success = this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(fragShader);
            console.error('fragShader编译失败: ', error);
        }

        this.gl.linkProgram(program);

        success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!success) {
            const error = this.gl.getProgramInfoLog(program);
            console.error('program 连接失败失败: ', error);
        }

        if (!program) {
            console.error("program is null");
        }

        this.program = program;
        return program;

    }

    createBuffer() {
        this.buffers["vertices"] = this.gl.createBuffer();
        this.buffers["texture"] = this.gl.createTexture();
    }

    setUniform3f(name, v0, v1, v2) {
        this.gl.useProgram(this.program);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, name), v0, v1, v2);
    }
    setUniform4f(name, v0, v1, v2, v3) {
        this.gl.useProgram(this.program);
        this.gl.uniform4f(this.gl.getUniformLocation(this.program, name), v0, v1, v2, v3);
    }
    setUniform1f(name, v) {
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), v);
    }

    /**
     * @param {Camera} camera 
    */
    setMaterial(sunPos, camera) {
        const from = camera.getFrom();
        this.gl.useProgram(this.program);
        this.setUniform3f("light.position", sunPos.x, sunPos.y, sunPos.z);
        this.setUniform4f("light.color", 1.0, 1.0, 1.0, 1.0);
        this.setUniform3f("camera.position", from[0], from[1], from[2]);
        this.setUniform4f("material.ambient", 0.1, 0.1, 0.1, 1.0);
        this.setUniform4f("material.diffuse", 1.0, 1.0, 1.0, 1.0);
        this.setUniform4f("material.specular", 1.0, 1.0, 1.0, 1.0);
        this.setUniform4f("material.emission", 0.0, 0.0, 0.0, 1.0);
        this.setUniform1f("material.shininess", 1000);
    }

    setData(verticeData, textureData) {

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers["vertices"]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
        this.numElements = verticeData.length;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.buffers["texture"]);
        //设置纹理参数
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        //纹理数据
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureData);

    }

    /**
     * @param {Tile} tile
     * @param {mat4} modelMtx
     * @param {Camera} camera
     * @param {mat4} projMtx       
    */
    drawTileMesh(tile, modelMtx, camera, projMtx) {

        if (tile.ready) {
            this.gl.useProgram(this.program);

            this.setData(tile.mesh, tile.image);

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_position"), 3, this.gl.FLOAT, false, (3 + 2 + 3) * 4, 0); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_position")); // 激活属性

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_texcoord"), 2, this.gl.FLOAT, false, (3 + 2 + 3) * 4, 3 * 4); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_texcoord")); // 激活属性

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_normal"), 3, this.gl.FLOAT, false, (3 + 2 + 3) * 4, (3 + 2) * 4); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_normal")); // 激活属性

            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_modelMtx"), false, modelMtx);
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_viewMtx"), false, camera.getMatrix().viewMtx);
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_projMtx"), false, projMtx);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numElements / 8);
        }

    }
}

export class TileNode {

    /** @type {{z:number,x:number,y:number}}*/
    key = { z: 0, x: 0, y: 0 };
    /* @type {Tile} */
    tile = null;
    /**@type {TileNode[]} */
    children = [];

    /**@param {Tile} tile */
    static createTileNode(tile) {
        const node = new TileNode();
        node.key = [tile.z, tile.x, this.y];
        node.tile = tile;
        node.children = [];
        return node;
    }
    static createEmptyTileNode(z, x, y) {
        const node = new TileNode();
        node.key = { z, x, y };
        node.tile = null;
        node.children = [];
        return node;
    }

}


export class TileTree {

    /**@type {TileNode} */
    root = TileNode.createEmptyTileNode(0, 0, 0);

    /**
     * @param {Tile} tile 
    */
    addTile(tile) {
        this.#addTileRec(this.root, tile);
    }

    /**
     * @param {TileNode} curNode
     * @param {Tile} tile  
    */
    #addTileRec(curNode, tile) {
        if (tile.z === curNode.key.z) {
            if (tile.x === curNode.key.x && tile.y === curNode.key.y) {
                curNode.tile = tile;
            } else {
                return;
            }
        } else if (curNode.key.z < tile.z) {

            const dz = tile.z - curNode.key.z;
            const px = tile.x >> dz;
            const py = tile.y >> dz;

            if (px !== curNode.key.x || py !== curNode.key.y) {
                return;
            }

            if (curNode.children === null) {
                curNode.children = [];
            }

            if (curNode.children.length === 0) {

                const cz = curNode.key.z;
                const cx = curNode.key.x;
                const cy = curNode.key.y;

                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1, cy << 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1 | 1, cy << 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1, cy << 1 | 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1 | 1, cy << 1 | 1));

            }

            for (let node of curNode.children) {
                this.#addTileRec(node, tile);
            }

        } else {
            console.error("should not be here.");
            return;
        }
    }

    /**
     * @param {number} z
     * @param {(tile:Tile)=>void} callback  
     * @TODO 根据视锥体剪枝
    */
    forEachTilesOfLevel(z, callback) {
        this.#forEachTilesOfLevel(this.root, z, callback);
    }

    /**
     * @param {TileNode} curNode 
     * @param {number} z
     * @param {(tile:Tile)=>void} callback  
    */
    #forEachTilesOfLevel(curNode, z, callback) {
        if (z === curNode.key.z) {
            callback(curNode.tile);
        } else if (curNode.key.z < z) {
            for (let node of curNode.children) {
                this.#forEachTilesOfLevel(node, z, callback);
            }
        } else {
            console.error("should not be here.");
        }
    }

    /**
     * @param {number} level
     * @param {Frustum} frustum
     * @returns {TileNode[]}
    */
    getTileNodeByFrustum(level, frustum) {
        // TODO
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {TileNode|null}   
    */
    getTileNode(z, x, y) {

        return this.#getTileNodeRec(this.root, z, x, y);

    }

    /**
     * @param {TileNode|null} curnode
     * @param {number} x
     * @param {number} y
     * @param {number} z 
     * @returns {TileNode|null}    
    */
    #getTileNodeRec(curnode, z, x, y) {
        if (curnode == null) {
            return null;
        } else if (curnode.key.z > z) {
            return null;
        } else if (curnode.key.z === z) {
            if (curnode.key.x === x && curnode.key.y === y) {
                return curnode;
            } else {
                return null;
            }
        } else {
            const px = x >> (z - curnode.key.z);
            const py = y >> (z - curnode.key.z);
            if (curnode.key.x !== px || curnode.key.y !== py) {
                return null;
            } else {
                const children = curnode.children;
                if (!children) {
                    return null;
                }
                let c0 = this.#getTileNodeRec(children[0], z, x, y);
                if (c0 !== null) {
                    return c0;
                }
                let c1 = this.#getTileNodeRec(children[1], z, x, y);
                if (c1 !== null) {
                    return c1;
                }
                let c2 = this.#getTileNodeRec(children[2], z, x, y);
                if (c2 !== null) {
                    return c2;
                }
                let c3 = this.#getTileNodeRec(children[3], z, x, y);
                if (c3 !== null) {
                    return c3;
                }
                return null;
            }
        }
    }

    vaccum() {
        //TODO 定期清理不用的tile
    }

}


export class TileProvider {

    url = "";
    camera = null;
    curlevel = 0;
    tileSource = null;
    /** @type {TileTree} */
    tiletree = null;

    #stop = false;

    /**
     * @type {{left:vec4,right:vec4,bottom:vec4,top:vec4,near:vec4,far:vec4}|null}
    */
    frustum = null;
    callback = null;

    /**
     * @param {Camera} camera 
    */
    constructor(url, camera) {
        this.url = url;
        this.tileSource = new TileSource(url); // TODO 将TileTree传入，如果有tile，不必再重复请求了
        this.tiletree = new TileTree();
        this.camera = camera;
        this.callback = this.provideCallbackGen();
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
        return Math.min(Math.max(Math.floor(zoom) + 2, 2), 20);
    }


    provideCallbackGen() {

        let that = this;

        /**
         * @param {Camera} camera 
        */
        function provideCallback(camera, info) {

            const level = that.tileLevel(camera);

            if (!that.isStop()) {
                if (info === undefined || (info["type"] === 'zoom' && that.curlevel !== level) || info["type"] === 'move' || info["type"] === 'round') {

                    that.curlevel = level;

                    const from = camera.getFrom();
                    const fromLonLatAlt = proj4(EPSG_4978, EPSG_4326, vec4_t3(from));
                    console.log("LEVEL:", level, "FROM: ", fromLonLatAlt);

                    that.tileSource.fetchTilesOfLevelAsync(level, (tile) => {
                        if (tile) {
                            that.tiletree.addTile(tile);
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

