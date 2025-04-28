import { vec3, mat3, mat4, vec4 } from "gl-matrix";
import lineVertSource from './line.vert'
import lineFragSource from './line.frag'

/**
 * @param {WebGLRenderingContext} gl 
*/
export function createLineProgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, lineVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, lineFragSource);
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
        a_color: gl.getAttribLocation(program, 'a_color'),

        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx')
    };
}

export function meshBindBuffer(gl, mesh, bufferInfo = {
    positionBuffer: gl.createBuffer(),
    normalBuffer: gl.createBuffer(),
    texcoordBuffer: gl.createBuffer()
}) {
    mesh.bufferInfo = bufferInfo;
    const positionBuffer = bufferInfo.positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

    const normalBuffer = bufferInfo.normalBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const texcoordBuffer = bufferInfo.texcoordBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);
}

export function lineBindBuffer(gl, line, bufferInfo = {
    positionBuffer: gl.createBuffer(),
    colorBuffer: gl.createBuffer()
}) {
    line.bufferInfo = bufferInfo;
    const positionBuffer = bufferInfo.positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line.vertices, gl.STATIC_DRAW);

    const colorBuffer = bufferInfo.colorBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line.colors, gl.STATIC_DRAW);
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo 
 * @param {object} mesh   
*/
export function drawMesh(gl, programInfo, mesh) {

    if (programInfo.a_position >= 0) {
        const positionBuffer = mesh.bufferInfo.positionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(programInfo.a_position, mesh.verticeSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_position);
    }

    if (programInfo.a_normal >= 0) {
        const normalBuffer = mesh.bufferInfo.normalBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        // gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(programInfo.a_normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_normal);
    }

    if (programInfo.a_texcoord >= 0) {
        const texcoordBuffer = mesh.bufferInfo.texcoordBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        // gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);
        gl.vertexAttribPointer(programInfo.a_texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_texcoord);
    }

    gl.drawArrays(gl.TRIANGLES, 0, mesh.nvertices);

}

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} programInfo
 * @param {object} line   
*/
export function drawLine(gl, programInfo, line) {

    if (programInfo.a_position >= 0) {
        const positionBuffer = line.bufferInfo.positionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.a_position, line.verticeSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_position);
    }

    if (programInfo.a_color >= 0) {
        const colorBuffer = line.bufferInfo.colorBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(programInfo.a_color, line.colorSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_color);
    }

    gl.drawArrays(gl.LINES, 0, line.nvertices);

}

/**
 * @param {WebGL2RenderingContext} gl 
 * 
*/
export function createChessBoardTexture(gl, height, width, c0, c1) {

    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment); // 解决这个错误 WebGL: INVALID_OPERATION: texImage2D: ArrayBufferView not big enough for request

    const array = [];
    let c = c0;
    for (let i = 0; i < height; ++i) {
        if (i % 2 == 0) { c = c0; }
        if (i % 2 == 1) { c = c1; }
        else if (c === c1) { c = c0; }
        for (let j = 0; j < width; ++j) {
            array.push(c);
            if (c === c0) { c = c1; }
            else if (c === c1) { c = c0; }
        }
    }
    return {
        data: new Uint8Array(array),
        height: height,
        width: width,
        type: gl.UNSIGNED_BYTE,
        internalFormat: gl.LUMINANCE,
        format: gl.LUMINANCE
    };
}

function caculateRectangleNormal(p0, p1, p2) {
    const vp0 = vec3.fromValues(p0[0], p0[1], p0[2]);
    const vp1 = vec3.fromValues(p1[0], p1[1], p1[2]);
    const vp2 = vec3.fromValues(p2[0], p2[1], p2[2]);
    const v1 = vec3.subtract(vec3.create(), vp1, vp0);
    const v2 = vec3.subtract(vec3.create(), vp2, vp0);
    const n = vec3.cross(vec3.create(), v1, v2);
    const nn = vec3.normalize(vec3.create(), n);
    return nn;
}

