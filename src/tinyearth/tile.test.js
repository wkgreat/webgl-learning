import { describe, expect } from '@jest/globals';
import { vec4 } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from './camera';
import { buildFrustum } from './frustum';
import { Tile } from './maptiler';
import { EPSG_3857, EPSG_4326, EPSG_4978 } from './proj';
import Projection from './projection';

describe("tile", () => {

    test("point_in_tile", () => {

        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;

        const point4326 = [118.767335, 32.050471, 0];
        const point3857 = proj4(EPSG_4326, EPSG_3857, point4326);
        const tile = new Tile(x, y, z, url);
        const [xmin, ymin, xmax, ymax] = tile.extent();

        expect(point3857[0]).toBeGreaterThan(xmin);
        expect(point3857[0]).toBeLessThan(xmax);
        expect(point3857[1]).toBeGreaterThan(ymin);
        expect(point3857[1]).toBeLessThan(ymax);

    });

    test("point_in_frustum", () => {


        const width = 1000;
        const height = 500;
        const p4326 = [118.767335, 32.050471, 0];
        const p4978 = proj4(EPSG_4326, EPSG_4978, p4326);
        const vp = vec4.fromValues(...p4978, 1);

        const projection = new Projection(Math.PI / 3, width / height, 1, 1E10);
        // const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.767335, 32.050471, 10000]);
        const cameraFrom = [-2659251.75, 4792728.5, 3401463.25];
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;
        const frustum = buildFrustum(projMtx, viewMtx, cameraFrom);


        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;
        const tile = new Tile(x, y, z, url);

        expect(tile.pointInFrustum(vp, frustum)).toBeTruthy();

    });

    test("tile_in_frustum", () => {

        const width = 1000;
        const height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 1E10);
        const cameraFrom = [-2659251.75, 4792728.5, 3401463.25];
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;

        const frustum = buildFrustum(projMtx, viewMtx, cameraFrom);


        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;
        const tile = new Tile(x, y, z, url);

        let curtile = tile;
        while (curtile.z >= 6) {
            expect(curtile.intersectwithFrustumECEF(frustum)).toBeTruthy();
            curtile = curtile.supTile();
        }


    });

});