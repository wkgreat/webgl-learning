import { createCube, getGPUContext } from './define';
import './styles.css';

import { mat4 } from 'gl-matrix';
import { Pane } from 'tweakpane';

const params = {
    world_rotateX: 0,
    world_rotateY: 0,
    world_rotateZ: 0
};

const pane = new Pane({
    title: '参数控制',
    expanded: true, // 默认展开
});

async function main() {

    const name = "draw cube";

    const cubeInfo = createCube();

    const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement | null;

    if (!canvas) {
        console.error("canvas is null");
        return;
    }

    const gpuContext = await getGPUContext(canvas);

    if (!gpuContext) {
        console.error("gpuContext is null");
        return;
    }

    const { device, context } = gpuContext;

    const module = device.createShaderModule({
        label: `${name} shader`,
        code: /* wgsl */`

        struct Vertex {
            @location(0) position: vec4f,
            @location(1) normal: vec3f,
            @location(2) texcoord: vec2f
        };

        struct Matrices {
            worldmtx: mat4x4<f32>,
            viewmtx: mat4x4<f32>,
            projmtx: mat4x4<f32>
        }

        struct VsOutput {
            @builtin(position) position: vec4f,
            @location(0) normal: vec3f,
            @location(1) texcoord: vec2f
        }

        @group(0) @binding(0) var<uniform> matrices: Matrices;

        @vertex fn vs(vert: Vertex) -> VsOutput {
            var output: VsOutput;
            output.position = matrices.projmtx * matrices.viewmtx*  matrices.worldmtx * vert.position;
            output.normal = normalize(vert.normal);
            output.texcoord = vert.texcoord;
            return output;
        }

        @fragment fn fs(input: VsOutput) -> @location(0) vec4f {
            return vec4f(( input.normal.xyz+1)/2, 1);
        }
        `
    });

    const pipeline = device.createRenderPipeline({
        label: `${name} pipeline`,
        layout: "auto",
        vertex: {
            module,
            buffers: [
                {   // position
                    arrayStride: 3 * 4,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }
                    ]
                },
                {   // normal
                    arrayStride: 3 * 4,
                    attributes: [
                        { shaderLocation: 1, offset: 0, format: 'float32x3' }
                    ]
                },
                {   // texcoord
                    arrayStride: 2 * 4,
                    attributes: [
                        { shaderLocation: 2, offset: 0, format: 'float32x2' }
                    ]
                }
            ]
        },
        fragment: {
            module,
            targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'back'
        },
        depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: true,
            depthCompare: 'less'
        }
    });

    // vertex buffer
    const positionBuffer = device.createBuffer({
        label: `${name} position buffer`,
        size: cubeInfo.positions.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(positionBuffer, 0, cubeInfo.positions);

    const normalBuffer = device.createBuffer({
        label: `${name} normal buffer`,
        size: cubeInfo.normals.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(normalBuffer, 0, cubeInfo.normals);

    const texcoordBuffer = device.createBuffer({
        label: `${name} texcoord buffer`,
        size: cubeInfo.texcoords.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(texcoordBuffer, 0, cubeInfo.texcoords);

    const indexBuffer = device.createBuffer({
        label: `${name} index buffer`,
        size: cubeInfo.normals.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, cubeInfo.indices);

    // uniform buffer
    const matrixUniform = device.createBuffer({
        label: `${name} worldmtx uniform buffer`,
        size:
            4 * 4 * 4 + // worldmtx
            4 * 4 * 4 + // viewmtx
            4 * 4 * 4,  // projmtx
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const matrixData = new Float32Array(4 * 4 * 3);

    const bindGroup = device.createBindGroup({
        label: `${name} bind group`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: matrixUniform } }
        ]
    });

    let depthTexture: GPUTexture | null = null;

    function refreshDepthTexture(width: number, height: number) {
        if (depthTexture) {
            depthTexture.destroy();
        }
        depthTexture = device.createTexture({
            label: `${name} depth texture`,
            size: [width, height, 1],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    // worldmtx
    let rotateXmtx = mat4.create();
    let rotateYmtx = mat4.create();
    let rotateZmtx = mat4.create();
    let worldmtx = mat4.create();

    // worldmtx helper control
    pane.addBinding(params, 'world_rotateX', {
        min: 0, max: 360, step: 1, label: 'world rotateX'
    }).on('change', (e) => {
        mat4.rotateX(rotateXmtx, mat4.create(), e.value * (Math.PI / 180));
    });
    pane.addBinding(params, 'world_rotateY', {
        min: 0, max: 360, step: 1, label: 'world rotateY'
    }).on('change', (e) => {
        mat4.rotateY(rotateYmtx, mat4.create(), e.value * (Math.PI / 180));
    });
    pane.addBinding(params, 'world_rotateZ', {
        min: 0, max: 360, step: 1, label: 'world rotateZ'
    }).on('change', (e) => {
        mat4.rotateZ(rotateZmtx, mat4.create(), e.value * (Math.PI / 180));
    });

    function render(time: number) {

        const encoder = device.createCommandEncoder({
            "label": `${name} encoder`
        });

        // 更新MVP
        mat4.multiply(worldmtx, mat4.create(), rotateXmtx);
        mat4.multiply(worldmtx, worldmtx, rotateYmtx);
        mat4.multiply(worldmtx, worldmtx, rotateZmtx);

        const viewmtx = mat4.lookAt(mat4.create(), [2, 2, 2], [0, 0, 0], [0, 1, 0]);
        const projmtx = mat4.perspectiveZO(mat4.create(), Math.PI / 4, canvas!.width / canvas!.height, 1, 100);

        matrixData.set(worldmtx, 0);
        matrixData.set(viewmtx, 16);
        matrixData.set(projmtx, 32);

        device.queue.writeBuffer(matrixUniform, 0, matrixData);

        // 更新深度纹理
        refreshDepthTexture(canvas!.width, canvas!.height);

        const pass = encoder.beginRenderPass({
            label: `${name} render pass`,
            colorAttachments: [
                {
                    clearValue: [0.3, 0.3, 0.3, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: context.getCurrentTexture().createView()
                }
            ],
            depthStencilAttachment: {
                view: depthTexture!.createView(),
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                depthClearValue: 1.0
            }
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, positionBuffer);
        pass.setVertexBuffer(1, normalBuffer);
        pass.setVertexBuffer(2, texcoordBuffer);
        pass.setIndexBuffer(indexBuffer, 'uint16')
        pass.drawIndexed(cubeInfo.indices.length, cubeInfo.indices.length / 3);

        pass.end();

        const commandBuffer = encoder.finish({
            label: `${name} command buffer`
        });

        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render);
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target as HTMLCanvasElement;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;

            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
        }
    });

    observer.observe(canvas);

    requestAnimationFrame(render);

}

main();