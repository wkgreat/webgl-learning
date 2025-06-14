import { glMatrix, mat4 } from "gl-matrix";
glMatrix.setMatrixArrayType(Array);

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

};

export default Projection;