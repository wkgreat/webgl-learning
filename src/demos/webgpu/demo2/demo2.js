import './styles.css'

let width = 1000;
let height = 500;

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


    const module = device.createShaderModule({
        label: "compute module",
        code: /* wgsl */`
        
            /*
                variable data, type of storage, can read and write
                binding location 0, binding group 0
                storage 对应 storage类型Buffer
                read_write 可读可写
            */
            @group(0) @binding(0) var<storage, read_write> data : array<f32>;

            /* compute shader
                global_invocation_id: compute shader interation number is 3-dimensional
                so id type is vec3u (vec3 (3 values) of uint32)
                workgroup 是一组同时在GPU上执行的线程
                workgroup 内所有线程barrier同步
                workgroup 共享内存
                workgroup 中每个线程都有一个三维局部索引 local_invocation_id
                workgroup_size 定义一个workgroup有多少线程（三维[x,y,z]）
                global_invocation_id 线程在整个调度网格上的全局地址（三维[x,y,z]）
                外部使用dispatchWorkgroups(x,y,z)函数指定有多少个workgroup
            */
            @compute @workgroup_size(1) fn computeSomething(
                @builtin(global_invocation_id) id : vec3u
            ){
                let i = id.x;
                data[i] = data[i] * 2.0;
            }
        `
    })

    const pipeline = device.createComputePipeline({
        lable: "compute pipeline",
        layout: 'auto',
        compute: {
            module
        }
    });

    const input = new Float32Array([1, 3, 5]);

    /**
     * 数据缓冲区 in GPU
     * STORAGE 存储缓冲区，一般数据量比较大，区别于Uniform
     * COPY_SRC 可以作为复制的来源，比如
     *      复制到其他缓冲
     *      复制到其他纹理
     *      从GPU缓冲区读取回CPU
     * COPY_DST 可以作为数据复制的目标，比如
     *      device.queue.writeBuffer 从数据从CPU复制到该缓冲
     *      copyBufferToBuffer() 从其他缓冲复制到该缓冲
     *      copyTextureToBuffer() 从其他纹理复制到该缓冲
    */
    const workBuffer = device.createBuffer({
        lable: "work buffer",
        size: input.byteLength,
        // GPUBufferUsage.STORAGE 对应 compute shader里面的 var<storage,read_write>
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });

    /**
     * ▶️向GPU任务队列提交任务，将CPU中的数据写入指定GPU缓冲
    */
    device.queue.writeBuffer(workBuffer, 0, input);

    /*
        create a buffer on the GPU to get a copy of the results
        MAP_READ 允许JavaScript访问该GPU缓冲去的数据，将该缓冲区映射到CPU内存空间
    */
    const resultBuffer = device.createBuffer({
        label: 'result buffer',
        size: input.byteLength,
        // MAP_READ can map this buffer for reading data
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    /*
        bind group
        layout 设置位shader里面 @group(0) 的 layout
        entries: 
            binding 对应shader里面的binding
            resource 对应的数据资源，比如buffer这里设置的为workbuffer
    */
    const bindGroup = device.createBindGroup({
        label: "bindGroup for work buffer",
        layout: pipeline.getBindGroupLayout(0), // @group(0) in shader
        entries: [
            // binding: 0, @binding(0) in shader
            { binding: 0, resource: { buffer: workBuffer } }
        ]
    });

    //encoder
    const encoder = device.createCommandEncoder({
        lable: "doubling encoder"
    })

    //pass
    const pass = encoder.beginComputePass({
        label: "doubling compute pass"
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup); // 0 对应 @group(0) in shader
    /**
     * 记录执行compute shader的命令
     * 参数 
     *      workgroupsX
     *      或
     *      workgroupsX，workgroupsY，?workgroupsZ
    */
    pass.dispatchWorkgroups(input.length); //外部使用dispatchWorkgroups(x,y,z)函数指定有多少个workgroup
    pass.end();

    // 命令：从workBuffer复制数据至resultBuffer
    encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

    const commandBuffer = encoder.finish();


    // ▶️向GPU提交任务 执行encode记录下来的逻辑，
    device.queue.submit([commandBuffer]);

    // 将resultBuffer中的数据映射回CPU
    await resultBuffer.mapAsync(GPUMapMode.READ);
    // resultBuffer中数据的视图
    const arrayBuffer = resultBuffer.getMappedRange();
    // 获取数据
    const result = new Float32Array(arrayBuffer);

    console.log('input', [...input]);
    console.log('result', [...result]);

    const div = document.getElementById("content-div");
    div.innerHTML = `
        input: [${input.join(",")}]
        <br>
        result: [${result.join(",")}]
    `;

    // unmap后 getMappedRange返回的arrayBuffer不再可用
    resultBuffer.unmap();

}

main();