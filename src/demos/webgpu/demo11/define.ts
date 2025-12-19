export interface WebGPUContext {
    adaptor: GPUAdapter
    device: GPUDevice
    canvas: HTMLCanvasElement
    context: GPUCanvasContext
};