import { mat4 } from "gl-matrix";
import math, { hpv, hpvadd, hpvdiv, hpvmatrix, hpvmul, hpvsub, hpvtan } from "./highp_math.js";

class Projection {

    fovy = Math.PI / 3;
    aspect = 1;
    near = 0.1;
    far = 1E10;
    projMtx = mat4.create();

    constructor(fovy, aspect, near, far) {
        this.fovy = fovy;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    setAspect(aspect) {
        this.aspect = aspect;
    }

    perspective() {
        return mat4.perspective(this.projMtx, this.fovy, this.aspect, this.near, this.far);
    }

    perspective64() {
        const f = hpvdiv(hpv(1), hpvtan(hpvdiv(this.fovy, hpv(2))))
        const rangeInv = hpvdiv(hpv(1), hpvsub(hpv(this.near), hpv(this.far)));

        // 构造 4x4 矩阵
        const matrix = hpvmatrix([
            [math.divide(hpv(f), hpv(this.aspect)), hpv(0), hpv(0), hpv(0)],
            [hpv(0), hpv(f), hpv(0), hpv(0)],
            [hpv(0), hpv(0), hpvmul(hpvadd(hpv(this.far), hpv(this.near)), rangeInv), hpvmul(hpv(2), hpvmul(hpv(this.far), hpvmul(hpv(this.near), rangeInv)))],
            [hpv(0), hpv(0), hpv(-1), hpv(0)]
        ]);

        return matrix;
    }

    // 获取视锥体
    getViewFrustum() {
        const yn = Math.atan(this.fovy / 2) * this.near;
        const yf = Math.atan(this.fovy / 2) * this.far;
        const hn = 2 * yn;
        const wn = this.aspect * hn;
        const hf = 2 * yf;
        const wf = this.aspect * hf;
        const xn = wn / 2;
        const xf = wf / 2;
        return [xn, yn, this.near, xf, yf, this.far];
    }

};

export default Projection;