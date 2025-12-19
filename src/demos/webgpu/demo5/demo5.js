import './styles.css'

const rand = (min, max) => {
    if (min === undefined) {
        min = 0;
        max = 1;
    } else if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
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
        label: "triangle shaders",
        code: /* wgsl */ `

            struct OurStruct {
                color: vec4f,
                offset: vec2f
            };

            struct OtherStruct {
                scale: vec2f
            };

            @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
            @group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> @builtin(position) vec4f {
            
                let pos = array(
                    vec2f( 0.0, 0.5),
                    vec2f(-0.5,-0.5),
                    vec2f( 0.5,-0.5)
                );

                return vec4f(
                    pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0
                );
            
            }

            /*
                @location(0) means first render target，we can set canvas texture as first render target later
            */
            @fragment fn fs() -> @location(0) vec4f {
                return ourStruct.color;
            }
        `
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
     * Uniform buffer
    */
    const staticUniformBufferSize =
        4 * 4 + //color vec4f
        2 * 4 + //offset vec2f
        2 * 4;  //padding

    const uniformBufferSize =
        2 * 4; // scale

    const kColorOffset = 0;
    const kOffsetOffset = 4;
    const kScaleOffset = 0;

    const kNumObjects = 100;
    const objectInfos = [];

    for (let i = 0; i < kNumObjects; ++i) {

        const staticUniformBuffer = device.createBuffer({
            label: `static uniform buffer for obj: ${i}`,
            size: staticUniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        {
            const uniformValues = new Float32Array(staticUniformBufferSize / 4);
            uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);
            uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);
            device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
        }

        const uniformValues = new Float32Array(uniformBufferSize / 4);
        const uniformBuffer = device.createBuffer({
            label: `changing uniforms for obj: ${i}`,
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroup = device.createBindGroup({
            label: `bind group for obj ${i}`,
            layout: pipeline.getBindGroupLayout(0), //group(0) layout
            entries: [
                { binding: 0, resource: { buffer: staticUniformBuffer } }, // location(0) resource
                { binding: 1, resource: { buffer: uniformBuffer } } // location(1) resource
            ]
        });

        objectInfos.push({
            scale: rand(0.2, 0.5),
            uniformBuffer,
            uniformValues,
            bindGroup
        });
    }



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

        const aspect = canvas.width / canvas.height;
        for (const { scale, bindGroup, uniformBuffer, uniformValues } of objectInfos) { //draw calls for each object
            uniformValues.set([scale / aspect, scale], kScaleOffset);
            device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
        }

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