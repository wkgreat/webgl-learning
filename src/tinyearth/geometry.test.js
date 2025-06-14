import { beforeAll, describe, expect, test } from '@jest/globals';
import { Plane, planeCrossPlane, Ray, rayCrossTriangle, Triangle } from './geometry';
import math, { hpv, hpvequal, hpvmatrix, hpvmul, math_affline, math_normalize, math_v3tv4, math_v4tv3 } from './highp_math';
import { buildFrustum } from './frustum';
import Projection from './projection';
import Camera from './camera';
import proj4 from 'proj4';
import { EPSG_4326, EPSG_4978 } from './proj';

describe("geometry", () => {

    test("ray_cross_triangle", () => {

        const triangle = new Triangle(
            hpvmatrix([0, 0, 0]),
            hpvmatrix([0, 1, 0]),
            hpvmatrix([1, 0, 0])
        );
        let origin = hpvmatrix([0, 0, 10]);
        let direct = math.subtract(hpvmatrix([0, 0, 0]), origin);
        let ray = new Ray(origin, direct);
        let r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();
        expect(r.uvt[2]).toBeCloseTo(10, 1E-10);


        origin = hpvmatrix([0, 0, 10]);
        direct = math.subtract(hpvmatrix([0, 1, 0]), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();

        origin = hpvmatrix([0, 0, 10]);
        direct = math.subtract(hpvmatrix([1, 0, 0]), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();

        const p = math.add(math.add(math.multiply(triangle.p0, hpv(0.6)), math.multiply(triangle.p1, hpv(0.3))), math.multiply(triangle.p2, hpv(0.1)))
        origin = hpvmatrix([0, 0, 10]);
        direct = math.subtract(p, origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();
        expect(r.uvt[0]).toBeCloseTo(0.3, 1E-10);
        expect(r.uvt[1]).toBeCloseTo(0.1, 1E-10);

        origin = hpvmatrix([0, 0, 10]);
        direct = math.subtract(hpvmatrix([1, 1, 0]), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeFalsy();

    });

});

describe("ray", () => {
    test("ray_collineation", () => {
        const ray0 = new Ray(hpvmatrix([0, 0, 0]), math.subtract(hpvmatrix([1, 1, 1]), hpvmatrix([0, 0, 0])));
        const ray1 = new Ray(hpvmatrix([-10, -10, -10]), math.subtract(hpvmatrix([-20, -20, -20]), hpvmatrix([-10, -10, -10])));

        expect(ray0.collineation(ray1)).toBeTruthy();
    });
});

describe("plane", () => {

    test("plane_from_points", () => {
        let p0 = hpvmatrix([1, 2, 3]);
        let p1 = hpvmatrix([4, 5, 6]);
        let p2 = hpvmatrix([7, 8, 2]);

        let plane = Plane.fromThreePoints(p0, p1, p2);

        expect(hpvequal(hpvmul(math_v3tv4(p0), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p1), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p2), plane.params), hpv(0))).toBeTruthy();


        p0 = hpvmatrix([-1, -1, 1]);
        p1 = hpvmatrix([-1, -1, -1]);
        p2 = hpvmatrix([-1, 1, -1]);

        plane = Plane.fromThreePoints(p0, p1, p2);

        expect(hpvequal(hpvmul(math_v3tv4(p0), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p1), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p2), plane.params), hpv(0))).toBeTruthy();

        p0 = hpvmatrix([-1, 1, 1]);
        p1 = hpvmatrix([-1, 1, -1]);
        p2 = hpvmatrix([1, 1, -1]);

        plane = Plane.fromThreePoints(p0, p1, p2);

        expect(hpvequal(hpvmul(math_v3tv4(p0), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p1), plane.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p2), plane.params), hpv(0))).toBeTruthy();

    })

});

describe("plane_cross_plane", () => {


    test("plane_cross_plane_correct", () => {

        const p0 = hpvmatrix([-1, -1, 1]);
        const p1 = hpvmatrix([-1, -1, -1]);
        const p2 = hpvmatrix([-1, 1, -1]);

        const plane0 = Plane.fromThreePoints(p0, p1, p2);

        expect(hpvequal(hpvmul(math_v3tv4(p0), plane0.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p1), plane0.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p2), plane0.params), hpv(0))).toBeTruthy();

        const p3 = hpvmatrix([-1, 1, 1]);
        const p4 = hpvmatrix([-1, 1, -1]);
        const p5 = hpvmatrix([1, 1, -1]);

        const plane1 = Plane.fromThreePoints(p3, p4, p5);

        expect(hpvequal(hpvmul(math_v3tv4(p3), plane1.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p4), plane1.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(p5), plane1.params), hpv(0))).toBeTruthy();

        const ray = planeCrossPlane(plane0, plane1);
        expect(hpvequal(hpvmul(math_v3tv4(ray.ray.origin), plane0.params), hpv(0))).toBeTruthy();
        expect(hpvequal(hpvmul(math_v3tv4(ray.ray.origin), plane1.params), hpv(0))).toBeTruthy();

        const other_ray = new Ray(hpvmatrix([-1, 1, -1]), math.subtract(hpvmatrix([-1, 1, 1]), hpvmatrix([-1, 1, -1])));
        expect(ray.ray.collineation(other_ray)).toBeTruthy();

    });

})

