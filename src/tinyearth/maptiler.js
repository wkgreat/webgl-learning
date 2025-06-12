import proj4 from "proj4";
import { loadImage } from "../common/imageutils.js";
import { EPSG_3857, EPSG_4326, EPSG_4978 } from "./proj.js";
import { vec3, vec4 } from "gl-matrix";
import { create, all } from 'mathjs';
import Frustum from "./frustum.js";
const math = create(all);

const XLIMIT = [-20037508.3427892, 20037508.3427892];
const YLIMIT = [-20037508.3427892, 20037508.3427892];

/**
 * @class TileSource
 * @property {string} url
*/
export class TileSource {
    url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    /**
     * @type {Frustum|null}
    */
    frustum = null;
    isBack = 0;
    isOutside = 0;
    isPass = 0;

    constructor(url) {
        this.url = url;
    }

    /**
     * @param {number} z z of tile
     * @param {number} x x of tile
     * @param {number} y y of tile
     * @returns {Promise<Tile>}
    */
    async fetchTileByDataZXY(z, x, y, frustum) {
        const tile = new Tile(x, y, z, this.url);
        // console.log("TRIM RATIO: ", this.isBack, this.isOutside, this.isPass);
        if (frustum) {
            if (tile.tileIsBack(frustum)) {
                this.isBack += 1;
                return null;
            }
            if (!tile.intersectwithFrustumECEF(frustum)) {
                this.isOutside += 1;
                return null;
            }
        }
        await tile.fetchTile();
        tile.provider = this;
        this.isPass += 1;
        return tile;
    }

    /**
 * @param {Tile} tile
 * @param {Frustum} frustum 
 * @returns {Promise<Tile>}
*/
    async fetchTileData(tile, frustum) {
        if (frustum) {
            if (tile.tileIsBack(frustum)) {
                return null;
            }
            if (!tile.intersectwithFrustumECEF(frustum)) {
                return null;
            }
        }
        await tile.fetchTile();
        tile.provider = this;
        return tile;
    }

    setFrustum(frustum) {
        this.frustum = frustum;
    }

    fetchTileRec(zmax, url, frustum) {

        const z = 4;
        const nrows = Math.pow(2, z);
        const ncols = Math.pow(2, z);
        const tiles = [];
        for (let i = 0; i < ncols; ++i) {
            for (let j = 0; j < nrows; ++j) {
                tiles.push(new Tile(i, j, z, url, this.frustum));
            }
        }
        while (tiles.length !== 0 && tiles[0].z !== zmax) {
            const tile = tiles.shift();
            if (frustum) {
                if (tile.tileIsBack(frustum)) {
                    continue;
                }
                if (tiles.z >= 9 && !tile.intersectwithFrustumECEF(frustum)) {
                    continue;
                }
            }
            tiles.push(...tile.subTiles());
        }

        return tiles;
    }

    fetchTilesOfLevelAsync(z, callback) {
        const nrows = Math.pow(2, z);
        const ncols = Math.pow(2, z);

        //层级大于5时开始递归判断
        //TODO 瓦片递归判断与视锥体关系

        if (z <= 5) {
            for (let i = 0; i < ncols; ++i) {
                for (let j = 0; j < nrows; ++j) {
                    const tile = new Tile(i, j, z, this.url);
                    this.fetchTileData(tile, this.frustum).then(callback).catch(e => {
                        console.error(e);
                    });
                }
            }
        } else {
            const tiles = this.fetchTileRec(z, this.url, this.frustum);
            console.log("TILES LEVEL: ", z, tiles.length, tiles);
            for (let tile of tiles) {
                this.fetchTileData(tile, this.frustum).then(callback).catch(e => {
                    console.error(e);
                });
            }
        }


    }

    async fetchTilesOfLevel(z) {
        const nrows = Math.pow(2, z);
        const ncols = Math.pow(2, z);
        const tiles = [];

        for (let i = 0; i < ncols; ++i) {
            for (let j = 0; j < nrows; ++j) {
                const tile = await this.fetchTile(z, i, j);
                tiles.push(tile);
            }
        }
        return tiles;
    }
};

/**
 * @class Tile
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {Image} image
 * @property {TileProvider} provider
*/
export class Tile {

    x = 0;
    y = 0;
    z = 0;
    urltem = "";
    url = "";
    image = null;
    provider = null

