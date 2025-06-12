import proj4 from 'proj4';
import Camera from './camera';
import Projection from './projection';
import { buildFrustum } from './tilerender';
import { beforeAll, describe, expect } from '@jest/globals';
import { EPSG_4326, EPSG_4978 } from './proj';
import { create, all } from 'mathjs';
const math = create(all);

function clipToWord(p, IM) {
    let wp = math.multiply(IM, p);
    wp = math.divide(wp, wp.get([3]));
    return wp;
}

function EQUAL_ZERO(v, e) {
    return v > -e && v <= e;
}

describe("frustum", () => {

    let projection;
    let cameraFrom;
    let cameraTo;
    let cameraUp;
    let camera;
    let projMtx;
    let viewMtx;
    let M;
    let IM;
    let frustum;

    beforeAll(() => {

        const width = 1000;
        const height = 500;

        projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        cameraTo = [0, 0, 0];
        cameraUp = [0, 0, 1];
        camera = new Camera(cameraFrom, cameraTo, cameraUp);
        projMtx = projection.perspective64();
        viewMtx = camera.getMatrix().viewMtx64;
        M = math.multiply(projMtx, viewMtx);
        IM = math.inv(M);
        frustum = buildFrustum(projMtx, viewMtx);

    });

    test("point on the left plane", () => {
        let cp = math.matrix([-1, 0, 0, 1]);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(EQUAL_ZERO(dist["left"], 1E-5)).toBeTruthy();
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point to the left of left plane", () => {
        cp = math.matrix([-100000, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] < -1).toBeTruthy();
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point on the center", () => {
        cp = math.matrix([0, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] > 0).toBeTruthy();
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point to the right of right plane", () => {
        cp = math.matrix([2, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] > 1).toBeTruthy();
        expect(dist["right"] < -1).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

});