describe("frustum_ray", () => {

    function transform(p, m) {
        let q = math_v3tv4(p);
        q = math.multiply(m, q);
        q = math.divide(q, q.get([3]));
        return math_v4tv3(q);
    }


    function createViewMatrix(from, to, up) {
        const z = math.divide(
            math.subtract(from, to),
            math.norm(math.subtract(from, to))
        );
        const x = math.divide(
            math.cross(up, z),
            math.norm(math.cross(up, z))
        );
        const y = math.cross(z, x);

        const tx = hpvmul(hpv(-1), math.dot(x, from));
        const ty = hpvmul(hpv(-1), math.dot(y, from));
        const tz = hpvmul(hpv(-1), math.dot(z, from));

        return hpvmatrix([
            [x.get([0]), x.get([1]), x.get([2]), tx],
            [y.get([0]), y.get([1]), y.get([2]), ty],
            [z.get([0]), z.get([1]), z.get([2]), tz],
            [hpv(0), hpv(0), hpv(0), hpv(1)]
        ]);
    }

    test("frutum_ray_corrent_1", () => {
        const width = 500;
        const height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        const cameraFrom = hpvmatrix(proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]));
        const cameraTo = hpvmatrix([0, 0, 0]);
        const cameraUp = hpvmatrix([0, 0, 1]);
        // const camera = new Camera(cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective64();
        const viewMtx = createViewMatrix(cameraFrom, cameraTo, cameraUp);
        const M = math.multiply(projMtx, viewMtx);
        const IM = math.inv(M);
        const frustum = buildFrustum(projMtx, viewMtx, cameraFrom);
        const view = cameraFrom;

        const ray0 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.bottom));
        const ray1 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.bottom));
        const ray2 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.top));
        const ray3 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.top));

        const x0 = math_affline(hpvmatrix([-1, -1, -1]), IM);
        const x1 = math_affline(hpvmatrix([1, -1, -1]), IM);
        const x2 = math_affline(hpvmatrix([1, 1, -1]), IM);
        const x3 = math_affline(hpvmatrix([-1, 1, -1]), IM);
        const x5 = math_affline(hpvmatrix([-1, -1, 1]), IM);

        expect(ray0.ray.pointOnRay(x0)).toBeTruthy();
        expect(ray0.ray.pointOnRay(x5)).toBeTruthy();

        expect(ray0.ray.pointOnRay(view)).toBeTruthy();
        expect(ray1.ray.pointOnRay(view)).toBeTruthy();
        expect(ray2.ray.pointOnRay(view)).toBeTruthy();
        expect(ray3.ray.pointOnRay(view)).toBeTruthy();

        console.log("d0: ", math_normalize(ray0.ray.direct));
        console.log("x0 x5: ", math_normalize(math.subtract(x0, x5)));
        console.log("x0 v: ", math_normalize(math.subtract(view, x0)));
        console.log("x5 v: ", math_normalize(math.subtract(view, x5)));

        console.log("norm: ", math.norm(math.subtract(x5, x0)));
        console.log("norm: ", math.norm(math.subtract(view, x0)));

        const other_ray0 = new Ray(view, math_normalize(math.subtract(view, x0)));
        const other_ray1 = new Ray(view, math_normalize(math.subtract(view, x1)));
        const other_ray2 = new Ray(view, math_normalize(math.subtract(view, x2)));
        const other_ray3 = new Ray(view, math_normalize(math.subtract(view, x3)));

        expect(ray0.ray.collineation(other_ray0)).toBeTruthy();
        expect(ray1.ray.collineation(other_ray1)).toBeTruthy();
        expect(ray2.ray.collineation(other_ray2)).toBeTruthy();
        expect(ray3.ray.collineation(other_ray3)).toBeTruthy();
    })

    test("frustum_ray_correct_2", () => {
        const width = 1000;
        const height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective64();
        const viewMtx = camera.getMatrix().viewMtx64;
        const M = math.multiply(projMtx, viewMtx);
        const IM = math.inv(M);
        const frustum = buildFrustum(projMtx, viewMtx, cameraFrom);

        const view = hpvmatrix([cameraFrom[0], cameraFrom[1], cameraFrom[2]]);

        const ray0 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.bottom));
        const ray1 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.bottom));
        const ray2 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.top));
        const ray3 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.top));

        const x0 = math_affline(hpvmatrix([-1, -1, -1]), IM);
        const x1 = math_affline(hpvmatrix([1, -1, -1]), IM);
        const x2 = math_affline(hpvmatrix([1, 1, -1]), IM);
        const x3 = math_affline(hpvmatrix([-1, 1, -1]), IM);
        const x5 = math_affline(hpvmatrix([-1, -1, 1]), IM);

        expect(ray0.ray.pointOnRay(x0)).toBeTruthy();
        expect(ray0.ray.pointOnRay(x5)).toBeTruthy();

        expect(ray0.ray.pointOnRay(view)).toBeTruthy();
        expect(ray1.ray.pointOnRay(view)).toBeTruthy();
        expect(ray2.ray.pointOnRay(view)).toBeTruthy();
        expect(ray3.ray.pointOnRay(view)).toBeTruthy();

        const other_ray0 = new Ray(view, math_normalize(math.subtract(view, x0)));
        const other_ray1 = new Ray(view, math_normalize(math.subtract(view, x1)));
        const other_ray2 = new Ray(view, math_normalize(math.subtract(view, x2)));
        const other_ray3 = new Ray(view, math_normalize(math.subtract(view, x3)));

        expect(ray0.ray.collineation(other_ray0)).toBeTruthy();
        expect(ray1.ray.collineation(other_ray1)).toBeTruthy();
        expect(ray2.ray.collineation(other_ray2)).toBeTruthy();
        expect(ray3.ray.collineation(other_ray3)).toBeTruthy();


    })



});