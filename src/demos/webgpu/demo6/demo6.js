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

function createCircleVertices({
    radius = 1,
    numSubdivisions = 24,
    innerRadius = 0,
    startAngle = 0,
    endAngle = Math.PI * 2,
} = {}) {
    // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
    const numVertices = numSubdivisions * 3 * 2;
    const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

    let offset = 0;
    const addVertex = (x, y) => {
        vertexData[offset++] = x;
        vertexData[offset++] = y;
    };

    // 2 triangles per subdivision
    //
    // 0--1 4
    // | / /|
    // |/ / |
    // 2 3--5
    for (let i = 0; i < numSubdivisions; ++i) {
        const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
        const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

        const c1 = Math.cos(angle1);
        const s1 = Math.sin(angle1);
        const c2 = Math.cos(angle2);
        const s2 = Math.sin(angle2);

        // first triangle
        addVertex(c1 * radius, s1 * radius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c1 * innerRadius, s1 * innerRadius);

        // second triangle
        addVertex(c1 * innerRadius, s1 * innerRadius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c2 * innerRadius, s2 * innerRadius);
    }

    return {
        vertexData,
        numVertices,
    };
}

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

            struct Vertex {
                position: vec2f
            };

            @group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
            @group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
            @group(0) @binding(2) var<storage, read> pos: array<Vertex>;

            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec4f
            }

            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32, // 第几个顶点
                @builtin(instance_index) instanceIndex : u32 // 第几个三角形
            ) -> VSOutput {

                let otherStruct = otherStructs[instanceIndex];
                let ourStruct = ourStructs[instanceIndex];

                var vsOut: VSOutput;
                vsOut.position = vec4f(
                    pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0
                );
                vsOut.color = ourStruct.color;
                return vsOut;
            }

            /*
                @location(0) means first render target，we can set canvas texture as first render target later
            */
            @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
                return vsOut.color;
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
    });

    const kNumObjects = 100;
    const objectInfos = [];

    // create 2 storage buffers
    const staticUnitSize =
        4 * 4 + // color is 4 32bit floats (4bytes each)
        2 * 4 + // offset is 2 32bit floats (4bytes each)
        2 * 4;  // padding 

    const changingUnitSize =
        2 * 4;  // scale is 2 32bit floats (4bytes each)

    const staticStorageBufferSize = staticUnitSize * kNumObjects;
    const changingStorageBufferSize = changingUnitSize * kNumObjects;

    const staticStorageBuffer = device.createBuffer({
        label: 'static storage for objects',
        size: staticStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const changingStorageBuffer = device.createBuffer({
        label: 'changing storage for objects',
        size: changingStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const kColorOffset = 0;
    const kOffsetOffset = 4;
    const kScaleOffset = 0;

    {
        const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
        for (let i = 0; i < kNumObjects; ++i) {
            const staticOffset = i * (staticUnitSize / 4);
            staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);
            staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);
            objectInfos.push({
                scale: rand(0.2, 0.5)
            });
        }
        device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
    }

    const storageValues = new Float32Array(changingStorageBufferSize / 4);

    const { vertexData, numVertices } = createCircleVertices({
        radius: 0.5,
        innerRadius: 0.25
    });

    const vertexStorageBuffer = device.createBuffer({
        label: 'storage buffer vertices',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);

    const bindGroup = device.createBindGroup({
        label: 'bind group for objects',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: staticStorageBuffer } },
            { binding: 1, resource: { buffer: changingStorageBuffer } },
            { binding: 2, resource: { buffer: vertexStorageBuffer } }
        ]
    });

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

        objectInfos.forEach(({ scale }, ndx) => {
            const offset = ndx * (changingUnitSize / 4);
            storageValues.set([scale / aspect, scale], offset + kScaleOffset);
        });
        device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);

        pass.setBindGroup(0, bindGroup);
        pass.draw(numVertices, kNumObjects); // 每个instance多少个顶点，有几个instance

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