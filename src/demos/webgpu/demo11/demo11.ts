import './styles.css'
import imageurl from './leaves.jpg'
import { WebGPUContext } from './define';
import { createTextureFromImage } from './mipmap';

import { Pane } from 'tweakpane';

const params = {
    miplevel: 0
};
const pane = new Pane({
    title: '参数控制',
    expanded: true, // 默认展开
});

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

async function getGPUContext(canvas: HTMLCanvasElement): Promise<WebGPUContext | null> {

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

async function main() {

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
        label: "texture shader",
        code: /* wgsl */`
        
        const positions = array(
               vec2f(-0.5,-0.5),
               vec2f( 0.5, 0.5),
               vec2f(-0.5, 0.5),
               vec2f(-0.5,-0.5),
               vec2f( 0.5,-0.5),
               vec2f( 0.5, 0.5)
        );

        const texcoords = array(
               vec2f(0, 0),
               vec2f(1, 1),
               vec2f(0, 1),
               vec2f(0, 0),
               vec2f(1, 0),
               vec2f(1, 1)
        );

        struct VsOutput {
            @builtin(position) position: vec4f,
            @location(0) texcoord: vec2f
        }

        @vertex fn vs(@builtin(vertex_index) vidx: u32) -> VsOutput {
            var output: VsOutput;
            output.position = vec4f(positions[vidx], 0.0, 1.0);
            output.texcoord = texcoords[vidx];
            return output;
        }

        @group(0) @binding(0) var theSampler: sampler;
        @group(0) @binding(1) var theTexture: texture_2d<f32>;  

        @fragment fn fs(input: VsOutput) -> @location(0) vec4f {
            return textureSample(theTexture, theSampler, input.texcoord);
        }
        `
    });

    const pipeline = device.createRenderPipeline({
        label: "texture pipeline",
        layout: "auto",
        vertex: {
            module
        },
        fragment: {
            module,
            targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
        }
    });

    const source = await loadImageBitmap(imageurl);

    const texture = createTextureFromImage(gpuContext, source, "rgba8unorm");

    const sampler = device.createSampler({
        addressModeU: 'repeat', //or 'clamp-to-edge'
        addressModeV: 'repeat', //or 'clamp-to-edge'
        magFilter: 'linear', // or 'nearest',
        minFilter: 'linear', // or 'nearest',
        mipmapFilter: 'linear', // or 'nearest'
    });

    let bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: sampler },
            {
                binding: 1, resource: texture.createView({
                    baseMipLevel: 0,
                    mipLevelCount: 1
                })
            }
        ]
    });

    pane.addBinding(params, 'miplevel', {
        min: 0,
        max: 10,
        step: 1,
        label: 'mipmap层级'
    }).on('change', (e) => {
        bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                {
                    binding: 1, resource: texture.createView({
                        baseMipLevel: e.value,
                        mipLevelCount: 1
                    })
                }
            ]
        });
    });

    const colorAttachment: GPURenderPassColorAttachment = {
        clearValue: [0.3, 0.3, 0.3, 1.0],
        loadOp: 'clear',
        storeOp: 'store',
        view: context.getCurrentTexture().createView()
    };

    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: "texture render pass",
        colorAttachments: [
            colorAttachment
        ]
    }

    function render() {

        colorAttachment.view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({ "label": "texture encoder" });

        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();

        const commandBuffer = encoder.finish({
            label: "texture command buffer"
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