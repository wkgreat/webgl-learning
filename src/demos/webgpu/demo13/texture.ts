import { WebGPUContext } from "./define";

function computeMipMapLevelCount(width: number, height: number): number {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
}

export function generateFace(size: number, faceColor: string, textColor: string, text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = faceColor;
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${size * 0.7}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const m = ctx.measureText(text);
    ctx.fillText(
        text,
        (size - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
        (size - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
    );
    return canvas;
}

export function generateCubeMapFaces(): GPUCopyExternalImageSource[] {
    const faceSize = 128;
    const faceCanvases = [
        { faceColor: '#F00', textColor: '#0FF', text: '+X' },
        { faceColor: '#FF0', textColor: '#00F', text: '-X' },
        { faceColor: '#0F0', textColor: '#F0F', text: '+Y' },
        { faceColor: '#0FF', textColor: '#F00', text: '-Y' },
        { faceColor: '#00F', textColor: '#FF0', text: '+Z' },
        { faceColor: '#F0F', textColor: '#0F0', text: '-Z' },
    ].map(faceInfo => generateFace(faceSize, faceInfo.faceColor, faceInfo.textColor, faceInfo.text));
    return faceCanvases;
}

export function createCubeMapTexture(gpuctx: WebGPUContext, sources: GPUCopyExternalImageSource[], flipY: boolean = false, mimmap: boolean = false): GPUTexture | null {

    const { device } = gpuctx;
    const source = sources[0];

    if (source instanceof VideoFrame) {
        return null;
    }

    const texture = device.createTexture({
        label: `cube map texture`,
        format: "rgba8unorm",
        mipLevelCount: mimmap ? computeMipMapLevelCount(source.width, source.height) : 1,
        size: [source.width, source.height, sources.length], //⭐ width, height, layers
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    sources.forEach((src, layer) => {
        if (src instanceof VideoFrame) return;
        device.queue.copyExternalImageToTexture(
            { source: src, flipY },
            { texture, origin: [0, 0, layer] }, //⭐ origin
            { width: src.width, height: src.height }
        );
    });

    if (mimmap) {
        genMimMapForTexture(gpuctx, texture);
    }

    return texture;

}

/**
 * 假设texture已经定义好，并写入了原始图像数据
*/
export function genMimMapForTexture(gpuctx: WebGPUContext, texture: GPUTexture) {

    const name = "genMimMapForTexture";

    const { device } = gpuctx;

    const module = device.createShaderModule({
        label: `${name} shader`,
        code: /* wgsl */`
        
        // canvas quad
        const positions = array(
               vec2f(-1,-1), vec2f( 1, 1), vec2f(-1, 1),
               vec2f(-1,-1), vec2f( 1,-1), vec2f( 1, 1)
        );

        const texcoords = array(
               vec2f(0, 0), vec2f(1, 1), vec2f(0, 1),
               vec2f(0, 0), vec2f(1, 0), vec2f(1, 1)
        );

        struct VsOutput {
            @builtin(position) position: vec4f,
            @location(0) texcoord: vec2f
        }

        @vertex fn vs(@builtin(vertex_index) vidx: u32) -> VsOutput {
            var output: VsOutput;
            output.position = vec4f(positions[vidx], 0.0, 1.0);
            output.texcoord = texcoords[vidx];
            // ⭐ texcoord坐标Y轴与frambuffer坐标Y轴是相反的，所以每次渲染（生成下一级mipmap）y坐标都要反转下
            output.texcoord.y = 1.0 - output.texcoord.y;
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
        label: `${name} pipeline`,
        layout: "auto",
        vertex: {
            module
        },
        fragment: {
            module,
            targets: [{ format: texture.format }]
        }
    });

    const sampler = device.createSampler({
        minFilter: "linear"
    });

    const encoder = device.createCommandEncoder({
        label: `${name} encoder`
    });

    /**
     * 需要生成从 1 到 n 的mipmap层级
     * 0 -> 1
     * 1 -> 2
     * 2 -> 3
     * ...
     * n-1 -> n
    */

    for (let layer = 0; layer < texture.depthOrArrayLayers; layer++) {
        for (let level = 1; level < texture.mipLevelCount; level++) {
            const bindGroup = device.createBindGroup({
                label: `${name} bindgroup`,
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: sampler },
                    {
                        binding: 1, resource: texture.createView({
                            dimension: '2d',
                            baseArrayLayer: layer,
                            arrayLayerCount: 1,
                            baseMipLevel: level - 1,
                            mipLevelCount: 1
                        })
                    }
                ]
            });

            const pass = encoder.beginRenderPass({
                label: `${name} pass`,
                colorAttachments: [
                    {
                        view: texture.createView({
                            dimension: '2d',
                            baseArrayLayer: layer,
                            arrayLayerCount: 1,
                            baseMipLevel: level,
                            mipLevelCount: 1
                        }),
                        loadOp: 'clear',
                        storeOp: 'store'
                    }
                ]
            });

            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(6);
            pass.end();
        }
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}