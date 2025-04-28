import { mat4 } from "gl-matrix";

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