import { mat4, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Camera from "./camera.js";
import { Tile, TileMesher, TileSource } from "./maptiler.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj.js";
import tileFragSource from "./tile.frag";
import tileVertSource from "./tile.vert";
import { vec4_t3 } from "./glmatrix_utils.js";
import { im } from "mathjs";

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
 * @param {Tile} tile
 * @param {mat4} modelMtx
 * @param {Camera} camera
 * @param {mat4} projMtx       
*/
export function drawTileMesh(gl, programInfo, bufferInfo, tile, modelMtx, camera, projMtx) {


    if (tile.ready) {
        gl.useProgram(programInfo.program);

        setTileProgramBufferData(gl, bufferInfo, tile.mesh);
        setTileProgramTextureData(gl, bufferInfo, tile.image);

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
     * @param {(Tile)=>{void}} callback  
    */
    forEachTilesOfLevel(z, callback) {
        this.#forEachTilesOfLevel(this.root, z, callback);
    }

    /**
     * @param {TileNode} curNode 
     * @param {number} z
     * @param {(Tile)=>{void}} callback  
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
        this.tileSource = new TileSource(url);
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