    constructor(x, y, z, url) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.urltem = url;
        this.url = url.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`);
    }

    subTiles() {
        return [
            new Tile(this.x * 2, this.y * 2, this.z + 1, this.urltem),
            new Tile(this.x * 2 + 1, this.y * 2, this.z + 1, this.urltem),
            new Tile(this.x * 2, this.y * 2 + 1, this.z + 1, this.urltem),
            new Tile(this.x * 2 + 1, this.y * 2 + 1, this.z + 1, this.urltem)
        ];
    }

    /**
     * @param {vec4} p
     * @param {vec4} plane
     * @returns {boolean}  
    */
    pointInFrustumPlane(p, plane) {
        return !plane || math.dot(p, plane) >= -1E-5;
    }

    /**
     * @param {math.Matrix} p
     * @param {Frustum} frustum
     * @returns {boolean}  
    */
    pointInFrustum(p, frustum) {

        return this.pointInFrustumPlane(p, frustum.left) &&
            this.pointInFrustumPlane(p, frustum.right) &&
            this.pointInFrustumPlane(p, frustum.bottom) &&
            this.pointInFrustumPlane(p, frustum.top) &&
            this.pointInFrustumPlane(p, frustum.near) &&
            this.pointInFrustumPlane(p, frustum.far);
    }

    /**
     * @param {math.Matrix} v 
     * @returns {math.Matrix}
    */
    normalize(v) {
        return math.divide(v, math.norm(v));
    }

    /**
     * @param {Frustum} frustum
     * @returns {boolean}
    */
    tileIsBack(frustum) {

        if (frustum.getViewpoint() == null) {
            return true;
        }

        const ext = this.extent();
        let p0 = [ext[0], ext[1]];
        let p1 = [ext[0], ext[3]];
        let p2 = [ext[2], ext[1]];
        let p3 = [ext[2], ext[3]];
        p0 = proj4(EPSG_3857, EPSG_4326, p0);
        p1 = proj4(EPSG_3857, EPSG_4326, p1);
        p2 = proj4(EPSG_3857, EPSG_4326, p2);
        p3 = proj4(EPSG_3857, EPSG_4326, p3);

        p0 = proj4(EPSG_4326, EPSG_4978, [...p0, 0]);
        p1 = proj4(EPSG_4326, EPSG_4978, [...p1, 0]);
        p2 = proj4(EPSG_4326, EPSG_4978, [...p2, 0]);
        p3 = proj4(EPSG_4326, EPSG_4978, [...p3, 0]);

        p0 = math.matrix([p0[0], p0[1], p0[2]]);
        p1 = math.matrix([p1[0], p1[1], p1[2]]);
        p2 = math.matrix([p2[0], p2[1], p2[2]]);
        p3 = math.matrix([p3[0], p3[1], p3[2]]);

        const viewpoint = frustum.getViewpoint();
        const sp0 = this.normalize(p0);
        const sp1 = this.normalize(p1);
        const sp2 = this.normalize(p2);
        const sp3 = this.normalize(p3);

        const vp0 = math.subtract(viewpoint, p0);
        const vp1 = math.subtract(viewpoint, p1);
        const vp2 = math.subtract(viewpoint, p2);
        const vp3 = math.subtract(viewpoint, p3);

        return math.dot(sp0, vp0) < 0 && math.dot(sp1, vp1) < 0 && math.dot(sp2, vp2) < 0 && math.dot(sp3, vp3) < 0;

    }

    intersectwithFrustumECEF(frustum) {

        const ext = this.extent();
        let p0 = [ext[0], ext[1]];
        let p1 = [ext[0], ext[3]];
        let p2 = [ext[2], ext[1]];
        let p3 = [ext[2], ext[3]];
        p0 = proj4(EPSG_3857, EPSG_4326, p0);
        p1 = proj4(EPSG_3857, EPSG_4326, p1);
        p2 = proj4(EPSG_3857, EPSG_4326, p2);
        p3 = proj4(EPSG_3857, EPSG_4326, p3);

        p0 = proj4(EPSG_4326, EPSG_4978, [...p0, 0]);
        p1 = proj4(EPSG_4326, EPSG_4978, [...p1, 0]);
        p2 = proj4(EPSG_4326, EPSG_4978, [...p2, 0]);
        p3 = proj4(EPSG_4326, EPSG_4978, [...p3, 0]);

        const vp0 = math.matrix([p0[0], p0[1], p0[2], 1]);
        const vp1 = math.matrix([p1[0], p1[1], p1[2], 1]);
        const vp2 = math.matrix([p2[0], p2[1], p2[2], 1]);
        const vp3 = math.matrix([p3[0], p3[1], p3[2], 1]);

        return this.pointInFrustum(vp0, frustum) || this.pointInFrustum(vp1, frustum)
            || this.pointInFrustum(vp2, frustum) || this.pointInFrustum(vp3, frustum);

    }

    /* 注意GOOGLE切片原点视左上角，不是左下角*/
    extent() {
        const dx = (XLIMIT[1] - XLIMIT[0]) / Math.pow(2, this.z);
        const dy = (YLIMIT[1] - YLIMIT[0]) / Math.pow(2, this.z);
        const xmin = XLIMIT[0] + dx * this.x;
        const xmax = XLIMIT[0] + dx * (this.x + 1);
        const ymin = YLIMIT[1] - dy * (this.y + 1);
        const ymax = YLIMIT[1] - dy * (this.y);
        return [xmin, ymin, xmax, ymax];
    }

    async fetchTile() {
        const image = await loadImage(this.url);
        this.image = image;
        return this.image;
    }

    center() {
        const ext = this.extent();
        return [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
    }
}

//
export class TileMesher {

    static toMesh(tile, level, targetProj, frustum) {}

    static toMesh(tile, level, targetProj) {
        const vertices = [];
        const posExt = tile.extent();
        const texExt = [0, 0, 1, 1];
        this.toMeshRec(posExt, texExt, 0, level, targetProj, vertices);
        return {
            vertices: new Float32Array(vertices),
            texImage: tile.image
        };
    }

    static normalize(x, y, z) {
        let p = vec3.fromValues(x, y, z);
        vec3.normalize(p, p);
        return [p[0], p[1], p[2]];
    }

    static toMeshRec(posExt, texExt, curlevel, level, targetProj, vertices) {

        if (curlevel == level) {
            let p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            let n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[3], n[0], n[1], n[2]);

            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);


        } else if (curlevel < level) {
            const newPosExt = [];
            const newTexExt = [];

            newPosExt[0] = posExt[0];
            newPosExt[1] = posExt[1];
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = texExt[0];
            newTexExt[1] = texExt[1];
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = posExt[1];
            newPosExt[2] = posExt[2];
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = texExt[1];
            newTexExt[2] = texExt[2];
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = posExt[0];
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = posExt[3];

            newTexExt[0] = texExt[0];
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = texExt[3];

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = posExt[2];
            newPosExt[3] = posExt[3];

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = texExt[2];
            newTexExt[3] = texExt[3];

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

        }
    }
};