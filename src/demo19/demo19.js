import { mat4 } from "gl-matrix";
import Camera, { CameraMouseControl } from "../common/camera";
import { createLineMesh, createLineProgram, drawLine, lineBindBuffer } from "../common/webglutils";
import "./demo19.css";
import flowLineVertSource from './flowline.vert';
import flowLineFragSource from './flowline.frag';
import roadsGeoJson from './roads.geojson'

let width = 1000;
let height = 500;

function main() {
    const canvas = document.getElementById("demo19-canvas");
    if (canvas !== null) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        height = canvas.height;
        width = canvas.width;
        const gl = canvas.getContext("webgl");
        window.addEventListener('resize', () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            height = canvas.height;
            width = canvas.width;
            gl.viewport(0, 0, width, height);
        })
        draw(gl, canvas);
    } else {
        console.log("demo19 canvas is null");
    }
}

function calFlowLineWeight(flowLinePositions) {
    const nvertices = flowLinePositions.length / 3;
    let totlength = 0;
    let weights = [];
    weights.push(0);
    for (let i = 1; i < nvertices; ++i) {
        let x0 = flowLinePositions[(i - 1) * 3];
        let y0 = flowLinePositions[(i - 1) * 3 + 1];
        let z0 = flowLinePositions[(i - 1) * 3 + 2];
        let x1 = flowLinePositions[i * 3];
        let y1 = flowLinePositions[i * 3 + 1];
        let z1 = flowLinePositions[i * 3 + 2];
        let a = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2) + Math.pow(z1 - z0, 2));
        totlength += a;
        weights.push(totlength);
    }
    weights = weights.map(w => w * 1.0 / totlength);
    return new Float32Array(weights);
}

function parseRoadsGeoJson2Mesh() {
    console.log(roadsGeoJson);
    const lines = [];
    const points = [];
    const features = roadsGeoJson.features;
    for (let feature of features) {
        const geometry = feature.geometry;
        const type = geometry.type;
        if (type === 'MultiLineString') {
            for (let line of geometry.coordinates) {
                const line3d = [];
                for (let p of line) {
                    points.push(p);
                    line3d.push(...p, 0);
                }
                lines.push(line3d);
            }
        }
    }
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);
    const ymin = Math.min(...ys);
    const ymax = Math.max(...ys);
    const meshes = lines.map(line => {

        const positions = new Float32Array(line);
        const nvertices = positions.length / 3;
        const basecolors = [];
        const color = [Math.random(), Math.random(), Math.random(), 1.0];
        for (let i = 0; i < nvertices; ++i) {
            basecolors.push(...color);
        }
        const weights = calFlowLineWeight(positions);

        return {
            timeoffset: Math.random() * 10000, //每条线加个随机的时间偏移，防止流光过于同步
            positions: positions,
            nvertices: nvertices,
            basecolors: new Float32Array(basecolors),
            weights: weights
        };

    });

    return {
        lines: meshes,
        aabb: [xmin, ymin, xmax, ymax]
    };
}

function flowLineBindBuffer(gl, line) {
    line.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, line.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line.positions, gl.STATIC_DRAW);

    line.basecolorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, line.basecolorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line.basecolors, gl.STATIC_DRAW);

    line.weightBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, line.weightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line.weights, gl.STATIC_DRAW);
}

function drawFlowLine(gl, programInfo, line) {
    gl.bindBuffer(gl.ARRAY_BUFFER, line.positionBuffer);
    gl.vertexAttribPointer(programInfo.a_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_position);

    gl.bindBuffer(gl.ARRAY_BUFFER, line.basecolorBuffer);
    gl.vertexAttribPointer(programInfo.a_basecolor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_basecolor);

    gl.bindBuffer(gl.ARRAY_BUFFER, line.weightBuffer);
    gl.vertexAttribPointer(programInfo.a_weight, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_weight);

    gl.drawArrays(gl.LINE_STRIP, 0, line.nvertices);
}

function glConfig(gl) {
    /*清理及配置*/
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * @param {WebGLRenderingContext} gl 
*/
export function createFlowLineProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, flowLineVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, flowLineFragSource);
    gl.compileShader(fragShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    if (!program) {
        console.error("program is null");
    }

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program failed to link:', gl.getProgramInfoLog(program));
    }

    return {
        program: program,
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_weight: gl.getAttribLocation(program, 'a_weight'),
        a_basecolor: gl.getAttribLocation(program, 'a_basecolor'),
        a_flowcolor: gl.getAttribLocation(program, 'a_flowcolor'),

        u_currentWeight: gl.getUniformLocation(program, 'u_currentWeight'),
        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx'),
    };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLElement} canvas
*/
async function draw(gl, canvas) {

    glConfig(gl);

    //flowline
    const flowLineProgramInfo = createFlowLineProgram(gl);
    let flowLinesInfo = parseRoadsGeoJson2Mesh();
    let flowLines = flowLinesInfo.lines;

    flowLines = flowLines.map(line => {
        flowLineBindBuffer(gl, line);
        return line;
    })

    //uniform
    const modelMtx = mat4.create();
    const camera = new Camera([12948514.2 + 1500, 4863011.0 + 1500, 1500], [12948514.2, 4863011.0, 0], [0, 0, 1]); // 相机对象
    const mouseControl = new CameraMouseControl(camera, canvas);
    mouseControl.enable();

    // 速度控制
    const speed = 0.0005;

    function dynamicDraw(time) {


        //绘制物体
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let projMtx = mat4.create();
        mat4.perspective(projMtx, Math.PI / 3, width / height, 0.5, 100000);

        //draw flow lines
        gl.useProgram(flowLineProgramInfo.program);

        gl.uniformMatrix4fv(flowLineProgramInfo.u_modelMtx, false, modelMtx);
        gl.uniformMatrix4fv(flowLineProgramInfo.u_viewMtx, false, camera.getMatrix().viewMtx);
        gl.uniformMatrix4fv(flowLineProgramInfo.u_projMtx, false, projMtx);

        for (let line of flowLines) {
            let weight = ((time + line.timeoffset) * speed) % 1.5 - 0.25; //计算权重
            gl.uniform1f(flowLineProgramInfo.u_currentWeight, weight);
            drawFlowLine(gl, flowLineProgramInfo, line);
        }

        requestAnimationFrame(dynamicDraw);
    }

    requestAnimationFrame(dynamicDraw);


}

main();