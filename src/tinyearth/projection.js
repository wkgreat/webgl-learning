import { mat4 } from "gl-matrix";
import { create, all } from 'mathjs';
const math = create(all);

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
        const f = 1 / Math.tan(this.fovy / 2);
        const rangeInv = 1 / (this.near - this.far);

        // 构造 4x4 矩阵
        const matrix = math.matrix([
            [f / this.aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (this.far + this.near) * rangeInv, 2 * this.far * this.near * rangeInv],
            [0, 0, -1, 0]
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