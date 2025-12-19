import './styles.css'

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const bilinearFilter = (tl, tr, bl, br, t1, t2) => {
    const t = mix(tl, tr, t1);
    const b = mix(bl, br, t1);
    return mix(t, b, t2);
};

const createNextMipLevelRgba8Unorm = ({ data: src, width: srcWidth, height: srcHeight }) => {
    // compute the size of the next mip
    const dstWidth = Math.max(1, srcWidth / 2 | 0);
    const dstHeight = Math.max(1, srcHeight / 2 | 0);
    const dst = new Uint8Array(dstWidth * dstHeight * 4);

    const getSrcPixel = (x, y) => {
        const offset = (y * srcWidth + x) * 4;
        return src.subarray(offset, offset + 4);
    };

    for (let y = 0; y < dstHeight; ++y) {
        for (let x = 0; x < dstWidth; ++x) {
            // compute texcoord of the center of the destination texel
            const u = (x + 0.5) / dstWidth;
            const v = (y + 0.5) / dstHeight;

            // compute the same texcoord in the source - 0.5 a pixel
            const au = (u * srcWidth - 0.5);
            const av = (v * srcHeight - 0.5);

            // compute the src top left texel coord (not texcoord)
            const tx = au | 0;
            const ty = av | 0;

            // compute the mix amounts between pixels
            const t1 = au % 1;
            const t2 = av % 1;

            // get the 4 pixels
            const tl = getSrcPixel(tx, ty);
            const tr = getSrcPixel(tx + 1, ty);
            const bl = getSrcPixel(tx, ty + 1);
            const br = getSrcPixel(tx + 1, ty + 1);

            // copy the "sampled" result into the dest.
            const dstOffset = (y * dstWidth + x) * 4;
            dst.set(bilinearFilter(tl, tr, bl, br, t1, t2), dstOffset);
        }
    }
    return { data: dst, width: dstWidth, height: dstHeight };
};

const generateMips = (src, srcWidth) => {
    const srcHeight = src.length / 4 / srcWidth;

    // populate with first mip level (base level)
    let mip = { data: src, width: srcWidth, height: srcHeight, };
    const mips = [mip];

    while (mip.width > 1 || mip.height > 1) {
        mip = createNextMipLevelRgba8Unorm(mip);
        mips.push(mip);
    }
    return mips;
};


