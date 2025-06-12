import { vec3, vec4, mat4 } from "gl-matrix";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import { create, all } from 'mathjs';
const math = create(all);

/**
 * @class Camera
 * @property {vec4} from 相机位置点
 * @property {vec4} to 相机目标点
 * @property {vec4} up 相机up向量
 * @property {mat4} viewMtx 视矩阵
 * @property {mat4} invViewMtx 视矩阵的逆
*/
class Camera {

    #from = vec4.fromValues(1, 1, 1, 1);
    #to = vec4.fromValues(0, 0, 0, 1);
    #up = vec4.fromValues(0, 1, 0, 0);
    #viewMtx = mat4.create();
    #invViewMtx = mat4.create();
    #changeFunc = [];
    #viewMtx64 = math.identity(4);
    #invViewMtx64 = math.identity(4);

    constructor(from, to, up) {
        this.setFrom(from);
        this.setTo(to);
        this.setUp(up);
    }

    setFrom(vin) {
        this.setVector4(this.#from, vin);
    }
    setTo(vin) {
        this.setVector4(this.#to, vin);
    }
    setUp(vin) {
        this.setVector4(this.#up, vin);
    }

    setVector4(vout, vin) {
        const len = vin.length;
        if (len < 3) {
            console.log("len < 3");
        } else if (len == 3) {
            vec4.set(vout, vin[0], vin[1], vin[2], 1);
        } else {
            vec4.set(vout, vin[0], vin[1], vin[2], vin[3]);
        }
    }

    _vec3(v) {
        return vec3.set(vec3.create(), v[0], v[1], v[2]);
    }

    _look() {
        mat4.lookAt(this.#viewMtx, this._vec3(this.#from), this._vec3(this.#to), this._vec3(this.#up));
        mat4.invert(this.#invViewMtx, this.#viewMtx);

        const eye = math.matrix([this.#from[0], this.#from[1], this.#from[2]]);
        const target = math.matrix([this.#to[0], this.#to[1], this.#to[2]]);
        const up = math.matrix([this.#up[0], this.#up[1], this.#up[2]]);

        const z = math.divide(
            math.subtract(eye, target),
            math.norm(math.subtract(eye, target))
        );
        const x = math.divide(
            math.cross(up, z),
            math.norm(math.cross(up, z))
        );
        const y = math.cross(z, x);

        const tx = -math.dot(x, eye);
        const ty = -math.dot(y, eye);
        const tz = -math.dot(z, eye);

        this.#viewMtx64 = math.matrix([
            [x.get([0]), x.get([1]), x.get([2]), tx],
            [y.get([0]), y.get([1]), y.get([2]), ty],
            [z.get([0]), z.get([1]), z.get([2]), tz],
            [0, 0, 0, 1]
        ]);

        this.#invViewMtx64 = math.inv(this.#viewMtx64);

    }

    getMatrix() {
        this._look();
        return {
            viewMtx: this.#viewMtx,
            invViewMtx: this.#invViewMtx,
            viewMtx64: this.#viewMtx64,
            invViewMtx: this.#invViewMtx64
        };
    }

    /**
     * @description 相机绕目标点(to)旋转
     * @param {number} dx x方向上旋转（绕y轴旋转）的角度
     * @param {number} dy y方向上旋转（绕x轴旋转）的角度
     * @returns {void}
    */
    round(dx, dy) {

        const viewFrom4 = vec4.transformMat4(vec4.create(), this.#from, this.#viewMtx);
        const viewTo4 = vec4.transformMat4(vec4.create(), this.#to, this.#viewMtx);
        const viewFrom3 = this._vec3(viewFrom4);
        const viewTo3 = this._vec3(viewTo4);

        vec3.rotateY(viewFrom3, viewFrom3, viewTo3, dx); // 绕Y轴旋转dx
        vec3.rotateX(viewFrom3, viewFrom3, viewTo3, dy); // 绕x轴旋转dy

        vec4.set(viewFrom4, viewFrom3[0], viewFrom3[1], viewFrom3[2], 1);
        vec4.transformMat4(this.#from, viewFrom4, this.#invViewMtx);

        this._look();

        for (let f of this.#changeFunc) {
            f(this);
        }
    }

    /**
     * @description 缩放（相机前进或后退）
     * @param {number} f 缩放系数 
    */
    zoom(f) {
        const d = vec4.create();
        const fromLonLatAlt = proj4(EPSG_4978, EPSG_4326, Array.from(this.#from.slice(0, 3)));
        const toLonLatAlt = [fromLonLatAlt[0], fromLonLatAlt[1], 1];
        const to = proj4(EPSG_4326, EPSG_4978, toLonLatAlt);
        const toVec4 = vec4.fromValues(to[0], to[1], to[2], 1);
        vec4.sub(d, toVec4, this.#from);
        const factor = Math.sign(f) * 0.1;
        vec4.scale(d, d, factor);
        vec4.add(this.#from, this.#from, d);
        this._look();

        for (let f of this.#changeFunc) {
            f(this);
        }
    }

    /**
     * @description 相机平移
     * @param {number} dx x轴方向平移量
     * @param {number} dy y轴方向平移量
    */
    move(dx, dy) {
        const viewFrom4 = vec4.transformMat4(vec4.create(), this.#from, this.#viewMtx);
        const viewTo4 = vec4.transformMat4(vec4.create(), this.#to, this.#viewMtx);

        const mtx = mat4.create();
        mat4.translate(mtx, mtx, [dx, dy, 0]);
        vec4.transformMat4(viewFrom4, viewFrom4, mtx);
        vec4.transformMat4(viewTo4, viewTo4, mtx);

        vec4.transformMat4(this.#from, viewFrom4, this.#invViewMtx);
        vec4.transformMat4(this.#to, viewTo4, this.#invViewMtx);

        this._look();
        for (let f of this.#changeFunc) {
            f(this);
        }

    }

    addOnchangeEeventListener(f) {
        this.#changeFunc.push(f);
    }

    getFrom() {
        return this.#from;
    }



};

const LEFTBUTTON = 0;
const WHEELBUTTON = 1;
const RIGHTBUTTON = 2;

export class CameraMouseControl {

    camera = null;
    canvas = null;
    leftButtonDown = false;
    wheelButtonDown = false;
    lastMouseX = 0;
    lastMouseY = 0;
    handleMouseDownFunc = null;
    handleMouseMoveFunc = null;
    handleMouseUpFunc = null;
    handleMouseLeaveFunc = null;
    handleMouseWheelFunc = null;

    /**
     * @param {Camera} camera
     * @param {HTMLElement} canvas  
    */
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;
    }

    handleMouseDown() {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = true;
            } else if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = true;
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;

        }
    }

    handleMouseMove() {
        const that = this;
        return (e) => {
            if (this.leftButtonDown) {
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.camera.round(-dx / 200, -dy / 200);
            } else if (this.wheelButtonDown) {
                e.preventDefault();
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.camera.move(-dx / 5, dy / 5);
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;
        }
    }

    handleMouseUp() {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = false;
            }
            if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = false;
            }
        }
    }

    handleMouseLeave() {
        const that = this;
        return (e) => {
            that.leftButtonDown = false;
            that.wheelButtonDown = false;
        }
    }

    handleMouseWheel() {
        const that = this;
        return (e) => {
            e.preventDefault();
            this.camera.zoom(e.wheelDeltaY / 120 * (1 / 10));
        }
    }

    enable() {
        this.handleMouseDownFunc = this.handleMouseDown();
        this.handleMouseMoveFunc = this.handleMouseMove();
        this.handleMouseUpFunc = this.handleMouseUp();
        this.handleMouseLeaveFunc = this.handleMouseLeave();
        this.handleMouseWheelFunc = this.handleMouseWheel();
        this.canvas.addEventListener('mousedown', this.handleMouseDownFunc);
        this.canvas.addEventListener('mousemove', this.handleMouseMoveFunc)
        this.canvas.addEventListener('mouseup', this.handleMouseUpFunc);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeaveFunc);
        this.canvas.addEventListener('wheel', this.handleMouseWheelFunc);
    }
    disable() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDownFunc);
        this.canvas.removeEventListener('mousemove', this.handleMouseMoveFunc)
        this.canvas.removeEventListener('mouseup', this.handleMouseUpFunc);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeaveFunc);
        this.canvas.removeEventListener('wheel', this.handleMouseWheelFunc);
        this.handleMouseDownFunc = null;
        this.handleMouseMoveFunc = null;
        this.handleMouseUpFunc = null;
        this.handleMouseLeaveFunc = null;
        this.handleMouseWheelFunc = null;
    }
};

export default Camera;