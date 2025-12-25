export interface WebGPUContext {
    adaptor: GPUAdapter
    device: GPUDevice
    canvas: HTMLCanvasElement
    canvasContext: GPUCanvasContext,
    canvasFormat: GPUTextureFormat
};

export async function createGPUDevice(): Promise<GPUDevice | null> {
    const adaptor = await navigator.gpu.requestAdapter();

    if (!adaptor) {
        console.error("adaptor is null");
        return null;
    }

    const device = await adaptor?.requestDevice();

    if (!device) {
        console.error("device is null");
        return null;
    }

    return device;
}

export async function createGPUContext(canvas: HTMLCanvasElement): Promise<WebGPUContext | null> {

    const adaptor = await navigator.gpu.requestAdapter();

    if (!adaptor) {
        console.error("adaptor is null");
        return null;
    }

    const device = await adaptor?.requestDevice();

    if (!device) {
        console.error("device is null");
        return null;
    }

    const canvasContext = canvas.getContext("webgpu") as GPUCanvasContext | null;

    if (!canvasContext) {
        console.error("context is null");
        return null;
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    canvasContext?.configure({
        device: device,
        format: canvasFormat,
        /**
         * alpha mode:
         * opaque
         *      RGB = COLOR
         *      全屏游戏、背景不透明的应用
         * premultiplied: 
         *      RGB = Color * Alpha
         *      需要 Canvas 半透明显示网页底图的场景
         * 如果选择了premultiplied，则片元着色器中返回的颜色的RGB必须小于等于A, 如
         * ```
         * let color = vec3f(1.0, 0.0, 0.0); // 纯红
         * let alpha = 0.5;
         * return vec4f(color * alpha, alpha);
         * ```
        */
        alphaMode: 'premultiplied'
    })

    return {
        adaptor,
        device,
        canvas,
        canvasContext,
        canvasFormat
    };

}

interface Mesh {
    positions: Float32Array, // 3
    normals?: Float32Array, // 3
    texcoords?: Float32Array, // 2
    indicies?: Uint16Array, // 1
    vertexCount?: number,
    instanceCount?: number
}

export interface CubeInfo {
    positions: Float32Array,
    normals: Float32Array,
    texcoords: Float32Array,
    indices: Uint16Array
}

export function createCube() {
    const positions = new Float32Array([
        // +X (右)
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
        0.5, 0.5, 0.5,
        0.5, -0.5, 0.5,

        // -X (左)
        -0.5, -0.5, 0.5,
        -0.5, 0.5, 0.5,
        -0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5,

        // +Y (上)
        -0.5, 0.5, -0.5,
        -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, -0.5,

        // -Y (下)
        -0.5, -0.5, 0.5,
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5, 0.5,

        // +Z (前)
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        -0.5, 0.5, 0.5,

        // -Z (后)
        0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, 0.5, -0.5,
        0.5, 0.5, -0.5,
    ]);

    const normals = new Float32Array([
        // +X
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // -X
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // +Y
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // -Y
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // +Z
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // -Z
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    ]);

    const texcoords = new Float32Array([
        // +X
        0, 0, 1, 0, 1, 1, 0, 1,
        // -X
        0, 0, 1, 0, 1, 1, 0, 1,
        // +Y
        0, 0, 1, 0, 1, 1, 0, 1,
        // -Y
        0, 0, 1, 0, 1, 1, 0, 1,
        // +Z
        0, 0, 1, 0, 1, 1, 0, 1,
        // -Z
        0, 0, 1, 0, 1, 1, 0, 1,
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,   // +X
        4, 5, 6, 4, 6, 7,   // -X
        8, 9, 10, 8, 10, 11,   // +Y
        12, 13, 14, 12, 14, 15,   // -Y
        16, 17, 18, 16, 18, 19,   // +Z
        20, 21, 22, 20, 22, 23,   // -Z
    ]);

    return {
        positions,
        normals,
        texcoords,
        indices
    };
}

export function createQuad(): Mesh {

    const positions = new Float32Array([
        -1, -1, 0,
        1, 1, 0,
        -1, 1, 0,

        -1, -1, 0,
        1, -1, 0,
        1, 1, 0
    ]);

    const texcoords = new Float32Array([
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1
    ]);

    const vertexCount = positions.length / 3;
    const instanceCount = 2;

    return {
        positions,
        texcoords,
        vertexCount,
        instanceCount
    }

}