export function createRectangle(gl, p0 = [-1, -1, 0], p1 = [1, 1, 1]) {

    const a0 = p0;
    const a1 = [p1[0], p0[1], p0[2]];
    const a2 = p1;
    const a3 = [p0[0], p1[1], p1[2]];

    const vertices = [
        ...a0,
        ...a2,
        ...a3,
        ...a0,
        ...a1,
        ...a2
    ];

    const v0 = caculateRectangleNormal(a0, a2, a3);
    const v1 = caculateRectangleNormal(a0, a1, a2);


    const normals = [
        ...v0,
        ...v0,
        ...v0,
        ...v1,
        ...v1,
        ...v1
    ];

    const texcoords = [
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1
    ]

    return {
        hasIndices: false,
        nvertices: 6,
        verticeSize: 3,
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords)
    }


}

function pointOnSphere(r, a, b) {
    const x = r * Math.sin(b) * Math.cos(a);
    const y = r * Math.sin(b) * Math.sin(a);
    const z = r * Math.cos(b);
    return [x, y, z];
}

function pointTranslate(p, dx, dy, dz) {
    return [p[0] + dx, p[1] + dy, p[2] + dz];
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {number} radius  
*/
export function createSphere(gl, radius = 1, xseg = 10, yseg = 10, center = [0, 0, 0]) {

    const vertices = [];
    const normals = [];
    const texcoords = [];

    const alpha = 2 * Math.PI / xseg;
    const beta = Math.PI / yseg;

    for (let i = 0; i < xseg; ++i) {
        for (let j = 0; j < yseg; ++j) {
            const a0 = -Math.PI + i * alpha;
            const a1 = -Math.PI + (i + 1) * alpha;
            const b0 = -Math.PI / 2 + j * beta;
            const b1 = -Math.PI / 2 + (j + 1) * beta;

            const p0 = pointTranslate(pointOnSphere(radius, a0, Math.PI / 2 - b0), center[0], center[1], center[2]);
            const p1 = pointTranslate(pointOnSphere(radius, a1, Math.PI / 2 - b0), center[0], center[1], center[2]);
            const p2 = pointTranslate(pointOnSphere(radius, a1, Math.PI / 2 - b1), center[0], center[1], center[2]);
            const p3 = pointTranslate(pointOnSphere(radius, a0, Math.PI / 2 - b1), center[0], center[1], center[2]);

            const nv0 = vec3.subtract(vec3.create(), vec3.fromValues(...p0), vec3.fromValues(...center));
            const nv1 = vec3.subtract(vec3.create(), vec3.fromValues(...p1), vec3.fromValues(...center));
            const nv2 = vec3.subtract(vec3.create(), vec3.fromValues(...p2), vec3.fromValues(...center));
            const nv3 = vec3.subtract(vec3.create(), vec3.fromValues(...p3), vec3.fromValues(...center));

            vertices.push(...p0);
            normals.push(...nv0);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p2);
            normals.push(...nv2);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);

            vertices.push(...p3);
            normals.push(...nv3);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);

            vertices.push(...p0);
            normals.push(...nv0);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p1);
            normals.push(...nv1);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p2);
            normals.push(...nv2);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);
        }
    }

    return {
        type: gl.TRIANGLES,
        hasIndices: false,
        nvertices: vertices.length / 3,
        verticeSize: 3,
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords)
    }

}

/**
 * 创建一个旋转矩阵，将from向量旋转到to向量方向
 * @param {vec3} from 源向量
 * @param {vec3} to 目标向量
 * @returns {mat4} 旋转矩阵
 */
