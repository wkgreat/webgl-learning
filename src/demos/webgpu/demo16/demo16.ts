import './styles.css';
import { createTextureFromImage, loadImageBitmap } from './texture';
import { createGPUDevice, createQuad } from './webgpuUtils';

function drawHistogram(canvas: HTMLCanvasElement | null, bins: number[]) {

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (!ctx) {
        return;
    }

    ctx.fillStyle = "#505050";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const nbins = bins.length;
    const dbin = width / nbins;

    const maxValue = Math.max(...bins);
    const hunit = height * 0.8 / maxValue;

    bins.forEach((v, i) => {

        const x = Math.floor(i * dbin);
        const y = height;
        const w = Math.ceil(dbin);
        const h = -Math.ceil(hunit * v);

        ctx.fillStyle = "#F0F0F0";
        ctx.fillRect(x, y, w, h);

    });

}

async function showImage(device: GPUDevice | null, canvas: HTMLCanvasElement | null, url: string) {

    if (!device || !canvas) {
        console.error("canvas is null");
        return;
    }

    const canvasContext = canvas.getContext("webgpu") as GPUCanvasContext | null;

    if (!canvasContext) {
        console.error("context is null");
        return;
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    canvasContext?.configure({
        device: device,
        format: canvasFormat,
        alphaMode: 'premultiplied'
    })


    const imageShowModule = device.createShaderModule({
        label: "imageShowModule",
        code: /*wgsl*/`

        struct VSInput {
            @location(0) position : vec4f,
            @location(1) texcoord : vec2f
        };
        struct VSOutput {
            @builtin(position) position : vec4f,
            @location(0) texcoord : vec2f
        };

        @group(0) @binding(0) var theTexture : texture_2d<f32>;
        @group(0) @binding(1) var theSampler : sampler;
        
        @vertex fn vs(input: VSInput) -> VSOutput {
            var output: VSOutput;
            output.position = input.position;
            output.texcoord = input.texcoord;
            return output;
        }

        @fragment fn fs(input: VSOutput) -> @location(0) vec4f {
            return textureSample(theTexture, theSampler, input.texcoord);
        }
        
        `
    });

    const imageShowPipline = device.createRenderPipeline({
        label: "imageShowPipline",
        layout: "auto",
        vertex: {
            module: imageShowModule,
            buffers: [
                { arrayStride: 3 * 4, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
                { arrayStride: 2 * 4, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }] },
            ]
        },
        fragment: {
            module: imageShowModule,
            targets: [{ format: canvasFormat }]
        }
    });

    const quad = createQuad();

    const quadPositionBuffer = device.createBuffer({
        label: "quadPositionBuffer",
        size: quad.positions.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(quadPositionBuffer, 0, quad.positions.buffer);
    const quadTexcoordBuffer = device.createBuffer({
        label: "quadTexcoordBuffer",
        size: quad.texcoords!.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(quadTexcoordBuffer, 0, quad.texcoords!.buffer);


    const imageSource = await loadImageBitmap(url);
    const imageTexture = createTextureFromImage(device, imageSource, true, false);

    if (imageTexture === null) {
        console.log("imageTexture is NULL!");
        return;
    }

    const imageSampler = device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear'
    });

    const imageBindGroup = device.createBindGroup({
        label: "imageBindGroup",
        layout: imageShowPipline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: imageTexture.createView() },
            { binding: 1, resource: imageSampler }
        ]
    });

    function render(time: number) {

        if (!device) {
            return;
        }

        const encoder = device.createCommandEncoder({
            label: "encoder"
        });

        const imageShowPass = encoder.beginRenderPass({
            label: "imageShowPass",
            colorAttachments: [{
                clearValue: [0.3, 0.3, 0.3, 1.0],
                loadOp: 'clear',
                storeOp: 'store',
                view: canvasContext!.getCurrentTexture().createView()
            }]
        });

        imageShowPass.setPipeline(imageShowPipline);
        imageShowPass.setVertexBuffer(0, quadPositionBuffer);
        imageShowPass.setVertexBuffer(1, quadTexcoordBuffer);
        imageShowPass.setBindGroup(0, imageBindGroup);
        imageShowPass.draw(quad.vertexCount!);
        imageShowPass.end();

        const commandBuffer = encoder.finish({
            label: "commandBuffer"
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


async function computeImageHistogram(device: GPUDevice | null, url: string): Promise<number[]> {

    if (!device) {
        return [];
    }

    const limits = device.limits;

    console.log(`max group size: ${limits.maxComputeWorkgroupSizeX},${limits.maxComputeWorkgroupSizeY},${limits.maxComputeWorkgroupSizeZ}`);
    console.log(`max invocations: ${limits.maxComputeInvocationsPerWorkgroup}`)

    const imageSource = await loadImageBitmap(url);

    const imageWidth = imageSource.width;
    const imageHeight = imageSource.height;

    const tileSizeX = 16;
    const tileSizeY = 16;
    const nTileX = Math.ceil(imageWidth / tileSizeX);
    const nTileY = Math.ceil(imageHeight / tileSizeY);
    const nTiles = nTileX * nTileY;
    const nbins = 256;

    console.log(`nTileX: ${nTileX}`);
    console.log(`nTileY: ${nTileY}`);
    console.log(`nbins: ${nbins}`);

    const tileModule = device.createShaderModule({
        label: "histogram tileModule",
        code: /*wgsl*/`
        
        @group(0) @binding(0) var image : texture_2d<f32>;
        @group(0) @binding(1) var<storage, read_write> tiles : array<array<array<u32, ${nbins}>, ${nTileY}>, ${nTileX}>;

        var<workgroup> bins: array<atomic<u32>, ${nbins}>;

        // from: https://www.w3.org/WAI/GL/wiki/Relative_luminance
        const kSRGBLuminanceFactors = vec3f(0.2126, 0.7152, 0.0722);
            fn srgbLuminance(color: vec3f) -> f32 {
                return saturate(dot(color, kSRGBLuminanceFactors));
            }

        @compute @workgroup_size(${tileSizeX},${tileSizeY},1) fn cs(
            @builtin(workgroup_id) group_id: vec3<u32>,
            @builtin(global_invocation_id) global_id : vec3<u32>,
            @builtin(local_invocation_id) local_id : vec3<u32>,
        ) {

            let position = global_id.xy;
            let imageSize = textureDimensions(image, 0);
            var b = 0u;

            if(all(position < imageSize)) { // 当前位置xy 要小于image的尺寸（在图片范围内）
                let size = textureDimensions(image, 0);
                let vmin = 0.0f;
                let vmax = 1.0f;
                let dbin = (vmax-vmin) / ${nbins};
                let v = srgbLuminance(textureLoad(image, position, 0).rgb);
                b = u32(v / dbin );
                atomicAdd(&bins[b], 1u);
            }

            workgroupBarrier(); // invocation同步，最新var<workgroup>对所有invocation可见

            tiles[group_id.x][group_id.y][b] = atomicLoad(&bins[b]); // 写到 buffer
        }
        `
    });

    const tilePileline = device.createComputePipeline({
        label: "histogram pipline",
        layout: 'auto',
        compute: {
            module: tileModule,
        }
    });


    const reduceModule = device.createShaderModule({
        label: "histogram reduce module",
        code: /*wgsl*/`
        
        @group(0) @binding(0) var<storage, read_write> tiles : array<array<u32, ${nbins}>, ${nTiles}>;
        @group(0) @binding(1) var<uniform> stride : u32;

        @compute @workgroup_size(${nbins}) fn cs(
            @builtin(workgroup_id) group_id: vec3<u32>,
            @builtin(global_invocation_id) global_id : vec3<u32>,
            @builtin(local_invocation_id) local_id : vec3<u32>,
        ) {
            let b = local_id.x;
            let t0 = group_id.x * stride;
            let t1 = (group_id.x+1) * stride; // ⭐ 如果t1索引在tiles越界，不会报错，会返回0
            tiles[t0][b] = tiles[t0][b] + tiles[t1][b];
        }
        `
    });

    const reducePipeline = device.createComputePipeline({
        label: "histogram reduce pipeline",
        layout: 'auto',
        compute: {
            module: reduceModule
        }
    });

    const imageTexture = createTextureFromImage(device, imageSource, false, false);

    const histogramBuffer = device.createBuffer({
        label: "histogramBuffer",
        size: nTileX * nTileY * nbins * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const resultBuffer = device.createBuffer({
        label: "resultBuffer",
        size: nbins * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const bindGroup = device.createBindGroup({
        layout: tilePileline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: imageTexture!.createView() },
            { binding: 1, resource: { buffer: histogramBuffer } }
        ]
    });

    const reduceBindGroups = [];
    const nReduce = Math.ceil(Math.log2(nTiles));
    for (let i = 0; i < nReduce; ++i) {
        const stride = 2 ** i;
        const strideUniform = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true
        });
        new Uint32Array(strideUniform.getMappedRange()).set([stride]);
        strideUniform.unmap();
        const reduceBindGroup = device.createBindGroup({
            layout: reducePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: histogramBuffer } },
                { binding: 1, resource: { buffer: strideUniform } }
            ]
        });
        reduceBindGroups.push(reduceBindGroup);
    }

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(tilePileline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(nTileX, nTileY, 1);

    pass.setPipeline(reducePipeline);
    for (let i = 0; i < nReduce; ++i) {
        pass.setBindGroup(0, reduceBindGroups[i]);
        const nWorks = Math.ceil(nTiles / (2 ** i));
        pass.dispatchWorkgroups(nWorks);
    }
    pass.end();

    // ⭐ 拷贝 histogramBuffer 里面的前nbins元素至resultBuffer
    encoder.copyBufferToBuffer(histogramBuffer, 0, resultBuffer, 0, resultBuffer.size);

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const histogram = new Uint32Array(resultBuffer.getMappedRange());

    return Array.from(histogram);

}

async function main() {

    const device = await createGPUDevice();

    if (!device) {
        return;
    }

    const imageURL = "assets/data/images/pexels-francesco-ungaro-96938.jpg";
    const imageShowCanvas = document.getElementById("webgpu-image-canvas") as HTMLCanvasElement | null;
    showImage(device, imageShowCanvas, imageURL);

    const histogramCanvas = document.getElementById("webgpu-histogram-canvas") as HTMLCanvasElement | null;
    const bins = await computeImageHistogram(device, imageURL);

    console.log(bins.length);

    drawHistogram(histogramCanvas, bins);

}

main();