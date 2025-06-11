import proj4 from "proj4";
import { loadImage } from "../common/imageutils.js";
import { EPSG_3857, EPSG_4326, EPSG_4978 } from "./proj.js";
import { vec3, vec4 } from "gl-matrix";
import { Frustum } from "./tilerender.js";

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

    constructor(url) {
        this.url = url;
    }

    /**
     * @param {number} z z of tile
     * @param {number} x x of tile
     * @param {number} y y of tile
     * @returns {Promise<Tile>}
    */
    async fetchTile(z, x, y, frustum) {
        const tile = new Tile(x, y, z, this.url);
        if (frustum) {
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

    fetchTilesOfLevelAsync(z, callback) {
        const nrows = Math.pow(2, z);
        const ncols = Math.pow(2, z);

        //TODO 递归判断

        for (let i = 0; i < ncols; ++i) {
            for (let j = 0; j < nrows; ++j) {
                this.fetchTile(z, i, j, this.frustum).then(callback).catch(e => {
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
    url = "";
    image = null;
    provider = null;

    constructor(x, y, z, url) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.url = url.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`);
    }

    /**
     * @param {vec4} p
     * @param {vec4} plane
     * @returns {boolean}  
    */
    pointInFrustumPlane(p, plane) {
        return !plane || vec4.dot(p, plane) >= -1E-5;
    }

    /**
     * @param {vec4} p
     * @param {Frustum} frustum
     * @returns {boolean}  
    */
    pointInFrustum(p, frustum) {

        for (const plane of Object.values(frustum)) {
            const distance = vec4.dot(plane, p);
            if (distance < 0) return false; // 点在平面外侧
        }

        return this.pointInFrustumPlane(p, frustum.left) &&
            this.pointInFrustumPlane(p, frustum.right) &&
            this.pointInFrustumPlane(p, frustum.bottom) &&
            this.pointInFrustumPlane(p, frustum.top) &&
            this.pointInFrustumPlane(p, frustum.near) &&
            this.pointInFrustumPlane(p, frustum.far);
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

        const vp0 = vec4.fromValues(p0[0], p0[1], p0[2], 1);
        const vp1 = vec4.fromValues(p1[0], p1[1], p1[2], 1);
        const vp2 = vec4.fromValues(p2[0], p2[1], p2[2], 1);
        const vp3 = vec4.fromValues(p3[0], p3[1], p3[2], 1);

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