export interface WebGPUContext {
    adaptor: GPUAdapter
    device: GPUDevice
    canvas: HTMLCanvasElement
    context: GPUCanvasContext
};

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

export async function getGPUContext(canvas: HTMLCanvasElement): Promise<WebGPUContext | null> {

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

    const context = canvas.getContext("webgpu") as GPUCanvasContext | null;

    if (!context) {
        console.error("context is null");
        return null;
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context?.configure({
        device: device,
        format: presentationFormat
    })

    return {
        adaptor,
        device,
        canvas,
        context
    };

}