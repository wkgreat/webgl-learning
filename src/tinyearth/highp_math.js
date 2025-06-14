import { create, all } from 'mathjs';
const config = { number: 'BigNumber', precision: 128 };
const math = create(all, config);
export default math;

/**
 * @param {math.Matrix} v
 * @returns {math.Matrix} 
*/
export function math_normalize(v) {
    return math.divide(v, math.norm(v));
}

/**
 * @param {math.Matrix} v
 * @returns {math.Matrix} 
*/
export function math_v3tv4(v) {
    if (hpvequal(math.size(v).get([0]), 3)) {
        return hpvmatrix([v.get([0]), v.get([1]), v.get([2]), 1]);
    } else if (hpvequal(math.size(v).get([0]), 4)) {
        return v;
    }
}

/**
 * @param {math.Matrix} v
 * @returns {math.Matrix} 
*/
export function math_v4tv3(v) {
    return hpvmatrix([v.get([0]), v.get([1]), v.get([2])]);
}

export function math_affline(p, m) {
    let q = math_v3tv4(p);
    q = math.multiply(m, q);
    q = math.divide(q, q.get([3]));
    return math_v4tv3(q);
}

export function hpv(v) {
    return math.bignumber(v);
}

export function hpvadd(v0, v1) {
    return math.add(hpv(v0), hpv(v1));
}

export function hpvmul(v0, v1) {
    return math.multiply(hpv(v0), hpv(v1));
}

export function hpvsub(v0, v1) {
    return math.subtract(hpv(v0), hpv(v1));
}

export function hpvdiv(v0, v1) {
    return math.divide(hpv(v0), hpv(v1));
}

export function hpvtan(v) {
    return math.tan(hpv(v));
}

export function mapArray(a, callback) {
    if (Array.isArray(a)) {
        return a.map(v => mapArray(v, callback));
    } else {
        return callback(a);
    }
}

export function hpvmatrix(m) {
    return math.matrix(mapArray(m, (v) => hpv(v)));
}

export function hpvequal(v0, v1) {
    return math.equal(hpv(v0), hpv(v1));
}

