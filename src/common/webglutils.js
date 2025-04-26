import { vec3 } from "gl-matrix";

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo 
 * @param {object} mesh   
*/
export function drawMesh(gl, programInfo, bufferInfo, mesh) {

    const positionBuffer = bufferInfo.positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.a_position, mesh.verticeSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_position);

    const normalBuffer = bufferInfo.normalBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.a_normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_normal);

    const texcoordBuffer = bufferInfo.texcoordBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.a_texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.a_texcoord);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.nvertices);

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

            vertices.push(...p0);
            normals.push(...p0);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p2);
            normals.push(...p2);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);

            vertices.push(...p3);
            normals.push(...p3);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);

            vertices.push(...p0);
            normals.push(...p0);
            texcoords.push((a0 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p1);
            normals.push(...p1);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b0 + Math.PI / 2) / Math.PI);

            vertices.push(...p2);
            normals.push(...p2);
            texcoords.push((a1 + Math.PI) / (2 * Math.PI), (b1 + Math.PI / 2) / Math.PI);
        }
    }

    return {
        hasIndices: false,
        nvertices: vertices.length / 3,
        verticeSize: 3,
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords)
    }

}