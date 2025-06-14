import { Plane } from './geometry.js';
import math, { hpvmatrix, math_affline } from './highp_math.js';

export default class Frustum {

    /** @type {hpvmatrix|null}*/
    left = null;
    /** @type {hpvmatrix|null}*/
    right = null;
    /** @type {hpvmatrix|null}*/
    bottom = null;
    /** @type {hpvmatrix|null}*/
    top = null;
    /** @type {hpvmatrix|null}*/
    near = null;
    /** @type {hpvmatrix|null}*/
    far = null;
    /** @type {hpvmatrix|null}*/
    viewpoint = null;
    /** @type {hpvmatrix|null}*/
    centerpoint = null;

    /**
     * @param {hpvmatrix|null} left
     * @param {hpvmatrix|null} right
     * @param {hpvmatrix|null} bottom
     * @param {hpvmatrix|null} top
     * @param {hpvmatrix|null} near
     * @param {hpvmatrix|null} far      
    */
    constructor(left, right, bottom, top, near, far) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.near = near;
        this.far = far;
    }

    getViewpoint() {
        return this.viewpoint;
    }

    /**
     * @param {math.Matrix} p 
    */
    setViewpoint(p) {
        this.viewpoint = p;
    }

    getCenterpoint() {
        return this.centerpoint;
    }

    setCenterpoint(p) {
        this.centerpoint = p;
    }

    /**
     * @param {math.Matrix} p
     * @returns {object} 
    */
    getDistanceOfPoint(p) {
        return {
            left: this.left && math.dot(p, this.left),
            right: this.right && math.dot(p, this.right),
            bottom: this.bottom && math.dot(p, this.bottom),
            top: this.top && math.dot(p, this.top),
            near: this.near && math.dot(p, this.near),
            far: this.far && math.dot(p, this.far)
        }
    }
}

function row(m, i) {
    return math.matrix([m.get([i, 0]), m.get([i, 1]), m.get([i, 2]), m.get([i, 3])]);
}

/**
 * @param {math.Matrix} projMtx64 
 * @param {math.Matrix} viewMtx64 
 * @returns {Frustum}
*/
export function buildFrustum(projMtx64, viewMtx64, viewpoint) {

    const m = math.multiply(projMtx64, viewMtx64);
    const im = math.inv(m);

    // FAST EXTRACTION
    // 六个视锥体平面（左、右、下、上、近、远）
    const planes = {
        left: math.add(row(m, 3), row(m, 0)),
        right: math.subtract(row(m, 3), row(m, 0)),
        bottom: math.add(row(m, 3), row(m, 1)),
        top: math.subtract(row(m, 3), row(m, 1)),
        near: math.add(row(m, 3), row(m, 2)),
        far: math.subtract(row(m, 3), row(m, 2))
    };

    // SLOW EXTRACTION
    // const p0 = math_affline(hpvmatrix([-1, -1, -1]), im);
    // const p1 = math_affline(hpvmatrix([1, -1, -1]), im);
    // const p2 = math_affline(hpvmatrix([1, 1, -1]), im);
    // const p3 = math_affline(hpvmatrix([-1, 1, -1]), im);
    // const p4 = math_affline(hpvmatrix([-1, 1, 1]), im);
    // const p5 = math_affline(hpvmatrix([-1, -1, 1]), im);
    // const p6 = math_affline(hpvmatrix([1, -1, 1]), im);
    // const p7 = math_affline(hpvmatrix([1, 1, 1]), im);

    // const planes = {
    //     left: Plane.fromThreePoints(p5, p0, p3).params,
    //     right: Plane.fromThreePoints(p1, p6, p7).params,
    //     bottom: Plane.fromThreePoints(p6, p5, p0).params,
    //     top: Plane.fromThreePoints(p4, p3, p2).params,
    //     near: Plane.fromThreePoints(p3, p0, p1).params,
    //     far: Plane.fromThreePoints(p7, p6, p5).params
    // };

    // 归一化
    // planes.left = math.divide(planes.left, math.norm(vec3Fromvec4(planes.left)));
    // planes.right = math.divide(planes.right, math.norm(vec3Fromvec4(planes.right)));
    // planes.bottom = math.divide(planes.bottom, math.norm(vec3Fromvec4(planes.bottom)));
    // planes.top = math.divide(planes.top, math.norm(vec3Fromvec4(planes.top)));
    // planes.near = math.divide(planes.near, math.norm(vec3Fromvec4(planes.near)));
    // planes.far = math.divide(planes.far, math.norm(vec3Fromvec4(planes.far)));

    const f = new Frustum(
        planes["left"] || null,
        planes["right"] || null,
        planes["bottom"] || null,
        planes["top"] || null,
        planes["near"] || null,
        planes["far"] || null,
    );

    const vp = hpvmatrix([viewpoint[0], viewpoint[1], viewpoint[2]]);
    f.setViewpoint(vp);

    const cp = math.multiply(im, hpvmatrix([0, 0, 0, 1]));
    f.setCenterpoint(hpvmatrix([cp.get([0]), cp.get([1]), cp.get([2])]));

    return f;
}