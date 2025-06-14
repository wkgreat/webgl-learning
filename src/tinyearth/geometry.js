import math, { hpv, hpvadd, hpvdiv, hpvequal, hpvmatrix, hpvmul, hpvsub, math_normalize } from "./highp_math.js";

export class Triangle {

    /** @type {math.Matrix}*/
    p0 = hpvmatrix([0, 0, 0]);
    /** @type {math.Matrix}*/
    p1 = hpvmatrix([1, 0, 0]);
    /** @type {math.Matrix}*/
    p2 = hpvmatrix([0, 1, 0]);

    /**
     * @param {math.Matrix} p0
     * @param {math.Matrix} p1
     * @param {math.Matrix} p2 
    */
    constructor(p0, p1, p2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
    }
}

export class Ray {
    origin = hpvmatrix([0, 0, 0]);
    direct = hpvmatrix([1, 1, 1]);

    /**
     * @param {math.Matrix} origin 
     * @param {math.Matrix} direct 
    */
    constructor(origin, direct) {
        this.origin = origin;
        this.direct = math_normalize(direct);
    }

    /**
     * @param {math.Matrix} p
     * @returns {boolean} 
    */
    pointOnRay(p) {
        const d = math.subtract(p, this.origin);
        if (math.equal(math.norm(d), hpv(0))) {
            return true;
        }
        const d0 = math_normalize(d);
        const d1 = math_normalize(this.direct);
        const c = math.norm(math.cross(d0, d1));

        if (math.smaller(math.abs(c), hpv(1E-6))) {
            return true;
        }
        return false;
    }

    /**
     * @param {Ray} other_ray
     * @returns {boolean} 
    */
    collineation(other_ray) {
        const d0 = math_normalize(this.direct);
        const d1 = math_normalize(other_ray.direct);
        const a = math.norm(math.cross(d0, d1));
        const b = math.subtract(this.origin, other_ray.origin);

        if (math.equal(a, hpv(0))) {
            if (math.equal(math.norm(b), hpv(0))) {
                return true;
            }
            const c = math.norm(math.cross(math_normalize(b), d0));
            if (math.equal(c, hpv(0))) {
                return true;
            }
        }
        return false;
    }
};

export class Plane {
    /**@type {math.Matrix} */
    params = hpvmatrix([0, 0, 0, 0]);
    constructor(params) {
        this.params = params;
    }

    /**
     * @param {math.Matrix} p0
     * @param {math.Matrix} p1
     * @param {math.Matrix} p2
     * @returns {Plane|null} 
    */
    static fromThreePoints(p0, p1, p2) {


        const v1 = math.subtract(p1, p0);
        const v2 = math.subtract(p2, p0);

        const n = math.cross(v1, v2);
        if (math.equal(math.norm(n), hpv(0))) {
            // 三点共线
            return null;
        }

        const A = n.get([0]);
        const B = n.get([1]);
        const C = n.get([2]);
        const D = hpvmul(
            hpv(-1),
            hpvadd(
                hpvadd(
                    hpvmul(hpv(A), p0.get([0])),
                    hpvmul(hpv(B), p0.get([1]))
                ),
                hpvmul(hpv(C), p0.get([2]))
            )
        );

        return new Plane(hpvmatrix([A, B, C, D]));
    }
}

/**
 * @param {math.Matrix} p
 * @param {Plane} plane  
*/
export function pointOutSidePlane(p, plane) {
    return math.dot(p, plane.params) < 0;
}


/**
 * @param {Ray} ray
 * @param {Triangle} triangle
 * @returns {{corss:boolean,uvt:Array}} cross boolean, uvt u weight of p1, v weight of p2, t weight of ray
*/
export function rayCrossTriangle(ray, triangle) {

    const epsilon = 1E-5;
    const e1 = math.subtract(triangle.p1, triangle.p0);
    const e2 = math.subtract(triangle.p2, triangle.p0);
    const q = math.cross(ray.direct, e2);
    const a = math.dot(e1, q);
    if (a > -epsilon && a < epsilon) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const f = 1 / a;
    const s = math.subtract(ray.origin, triangle.p0);
    const u = f * math.dot(s, q);
    if (u < 0.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const r = math.cross(s, e1);
    const v = f * math.dot(ray.direct, r);
    if (v < 0.0 || u + v > 1.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const t = f * math.dot(e2, r);
    return {
        cross: true,
        uvt: [u, v, t]
    }

}

/**
 * @param {Plane} plane0
 * @param {Plane} plane1
 * @return {{corss: boolean, ray: Ray|null}}
*/
export function planeCrossPlane(plane0, plane1) {

    let n0 = hpvmatrix([plane0.params.get([0]), plane0.params.get([1]), plane0.params.get([2])]);
    n0 = math_normalize(n0);

    let n1 = hpvmatrix([plane1.params.get([0]), plane1.params.get([1]), plane1.params.get([2])]);
    n1 = math_normalize(n1);

    let d = math.cross(n0, n1);

    if (hpvequal(math.norm(d), 0)) {
        return {
            corss: false,
            ray: null
        }
    }
    let x = hpv(0);
    let y = hpv(0);
    let z = hpv(0);
    const A1 = plane0.params.get([0]);
    const B1 = plane0.params.get([1]);
    const C1 = plane0.params.get([2]);
    const D1 = plane0.params.get([3]);
    const A2 = plane1.params.get([0]);
    const B2 = plane1.params.get([1]);
    const C2 = plane1.params.get([2]);
    const D2 = plane1.params.get([3]);
    let detX = hpvsub(hpvmul(B1, C2), hpvmul(B2, C1));
    let detY = hpvsub(hpvmul(A1, C2), hpvmul(A2, C1));
    let detZ = hpvsub(hpvmul(A1, B2), hpvmul(A2, B1));
    if (math.larger(math.abs(detZ), hpv(0))) {
        // x = (B1 * D2 - B2 * D1) / detZ;
        // y = (A2 * D1 - A1 * D2) / detZ;
        // z = 0;
        x = hpvdiv(hpvsub(hpvmul(B1, D2), hpvmul(B2, D1)), detZ);
        y = hpvdiv(hpvsub(hpvmul(A2, D1), hpvmul(A1, D2)), detZ);
        z = hpv(0);
    } else if (math.larger(detY, hpv(0))) {
        // x = (C1 * D2 - C2 * D1) / detY;
        // y = 0;
        // z = (A2 * D1 - A1 * D2) / detY;
        x = hpvdiv(hpvsub(hpvmul(C1, D2), hpvmul(C2, D1)), detY);
        y = hpv(0);
        z = hpvdiv(hpvsub(hpvmul(A2, D1), hpvmul(A1, D2)), detY);

    } else {
        // x = 0;
        // y = (C1 * D2 - C2 * D1) / detX;
        // z = (B2 * D1 - B1 * D2) / detX;
        x = hpv(0);
        y = hpvdiv(hpvsub(hpvmul(C1, D2), hpvmul(C2, D1)), detX);
        z = hpvdiv(hpvsub(hpvmul(B2, D1), hpvmul(B1, D2)), detX);
    }
    const ray = new Ray(hpvmatrix([x, y, z]), d);

    return {
        cross: true,
        ray: ray
    }

}