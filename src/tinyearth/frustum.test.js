import proj4 from 'proj4';
import Camera from './camera';
import Projection from './projection';
import { beforeAll, describe, expect } from '@jest/globals';
import { EPSG_4326, EPSG_4978 } from './proj';
import { buildFrustum } from './frustum';
import math, { hpvmatrix } from './highp_math';

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
        frustum = buildFrustum(projMtx, viewMtx, cameraFrom);

    });

    test("point on the left plane", () => {
        let cp = hpvmatrix([-1, 0, 0, 1]);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(math.equal(dist["left"], 0)).toBeTruthy();
        expect(math.larger(dist["right"], 0)).toBeTruthy();
        expect(math.larger(dist["bottom"], 0)).toBeTruthy();
        expect(math.larger(dist["top"], 0)).toBeTruthy();
        expect(math.larger(dist["near"], 0)).toBeTruthy();
        expect(math.larger(dist["far"], 0)).toBeTruthy();
    });

    test("point to the left of left plane", () => {
        cp = hpvmatrix([-100000, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(math.smaller(dist["left"], 0)).toBeTruthy();
        expect(math.larger(dist["right"], 0)).toBeTruthy();
        expect(math.larger(dist["bottom"], 0)).toBeTruthy();
        expect(math.larger(dist["top"], 0)).toBeTruthy();
        expect(math.larger(dist["near"], 0)).toBeTruthy();
        expect(math.larger(dist["far"], 0)).toBeTruthy();
    });

    test("point on the center", () => {
        cp = hpvmatrix([0, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(math.larger(dist["left"], 0)).toBeTruthy();
        expect(math.larger(dist["right"], 0)).toBeTruthy();
        expect(math.larger(dist["bottom"], 0)).toBeTruthy();
        expect(math.larger(dist["top"], 0)).toBeTruthy();
        expect(math.larger(dist["near"], 0)).toBeTruthy();
        expect(math.larger(dist["far"], 0)).toBeTruthy();
    });

    test("point to the right of right plane", () => {
        cp = hpvmatrix([2, 0, 0, 1]);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(math.larger(dist["left"], 1)).toBeTruthy();
        expect(math.smaller(dist["right"], -1)).toBeTruthy();
        expect(math.larger(dist["bottom"], 0)).toBeTruthy();
        expect(math.larger(dist["top"], 0)).toBeTruthy();
        expect(math.larger(dist["near"], 0)).toBeTruthy();
        expect(math.larger(dist["far"], 0)).toBeTruthy();
    });

});