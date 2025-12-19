import { createCube, getGPUContext } from './define';
import './styles.css';

import { mat4 } from 'gl-matrix';
import { Pane } from 'tweakpane';
import { createCubeMapTexture, generateCubeMapFaces } from './texture';

// worldmtx
let rotateXmtx = mat4.create();
let rotateYmtx = mat4.create();
let rotateZmtx = mat4.create();
let worldmtx = mat4.create();

// mipmap parameters

const params = {
    world_rotateX: 0,
    world_rotateY: 0,
    world_rotateZ: 0,
    mipmap: {
        enable: true,
        show_one_level: false,
        level: 1
    }
};

const pane = new Pane({
    title: '参数控制',
    expanded: true, // 默认展开
});

const worldfolder = pane.addFolder({
    title: "world matrix",
    expanded: true
});

// worldmtx helper control
worldfolder.addBinding(params, 'world_rotateX', {
    min: 0, max: 360, step: 1, label: 'world rotateX'
}).on('change', (e) => {
    mat4.rotateX(rotateXmtx, mat4.create(), e.value * (Math.PI / 180));
});
worldfolder.addBinding(params, 'world_rotateY', {
    min: 0, max: 360, step: 1, label: 'world rotateY'
}).on('change', (e) => {
    mat4.rotateY(rotateYmtx, mat4.create(), e.value * (Math.PI / 180));
});
worldfolder.addBinding(params, 'world_rotateZ', {
    min: 0, max: 360, step: 1, label: 'world rotateZ'
}).on('change', (e) => {
    mat4.rotateZ(rotateZmtx, mat4.create(), e.value * (Math.PI / 180));
});

const mipmapFolder = pane.addFolder({
    "title": "texture mipmap",
    expanded: true
});

const inputMimMapEnable = mipmapFolder.addBinding(params.mipmap, 'enable', { label: "enable" })
const inputMimMapShowOneLevel = mipmapFolder.addBinding(params.mipmap, 'show_one_level', { label: "show one level", disabled: !params.mipmap.enable });
const inputMipMapLevel = mipmapFolder.addBinding(params.mipmap, 'level', { min: 1, max: 10, step: 1, label: "level", disabled: !params.mipmap.enable || !params.mipmap.show_one_level });
inputMimMapEnable.on('change', e => {
    inputMimMapShowOneLevel.disabled = !e.value;
    inputMipMapLevel.disabled = !e.value;
});
inputMimMapShowOneLevel.on('change', e => {
    inputMipMapLevel.disabled = !e.value;
})


async function main() {

    const name = "draw cube map";

    const cubeInfo = createCube();
    const faces = generateCubeMapFaces();

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
        @group(0) @binding(1) var theSampler: sampler;
        @group(0) @binding(2) var theTexture: texture_cube<f32>;  //⭐ texture_cube

        @vertex fn vs(vert: Vertex) -> VsOutput {
            var output: VsOutput;
            output.position = matrices.projmtx * matrices.viewmtx * matrices.worldmtx * vert.position;
            //output.normal = normalize(vert.normal);
            output.normal = normalize(vert.position.xyz);
            output.texcoord = vert.texcoord;
            return output;
        }

        @fragment fn fs(input: VsOutput) -> @location(0) vec4f {
            return textureSample(theTexture, theSampler, input.normal);
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
            /**
             * 拓扑结构
             * point-list
             * line-list
             * line-strip
             * triangle-list
             * triangle-strip
            */
            topology: 'triangle-list',
            /**
             * 剔除模式：
             *  none：两面都渲染
             *  front：正面剔除
             *  back：背面剔除
            */
            cullMode: 'back',
            /**
             * 正面判定：
             *  ccw： 逆时针
             *  cw：顺时针
            */
            frontFace: 'ccw',
            /**
             * 是否禁用深度裁剪
            */
            unclippedDepth: false,
            /**
             * stripIndexFormat
             *  uint16/0xFFFF
             *  uint32/0xFFFFFFFF
             * 用于打断strip，需要在 indexed draw call下
            */
            //stripIndexFormat: ''
        },
        depthStencil: {
            /** 
             * 格式 
             *  depth24plus 深度(至少24bit)
             *  depth24plus-stencil8 深度加模板 (24bit深度+8bit模板)
             *  depth32float 深度(32bit)
             * 注意，要和对应texture的格式要一致
            */
            format: 'depth24plus',
            /** 是否开启深度写入 */
            depthWriteEnabled: true,
            /** 深度比较函数*/
            depthCompare: 'less',
            /** 还有一些stencil选项...*/
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

    // sampler
    const cubemapSampler = device.createSampler({
        label: "cube map sampler",
        minFilter: "linear",
        magFilter: "linear"
    });
    // cube map texture
    let cubemapTexture: GPUTexture | null = createCubeMapTexture(gpuContext, faces, false, true);

    inputMimMapEnable.on('change', e => {
        if (cubemapTexture) {
            cubemapTexture.destroy();
            cubemapTexture = null;
        }
        cubemapTexture = createCubeMapTexture(gpuContext, faces, false, e.value);
    });

    // depth texture
    let depthTexture: GPUTexture | null = null;

    function refreshDepthTexture(width: number, height: number) {
        if (depthTexture) {
            depthTexture.destroy();
        }
        depthTexture = device.createTexture({
            label: `${name} depth texture`,
            size: [width, height, 1],
            format: 'depth24plus', // 注意要和pipline里面的深度格式一致
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    function render(time: number) {

        if (cubemapTexture !== null) {

            let cubemapTextureView: GPUTextureViewDescriptor = {}

            if (params.mipmap.enable && params.mipmap.show_one_level) {
                cubemapTextureView = {
                    dimension: "cube", // ⭐ cube texture view
                    baseMipLevel: Math.min(params.mipmap.level, cubemapTexture.mipLevelCount - 1),
                    mipLevelCount: 1
                };
            } else {
                cubemapTextureView = {
                    dimension: "cube" // ⭐ cube texture view
                };
            }

            const bindGroup = device.createBindGroup({
                label: `${name} bind group`,
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: matrixUniform } },
                    { binding: 1, resource: cubemapSampler },
                    { binding: 2, resource: cubemapTexture!.createView(cubemapTextureView) }
                ]
            });

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

        }



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