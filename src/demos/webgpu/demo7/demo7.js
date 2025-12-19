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
    // 2 triangles per subdivision, 3 verts per tri
    const numVertices = numSubdivisions * 3 * 2;
    // 2 32-bit values for position (xy) and 1 32-bit value for color (rgb_)
    // The 32-bit color value will be written/read as 4 8-bit values
    const vertexData = new Float32Array(numVertices * (2 + 1));
    const colorData = new Uint8Array(vertexData.buffer); // ⭐ uint8 view of float32Array

    let offset = 0;
    let colorOffset = 8;
    const addVertex = (x, y, r, g, b) => {
        vertexData[offset++] = x;
        vertexData[offset++] = y;
        offset += 1;  // skip the color
        colorData[colorOffset++] = r * 255;
        colorData[colorOffset++] = g * 255;
        colorData[colorOffset++] = b * 255;
        colorOffset += 9;  // skip extra byte and the position
    };

    const innerColor = [1, 1, 1];
    const outerColor = [0.1, 0.1, 0.1];

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
        addVertex(c1 * radius, s1 * radius, ...outerColor);
        addVertex(c2 * radius, s2 * radius, ...outerColor);
        addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);

        // second triangle
        addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
        addVertex(c2 * radius, s2 * radius, ...outerColor);
        addVertex(c2 * innerRadius, s2 * innerRadius, ...innerColor);
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

            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec4f
            }

            @vertex fn vs(
                @location(0) position: vec2f,
                @location(1) color: vec4f,
                @location(2) offset: vec2f,
                @location(3) scale: vec2f,
                @location(4) perVertexColor: vec3f
            ) -> VSOutput {

                var vsOut: VSOutput;

                //⭐ vert.position 直接就代表当前顶点的位置了，不用加 vertex_index 了
                vsOut.position = vec4f(position * scale + offset, 0.0, 1.0);
                vsOut.color = color * vec4f(perVertexColor, 1);
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
            module,
            buffers: [ //⭐ support multiple attributes correspond to vertex buffers
                { // attribute
                    arrayStride: 2 * 4 + 4,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
                        { shaderLocation: 4, offset: 2 * 4, format: 'unorm8x4' } // perVertexColor
                        // unorm 表示u8(uint8)在被着色器使用前需要归一化
                    ]
                },
                {   // [[color1*4][offset2*4]][[color1*4][offset2*4]]...
                    arrayStride: 3 * 4,
                    stepMode: 'instance', //⭐  这里表示每个instance提供一个属性，instance里面的顶点的属性是相同的
                    attributes: [ //⭐ 这里定义多个attribute，表示将多个vertex属性，交织在一个vertex buffer里面
                        { shaderLocation: 1, offset: 0, format: 'unorm8x4' }, // color
                        { shaderLocation: 2, offset: 4, format: 'float32x2' } // offset
                    ]
                },
                {
                    arrayStride: 2 * 4, // 2 floats, 4 bytes each
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 3, offset: 0, format: 'float32x2' } //scale
                    ]
                }
            ]
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
        4 * 1 + // color is 4 uint8 floats (4bytes each)
        2 * 4;  // offset is 2 32bit floats 

    const changingUnitSize =
        2 * 4;  // scale is 2 32bit floats (4bytes each)

    const staticVertexBufferSize = staticUnitSize * kNumObjects;
    const changingVertexBufferSize = changingUnitSize * kNumObjects;

    const staticVertexBuffer = device.createBuffer({
        label: 'static vertex for objects',
        size: staticVertexBufferSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    const changingVertexBuffer = device.createBuffer({
        label: 'changing vertex for objects',
        size: changingVertexBufferSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const kColorOffset = 0;
    const kOffsetOffset = 1;
    const kScaleOffset = 0;

    {
        const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
        const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);
        for (let i = 0; i < kNumObjects; ++i) {

            const staticOffsetU8 = i * staticUnitSize;
            const staticOffsetF32 = staticOffsetU8 / 4;

            staticVertexValuesU8.set(        // set the color
                [rand() * 255, rand() * 255, rand() * 255, 255],
                staticOffsetU8 + kColorOffset);

            staticVertexValuesF32.set(      // set the offset
                [rand(-0.9, 0.9), rand(-0.9, 0.9)],
                staticOffsetF32 + kOffsetOffset);

            objectInfos.push({
                scale: rand(0.2, 0.5)
            });
        }
        device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
    }

    const vertexValues = new Float32Array(changingVertexBufferSize / 4);

    const { vertexData, numVertices } = createCircleVertices({
        radius: 0.5,
        innerRadius: 0.25
    });

    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertexData);

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

        pass.setVertexBuffer(0, vertexBuffer); // ⭐ set Vertex buffer, 0: location(0)
        pass.setVertexBuffer(1, staticVertexBuffer); // ⭐ set Vertex buffer, 0: location(0)
        pass.setVertexBuffer(2, changingVertexBuffer); // ⭐ set Vertex buffer, 0: location(0)

        const aspect = canvas.width / canvas.height;

        objectInfos.forEach(({ scale }, ndx) => {
            const offset = ndx * (changingUnitSize / 4);
            vertexValues.set([scale / aspect, scale], offset + kScaleOffset);
        });
        device.queue.writeBuffer(changingVertexBuffer, 0, vertexValues);

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