function createRotationMatrix(from, to) {
    // 归一化向量
    const vFrom = vec3.normalize(vec3.create(), from);
    const vTo = vec3.normalize(vec3.create(), to);

    // 计算旋转轴
    const axis = vec3.cross(vec3.create(), vFrom, vTo);
    const axisLength = vec3.length(axis);

    // 如果两向量已经平行（同向或反向）
    if (axisLength < 1e-6) {
        const dot = vec3.dot(vFrom, vTo);
        if (dot > 0.9999) {
            // 同方向，返回单位矩阵
            return mat4.create();
        } else {
            // 反方向，需要旋转180度，找一个任意垂直的轴
            let temp = vec3.fromValues(1, 0, 0);
            if (Math.abs(vFrom[0]) > 0.9) {
                temp = vec3.fromValues(0, 1, 0);
            }
            const orthoAxis = vec3.cross(vec3.create(), vFrom, temp);
            vec3.normalize(orthoAxis, orthoAxis);

            const out = mat4.create();
            mat4.rotate(out, out, Math.PI, orthoAxis);
            return out;
        }
    }

    // 正常情况
    vec3.normalize(axis, axis);

    // 计算角度
    const angle = Math.acos(Math.min(Math.max(vec3.dot(vFrom, vTo), -1.0), 1.0));

    // 构造旋转矩阵
    const out = mat4.create();
    mat4.rotate(out, out, angle, axis);
    return out;
}

function coneMoveMtx(p0, p1, p2, p3) {

    const vp0 = vec3.fromValues(...p0);
    const vp1 = vec3.fromValues(...p1);
    const vp2 = vec3.fromValues(...p2);
    const vp3 = vec3.fromValues(...p3);

    const v1 = vec3.subtract(vec3.create(), vp1, vp0);
    const v2 = vec3.subtract(vec3.create(), vp3, vp2);
    vec3.normalize(v1, v1);
    vec3.normalize(v2, v2);

    const R = createRotationMatrix(v1, v2);

    const T1 = mat4.translate(mat4.create(), mat4.create(), [-p0[0], -p0[1], -p0[2]])
    const T2 = mat4.translate(mat4.create(), mat4.create(), [p2[0], p2[1], p2[2]]);

    const M = mat4.create();
    mat4.multiply(M, M, T2);
    mat4.multiply(M, M, R);
    mat4.multiply(M, M, T1);

    return M;


}

// p0 顶点
// p1 底点
export function createCone(gl, p0, p1, radius = 1, hseg = 10, vseg = 10) {

    const vp0 = vec3.fromValues(p0[0], p0[1], p0[2]);
    const vp1 = vec3.fromValues(p1[0], p1[1], p1[2]);
    const v = vec3.subtract(vec3.create(), vp0, vp1);
    const h = vec3.length(v);
    console.log(`h: ${h}`);
    const p2 = [0, 0, 0];
    const p3 = [0, 0, h];
    const M = coneMoveMtx(p2, p3, p0, p1);
    const cone = createConeAtOrigin(gl, radius, h, hseg, vseg);

    for (let i = 0; i < cone.nvertices; ++i) {

        const x = cone.vertices[i * 3];
        const y = cone.vertices[i * 3 + 1];
        const z = cone.vertices[i * 3 + 2];
        const vc = vec4.fromValues(x, y, z, 1);
        const tvc = vec4.transformMat4(vec4.create(), vc, M);
        cone.vertices[i * 3] = tvc[0];
        cone.vertices[i * 3 + 1] = tvc[1];
        cone.vertices[i * 3 + 2] = tvc[2];

        const nx = cone.normals[i * 3];
        const ny = cone.normals[i * 3 + 1];
        const nz = cone.normals[i * 3 + 2];
        const vn = vec4.fromValues(nx, ny, nz, 0);
        const tvn = vec4.transformMat4(vec4.create(), vn, M)
        const tvn3 = vec3.fromValues(tvn[0], tvn[1], tvn[2]);
        vec3.normalize(tvn3, tvn3);
        cone.normals[i * 3] = tvn[0];
        cone.normals[i * 3 + 1] = tvn[1];
        cone.normals[i * 3 + 2] = tvn[2];

    }

    return cone;

}

function pointAtConeCircle(gl, theta, height, radius) {
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    const z = height;
    return [x, y, z];
}

function normalOnConeAtOrigin(gl, p) {
    let vp = vec3.fromValues(...p);
    let vo = vec3.fromValues(0, 0, 0);
    let v1 = vec3.subtract(vec3.create(), vp, vo);
    let vc = vec3.fromValues(0, 0, p[2]);
    let va = vec3.subtract(vec3.create(), vc, vo);
    let vr = vec3.subtract(vec3.create(), vp, vc);
    let v2 = vec3.cross(vec3.create(), vr, va);
    let n = vec3.cross(vec3.create(), v1, v2);
    if (vec3.dot(n, vr) < 0) {
        vec3.negate(n, n);
    }
    vec3.normalize(n, n);
    return n;
}

