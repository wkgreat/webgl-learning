import proj4 from "proj4";
import { loadImage } from "../common/imageutils";
import { EPSG_3857 } from "./proj";

const XLIMIT = [-20037508.3427892, 20037508.3427892];
const YLIMIT = [-20037508.3427892, 20037508.3427892];

/**
 * @class TileProvider
 * @property {string} url
*/
export class TileProvider {
    url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    constructor(url) {
        this.url = url;
    }

    /**
     * @param {number} z z of tile
     * @param {number} x x of tile
     * @param {number} y y of tile
     * @returns {Promise<Tile>}
    */
    async fetchTile(z, x, y) {
        const realURL = this.url.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`);
        const image = await loadImage(realURL);
        const tile = new Tile();
        tile.x = x;
        tile.y = y;
        tile.z = z;
        tile.image = image;
        tile.provider = this;
        return tile;
    }

    fetchTilesOfLevelAsync(z, callback) {
        const nrows = Math.pow(2, z);
        const ncols = Math.pow(2, z);

        for (let i = 0; i < ncols; ++i) {
            for (let j = 0; j < nrows; ++j) {
                this.fetchTile(z, i, j).then(callback).catch(e => {
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
    image = null;
    provider = null;

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

    center() {
        const ext = this.extent();
        return [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
    }
}

//
export class TileMesher {

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

    static toMeshRec(posExt, texExt, curlevel, level, targetProj, vertices) {

        if (curlevel == level) {
            let p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], Math.random(), Math.random(), Math.random());
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], Math.random(), Math.random(), Math.random());
            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[3], 0]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[3], Math.random(), Math.random(), Math.random());

            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], Math.random(), Math.random(), Math.random());
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[1], 0]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[1], Math.random(), Math.random(), Math.random());
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], Math.random(), Math.random(), Math.random());
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