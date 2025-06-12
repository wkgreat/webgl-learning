import { beforeAll, describe, expect } from '@jest/globals';
import Projection from './projection';


describe("projection test", () => {

    test("perspective", () => {

        let width = 1000;
        let height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 1000);

        const projMtx32 = projection.perspective();
        const projMtx64 = projection.perspective64();

        for (let i = 0; i < 4; i += 1) {
            for (let j = 0; j < 4; j += 1) {
                expect(Math.abs(projMtx32[i * 4 + j] - projMtx64.get([i, j])) < 1E5).toBeTruthy();
            }
        }


    })

});