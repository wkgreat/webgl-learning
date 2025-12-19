/*
    MipMap层级定义
    0:  原始尺寸
    1:  1/2
    2:  1/4
    ...
    n:  1/(2^n)
*/

import { WebGPUContext } from "./define";

function computeMipMapLevelCount(width: number, height: number): number {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
}

export function createTextureFromImage(gpuctx: WebGPUContext, image: ImageBitmap, format: GPUTextureFormat): GPUTexture {


    const { device } = gpuctx;

    const texture = device.createTexture({
        label: "image texture",
        format: format,
        mipLevelCount: computeMipMapLevelCount(image.width, image.height),
        size: [image.width, image.height],
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT
    });

    console.log(`texture.mipLevelCount = ${texture.mipLevelCount} `)

    device.queue.copyExternalImageToTexture(
        { source: image, flipY: true }, // source
        { texture },                    // destination
        { width: image.width, height: image.height } // copy size
    );

    genMimMapForTexture(gpuctx, texture);

    return texture;

}

/**
 * 假设texture已经定义好，并写入了原始图像数据
*/
function genMimMapForTexture(gpuctx: WebGPUContext, texture: GPUTexture) {

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
    for (let i = 1; i < texture.mipLevelCount; ++i) {
        const bindGroup = device.createBindGroup({
            label: `${name} bindgroup`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                {
                    binding: 1, resource: texture.createView({
                        baseMipLevel: i - 1,
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
                        baseMipLevel: i,
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

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}