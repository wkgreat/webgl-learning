import { beforeAll, describe, expect } from '@jest/globals';
import Camera from './camera';


describe("camera", () => {

    test("lookat", () => {

        const cameraFrom = [1000, 1000, 1000];
        const cameraTo = [20, 30, 40];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(cameraFrom, cameraTo, cameraUp);

        const viewMtx32 = camera.getMatrix().viewMtx;
        const viewMtx64 = camera.getMatrix().viewMtx64;

        for (let i = 0; i < 4; i += 1) {
            for (let j = 0; j < 4; j += 1) {
                expect(Math.abs(viewMtx32[i * 4 + j] - viewMtx64.get([i, j])) < 1E5).toBeTruthy();
            }
        }


    })

});

