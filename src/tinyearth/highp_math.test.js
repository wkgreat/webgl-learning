import { beforeAll, describe, expect, test } from '@jest/globals';
import { mapArray } from './highp_math';

describe("highp_math", () => {

    test("map_array", () => {

        let a = [1, 2, 3];
        let b = mapArray(a, (v) => v + 1);
        expect(b).toMatchObject([2, 3, 4]);


        a = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
        b = mapArray(a, (v) => v + 1);
        expect(b[0]).toMatchObject([2, 3, 4]);
        expect(b[1]).toMatchObject([5, 6, 7]);
        expect(b[2]).toMatchObject([8, 9, 10]);

    });

});