import proj4 from 'proj4';
import Camera from './camera';
import Projection from './projection';
import { mat4, vec4 } from 'gl-matrix';
import { buildFrustum } from './tilerender';
import { expect } from '@jest/globals';
import { EPSG_4326, EPSG_4978 } from './proj';

function clipToWord(p, IM) {
    const wp = vec4.transformMat4(vec4.create(), p, IM);
    vec4.scale(wp, wp, 1.0 / wp[3]);
    console.log("WP: ", wp);
    return wp;
}

test("relationshape of point and frustum", () => {

    const width = 1000;
    const height = 500;

    const porjection = new Projection(Math.PI / 3, width / height, 1, 10000);
    const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
    const cameraTo = [0, 0, 0];
    const cameraUp = [0, 0, 1];
    const camera = new Camera(cameraFrom, cameraTo, cameraUp);

    const projMtx = porjection.perspective();
    const viewMtx = camera.getMatrix().viewMtx;
    const M = mat4.multiply(mat4.create(), projMtx, viewMtx);
    const IM = mat4.invert(mat4.create(), M);

    const cp0 = vec4.fromValues(-1, 0, 0, 1);
    const wp0 = clipToWord(cp0, IM);

    const frustum = buildFrustum(projMtx, viewMtx);

    let distanceObj = frustum.getDistanceOfPoint(wp0);

    console.log("distance: ", distanceObj);

    expect(Math.abs(distanceObj["left"]) < 1).toBeTruthy();
    expect(distanceObj["right"] > 0).toBeTruthy();
    expect(distanceObj["bottom"] > 0).toBeTruthy();
    expect(distanceObj["top"] > 0).toBeTruthy();
    expect(distanceObj["near"] > 0).toBeTruthy();
    expect(distanceObj["far"] > 0).toBeTruthy();
});