export function createConeAtOrigin(gl, radius = 1, height = 1, hseg = 10, vseg = 10) {
    const d_a = Math.PI * 2 / hseg;
    const d_h = height / vseg;
    const positions = [];
    const normals = [];
    const texcoords = [];
    //侧面
    for (let i = 0; i < hseg; ++i) {
        for (let j = 0; j < vseg; ++j) {
            const a0 = d_a * i;
            const a1 = d_a * (i + 1);
            const h0 = d_h * j;
            const h1 = d_h * (j + 1);
            const r0 = (h0 / height) * radius;
            const r1 = (h1 / height) * radius;
            //位置

            const p0 = pointAtConeCircle(gl, a0, h0, r0);
            const p1 = pointAtConeCircle(gl, a1, h0, r0);
            const p2 = pointAtConeCircle(gl, a1, h1, r1);
            const p3 = pointAtConeCircle(gl, a0, h1, r1);
            //法线
            const n2 = normalOnConeAtOrigin(gl, p2);
            const n3 = normalOnConeAtOrigin(gl, p3);
            let n0 = [0, 0, 0];
            let n1 = [0, 0, 0];
            if (h0 == 0) {
                n0 = n3;
                n1 = n2;
            } else {
                n0 = normalOnConeAtOrigin(gl, p0);
                n1 = normalOnConeAtOrigin(gl, p1);
            }

            //坐标
            const c0 = [i * 1.0 / hseg, j * 1.0 / hseg];
            const c1 = [(i + 1) * 1.0 / hseg, j * 1.0 / hseg];
            const c2 = [(i + 1) * 1.0 / hseg, (j + 1) * 1.0 / hseg];
            const c3 = [i * 1.0 / hseg, (j + 1) * 1.0 / hseg];

            positions.push(...p0, ...p2, ...p3);
            positions.push(...p0, ...p1, ...p2);
            normals.push(...n0, ...n2, ...n3);
            normals.push(...n0, ...n1, ...n2);
            texcoords.push(...c0, ...c2, ...c3);
            texcoords.push(...c0, ...c1, ...c2);
        }
    }

    //底面
    for (let i = 0; i < hseg; ++i) {
        const a0 = d_a * i;
        const a1 = d_a * (i + 1);
        const p0 = pointAtConeCircle(gl, a0, height, radius);
        const p1 = pointAtConeCircle(gl, a1, height, radius);
        const p2 = [0, 0, height];
        const n0 = [0, 0, 1];
        const n1 = [0, 0, 1];
        const n2 = [0, 0, 1];
        const c0 = [i * 1.0 / hseg, 0];
        const c1 = [(i + 1) * 1.0 / hseg, 0];
        const c2 = [0, 1];
        positions.push(...p0, ...p1, ...p2);
        normals.push(...n0, ...n1, ...n2);
        texcoords.push(...c0, ...c1, ...c1);
    }

    return {
        type: gl.TRIANGLES,
        hasIndices: false,
        nvertices: positions.length / 3,
        verticeSize: 3,
        vertices: new Float32Array(positions),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords)
    }

}

/**
 * @param {WebGLRenderingContext} gl
 * @param {array} points
 * @param {array} color  
*/
export function createLineMesh(gl, points, color) {

    const nvertices = points.length / 3;
    const colors = [];
    if (color.length / 4 < nvertices) {
        for (let i = 0; i < nvertices; ++i) {
            colors.push(...color.slice(0, 4));
        }
    } else {
        colors.push(...color);
    }

    return {
        type: gl.LINES,
        hasIndices: false,
        nvertices: nvertices,
        verticeSize: 3,
        colorSize: 4,
        vertices: new Float32Array(points),
        colors: new Float32Array(colors),
    }
}