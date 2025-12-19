import './styles.css';

async function main() {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter === null) {
        fail('need a browser that supports WebGPU');
        return;
    }
    /**
     * storage texture 不支持 bgra8unorm
     * 但 getPreferredCanvasFormat 可能返回 bgra8unorm
     * 但如果有feature bgra8unorm-storage，那可以支持 bgra8unorm
     * 
    */
    const hasBGRA8unormStorage = adapter.features.has('bgra8unorm-storage'); //⭐ 判断是否有 bgra8unorm-storage
    const device = await adapter?.requestDevice({
        requiredFeatures: hasBGRA8unormStorage //⭐ 请求device的时候 指定使用 bgra8unorm-storage
            ? ['bgra8unorm-storage']
            : [],
    });
    if (!device) {
        fail('need a browser that supports WebGPU');
        return;
    }

    // Get a WebGPU context from the canvas and configure it
    const canvas = document.querySelector('canvas');
    if (canvas === null) {
        fail('canvas is null');
        return;
    }
    const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
    if (context === null) {
        fail('canvas is null');
        return;
    }

    //⭐ 设置 canvas context 的格式
    const presentationFormat = hasBGRA8unormStorage ? navigator.gpu.getPreferredCanvasFormat() : 'rgba8unorm';
    context.configure({
        device,
        format: presentationFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | //⭐ TEXTURE_BINDING 该纹理需要canvas渲染
            GPUTextureUsage.STORAGE_BINDING,    //⭐⭐ STORAGE_BINDING 该纹理作为 storage texture
    });

    const module = device.createShaderModule({
        label: 'circles in storage texture',
        code: /* wgsl */ `
      @group(0) @binding(0) var tex: texture_storage_2d<${presentationFormat}, write>;

      @compute @workgroup_size(1) fn cs(
        @builtin(global_invocation_id) id : vec3u
      )  {
        let size = textureDimensions(tex);
        let center = vec2f(size) / 2.0;
        let pos = id.xy;
        let dist = distance(vec2f(pos), center);
        let stripe = dist / 32.0 % 2.0;
        let red = vec4f(1, 0, 0, 1);
        let cyan = vec4f(0, 1, 1, 1);
        let color = select(red, cyan, stripe < 1.0);
        textureStore(tex, pos, color); // ⭐ 使用textureStore写值
      }
    `,
    });

    const pipeline = device.createComputePipeline({
        label: 'circles in storage texture',
        layout: 'auto',
        compute: {
            module,
        },
    });

    function render() {

        if (context === null) {
            return;
        }

        const texture = context.getCurrentTexture();

        //⭐ storage texture 不支持sampler
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: texture.createView() },
            ],
        });

        const encoder = device.createCommandEncoder({ label: 'our encoder' });
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(texture.width, texture.height); // ⭐ 启动计算着色器
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target as HTMLCanvasElement;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
            // re-render
            render();
        }
    });
    observer.observe(canvas);
}

function fail(msg: string) {
    // eslint-disable-next-line no-alert
    alert(msg);
}

main();