async function main() {

    /*
        Navigator 为浏览器全局对象
        adpator: GPUAdapter 应用程序和物理GPU之间的描述和协商层
    */
    const adpator = await navigator.gpu?.requestAdapter();

    /*
        device: GPUDevice 执行所有 WebGPU 操作（如绘图、计算、资源管理）的接口
    */
    const device = await adpator?.requestDevice();

    if (!device) {
        console.log('need a browser that supports WebGPU');
        return;
    } else {
        console.log('WebGPU get device success.');
    }

    const canvas = document.getElementById("webgpu-canvas");

    const context = canvas.getContext('webgpu');

    /*
        表示 WebGPU 推荐用于当前系统和浏览器的画布（Canvas）纹理格式
    */
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    /**
     * canvas 设置 device 和 纹理格式
    */
    context.configure({
        device,
        format: presentationFormat
    });

    /*
        加载、编译和验证 WebGPU 着色器代码 (WGSL)
        返回 GPUShaderModule 对象
    */
    const module = device.createShaderModule({
        label: 'our hardcoded rgb triangle shaders',
        code: /* wgsl */ `

struct OurVertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f //⭐ texcoord
};
 
@vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
    let pos = array(
        // 1st triangle
        vec2f( 0.0,  0.0),  // center
        vec2f( 1.0,  0.0),  // right, center
        vec2f( 0.0,  1.0),  // center, top
 
        // 2nd triangle
        vec2f( 0.0,  1.0),  // center, top
        vec2f( 1.0,  0.0),  // right, center
        vec2f( 1.0,  1.0),  // right, top
    );

    var vsOutput: OurVertexShaderOutput;

    let xy = pos[vertexIndex];
    vsOutput.position = vec4f(xy, 0.0, 1.0);
    vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
    return vsOutput;

}

@group(0) @binding(0) var ourSampler: sampler; // ⭐ sampler
@group(0) @binding(1) var ourTexture: texture_2d<f32>; //⭐ texture texture_2d f32

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, fsInput.texcoord); //⭐ textureSample
}
      
    `,
    });

    /*
        创建一个不可变的 GPURenderPipeline 对象，该对象定义了 GPU 执行一次完整的渲染（Draw）调用所需的全部状态。
    */
    const pipeline = device.createRenderPipeline({
        label: "triangle pipeline",
        layout: 'auto', //derive the layout of data from the shaders
        vertex: {
            //entryPoint: 'vs', // 如果shader里面只有一个vertex，这个可以省略
            module
        },
        fragment: {
            //entryPoint: 'fs', // 如果shader里面只有一个fragment，这个可以省略
            module,
            targets: [{ format: presentationFormat }]
        }
    })

    /**
     * render pass 的描述
     * 颜色附件、深度模板附件
    */
    const renderPassDescriptor = {
        label: "canvas renderPass",
        colorAttachments: [
            {
                clearValue: [0.3, 0.3, 0.3, 1.0],
                loadOp: 'clear',
                storeOp: 'store'
                //view 一会儿会设置为canvas的view
            }
        ]
    }

    const kTextureWidth = 5;
    const kTextureHeight = 7;
    const _ = [255, 0, 0, 255];  // red
    const y = [255, 255, 0, 255];  // yellow
    const b = [0, 0, 255, 255];  // blue
    const textureData = new Uint8Array([
        b, _, _, _, _,
        _, y, y, y, _,
        _, y, _, _, _,
        _, y, y, _, _,
        _, y, _, _, _,
        _, y, _, _, _,
        _, _, _, _, _,
    ].flat());

    // ⭐ generate mipmap
    const mips = generateMips(textureData, kTextureWidth);

    // ⭐ create texture
    const texture = device.createTexture({
        size: [mips[0].width, mips[0].height],
        mipLevelCount: mips.length, // mip 层级数
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    // ⭐ write data(CPU) to texture(GPU) for each mip level
    mips.forEach(({ data, width, height }, mipLevel) => {
        device.queue.writeTexture(
            { texture },
            textureData,
            { bytesPerRow: kTextureWidth * 4 },
            { width: kTextureWidth, height: kTextureHeight },
            { texture, mipLevel }, // mipLevel
            data,
            { bytesPerRow: width * 4 },
            { width, height },
        );
    });

    // ⭐ sampler
    const sampler = device.createSampler({
        addressModeU: 'repeat', //or 'clamp-to-edge'
        addressModeV: 'repeat', //or 'clamp-to-edge'
        magFilter: 'linear', // or 'nearest',
        minFilter: 'linear', // or 'nearest',
        mipmapFilter: 'linear', // or 'nearest'
    });

    // ⭐ set texture and sampler to bind group
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView() }
        ]
    })

    function render() {

        /*
            设置render pass 的 texture 为 canvas 的 texture
            表示渲染至 canvas
        */
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

        /*
            创建一个 GPUCommandEncoder 对象，用于记录（或编码）GPU 要执行的一系列命令
        */
        const encoder = device.createCommandEncoder({ label: "our encoder" });

        // 开始一个render pass，这里设置颜色/深度/模板等附件（renderPassDescriptor）
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline); // 设置render pass 的 pipeline
        pass.setBindGroup(0, bindGroup);
        pass.draw(6); // call vertex shader 6 times;
        pass.end(); // 结束一个render pass

        // encode完成记录，并生成命令缓冲区GPUCommandBuffer
        const commandBuffer = encoder.finish({
            label: "the commandBuffer"
        });


        /*
            提交命令缓冲区到 GPU 队列
            device.queue 是一个 GPUQueue 对象
        */
        device.queue.submit([commandBuffer]);
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            console.log(entry);
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
        }
        render();
    });
    observer.observe(canvas);
}

main();