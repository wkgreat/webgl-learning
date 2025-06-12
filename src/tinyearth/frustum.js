import { create, all } from 'mathjs';
const math = create(all);

export default class Frustum {

    /** @type {math.Matrix|null}*/
    left = null;
    /** @type {math.Matrix|null}*/
    right = null;
    /** @type {math.Matrix|null}*/
    bottom = null;
    /** @type {math.Matrix|null}*/
    top = null;
    /** @type {math.Matrix|null}*/
    near = null;
    /** @type {math.Matrix|null}*/
    far = null;

    /** @type {math.Matrix|null}*/
    viewpoint = null;

    /**
     * @param {math.Matrix|null} left
     * @param {math.Matrix|null} right
     * @param {math.Matrix|null} bottom
     * @param {math.Matrix|null} top
     * @param {math.Matrix|null} near
     * @param {math.Matrix|null} far      
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

    // 六个视锥体平面（左、右、下、上、近、远）
    const planes = {
        left: math.add(row(m, 3), row(m, 0)),
        right: math.subtract(row(m, 3), row(m, 0)),
        bottom: math.add(row(m, 3), row(m, 1)),
        top: math.subtract(row(m, 3), row(m, 1)),
        near: math.add(row(m, 3), row(m, 2)),
        far: math.subtract(row(m, 3), row(m, 2))
    };

    const f = new Frustum(
        planes["left"] || null,
        planes["right"] || null,
        planes["bottom"] || null,
        planes["top"] || null,
        planes["near"] || null,
        planes["far"] || null,
    );

    const vp = math.matrix([viewpoint[0], viewpoint[1], viewpoint[2]]);

    f.setViewpoint(vp);

    return f;
}