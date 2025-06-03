import pointCloudVertSource from './pointcloud.vert'
import pointCloudFragSource from './pointcloud.frag'

export class PointCloud {

    npoints = 0;
    x = [];
    y = [];
    z = [];
    r = [];
    g = [];
    b = [];
    intensity = [];
    return_number = [];
    number_of_returns = [];
    scan_direction_flag = [];
    edge_of_flight_line = [];
    classification = [];
    synthetic = [];
    key_point = [];
    withheld = [];
    scan_angle_rank = [];
    user_data = [];
    point_source_id = [];
    gps_time = [];

    aabb = [];
    center = [];

    async frowCSV(uri) {

        const response = await fetch(uri);
        const text = await response.text();
        const lines = text.split("\n")
        const header = lines[0]
        const columns = header.split(",").map(c => c.trim())
        columns.indexOf("x");
        const colmap = {
            x: columns.indexOf("x"),
            y: columns.indexOf("y"),
            z: columns.indexOf("z"),
            r: columns.indexOf("r"),
            g: columns.indexOf("g"),
            b: columns.indexOf("b"),
            intensity: columns.indexOf("intensity"),
            return_number: columns.indexOf("return_number"),
            number_of_returns: columns.indexOf("number_of_returns"),
            scan_direction_flag: columns.indexOf("scan_direction_flag"),
            edge_of_flight_line: columns.indexOf("edge_of_flight_line"),
            classification: columns.indexOf("classification"),
            synthetic: columns.indexOf("synthetic"),
            key_point: columns.indexOf("key_point"),
            withheld: columns.indexOf("withheld"),
            scan_angle_rank: columns.indexOf("scan_angle_rank"),
            user_data: columns.indexOf("user_data"),
            point_source_id: columns.indexOf("point_source_id"),
            gps_time: columns.indexOf("gps_time")
        }
        this.npoints = lines.length - 1;
        for (let line of lines.slice(1)) {
            const vals = line.split(",").map(v => parseFloat(v));
            if (colmap["x"] !== -1) {
                this.x.push(vals[colmap["x"]]);
            }
            if (colmap["y"] !== -1) {
                this.y.push(vals[colmap["y"]]);
            }
            if (colmap["z"] !== -1) {
                this.z.push(vals[colmap["z"]]);
            }
            if (colmap["r"] !== -1) {
                this.r.push(vals[colmap["r"]]);
            }
            if (colmap["g"] !== -1) {
                this.g.push(vals[colmap["g"]]);
            }
            if (colmap["b"] !== -1) {
                this.b.push(vals[colmap["b"]]);
            }
            if (colmap["intensity"] !== -1) {
                this.intensity.push(vals[colmap["intensity"]]);
            }
            if (colmap["return_number"] !== -1) {
                this.return_number.push(vals[colmap["return_number"]]);
            }
            if (colmap["number_of_returns"] !== -1) {
                this.number_of_returns.push(vals[colmap["number_of_returns"]]);
            }
            if (colmap["scan_direction_flag"] !== -1) {
                this.scan_direction_flag.push(vals[colmap["scan_direction_flag"]]);
            }
            if (colmap["edge_of_flight_line"] !== -1) {
                this.edge_of_flight_line.push(vals[colmap["edge_of_flight_line"]]);
            }
            if (colmap["classification"] !== -1) {
                this.classification.push(vals[colmap["classification"]]);
            }
            if (colmap["synthetic"] !== -1) {
                this.synthetic.push(vals[colmap["synthetic"]]);
            }
            if (colmap["key_point"] !== -1) {
                this.key_point.push(vals[colmap["key_point"]]);
            }
            if (colmap["withheld"] !== -1) {
                this.withheld.push(vals[colmap["withheld"]]);
            }
            if (colmap["scan_angle_rank"] !== -1) {
                this.scan_angle_rank.push(vals[colmap["scan_angle_rank"]]);
            }
            if (colmap["user_data"] !== -1) {
                this.user_data.push(vals[colmap["user_data"]]);
            }
            if (colmap["point_source_id"] !== -1) {
                this.point_source_id.push(vals[colmap["point_source_id"]]);
            }
            if (colmap["gps_time"] !== -1) {
                this.gps_time.push(vals[colmap["gps_time"]]);
            }
        }

        this.aabb.push(Math.min(...this.x), Math.min(...this.y), Math.min(...this.z), Math.max(...this.x), Math.max(...this.y), Math.max(...this.z));
        this.center = [(this.aabb[0] + this.aabb[3]) / 2, (this.aabb[1] + this.aabb[4]) / 2, (this.aabb[2] + this.aabb[5]) / 2];
    }

    /**
     * @typedef {Object} Colormap
     * @property {string} field
     * @property {Object} cmap
     * 
     * @typedef {Object} Sizemap
     * @property {string} field
     * @property {Object} cmap
     * 
     * @typedef {Object} PointCloudMeshType
     * @property {number} npoints
     * @property {array} positions
     * @property {boolean} hasColor
     * @property {array} colors
     * @property {boolean} hasSize
     * @property {array} sizes
     * @property {boolean} hasClass
     * @property {array} classifications
     * @property {array} defaultColor
     * @property {number} defaultSize
     * @property {array} aabb
     * @property {array} center
     * 
     * @param {Colormap} [colormap]
     * @param {Sizemap} [sizemap]
     * @returns {PointCloudMeshType}
    */
    toMesh(colormap, sizemap) {

        const defaultColor = [1.0, 0.0, 0.0, 1.0];
        const defaultSize = 2.0;

        let positions = [];
        let hasColor = false;
        let colors = [];
        let hasClass = false;
        let classifications = this.classification;
        let hasSize = false;
        let sizes = []; //TODO size map


        if (this.r.length === 0 || this.g.length === 0 || this.b.length === 0) {
            hasColor = false;
        } else {
            hasColor = true;
        }
        if (this.classification.length != 0) {
            hasClass = true;
        }

        for (let i = 0; i < this.npoints; ++i) {
            positions.push(this.x[i], this.y[i], this.z[i]);
            if (hasColor) {
                colors.push(this.r[i], this.g[i], this.b[i]);
            }
        }

        if (colormap) {
            colors = [];
            const values = this[colormap.field];
            for (let i = 0; i < this.npoints; ++i) {
                let color = defaultColor;
                if (values[i] in colormap.cmap) {
                    color = colormap.cmap[values[i]];
                }
                colors.push(...color);
            }
            hasColor = true;
        }
        if (sizemap) {
            //TODO 进行尺寸映射
        }

        //TODO other field...

        return {
            npoints: this.npoints,
            positions: positions,
            hasColor: hasColor,
            colors: colors,
            hasSize: hasSize,
            sizes: sizes,
            hasClass: hasClass,
            classifications: classifications,
            defaultColor: defaultColor,
            defaultSize: defaultSize,
            aabb: this.aabb,
            center: this.center
        };
    }
};

/**
 * @param {WebGLRenderingContext} gl 
*/
export function createPointCloudPorgram(gl) {
    /* 创建程序 */
    const program = gl.createProgram();

    /* 程序加载着色器 */
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, pointCloudVertSource);
    gl.compileShader(vertShader);
    gl.attachShader(program, vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, pointCloudFragSource);
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
        a_size: gl.getAttribLocation(program, 'a_size'),
        u_modelMtx: gl.getUniformLocation(program, 'u_modelMtx'),
        u_viewMtx: gl.getUniformLocation(program, 'u_viewMtx'),
        u_projMtx: gl.getUniformLocation(program, 'u_projMtx'),
        u_hasColor: gl.getUniformLocation(program, 'u_hasColor'),
        u_hasSize: gl.getUniformLocation(program, 'u_hasSize'),
        u_defaultColor: gl.getUniformLocation(program, 'u_defaultColor'),
        u_defaultSize: gl.getUniformLocation(program, 'u_defaultSize')
    };
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {PointCloudMeshType} pointCloudMesh  
*/
export function PointCloudSetData(gl, programInfo, pointCloudMesh, bufferInfo = {
    positionBuffer: gl.createBuffer(),
    colorBuffer: gl.createBuffer(),
    sizeBuffer: gl.createBuffer()
}) {

    gl.useProgram(programInfo.program);

    pointCloudMesh.bufferInfo = bufferInfo;

    const positionBuffer = bufferInfo.positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointCloudMesh.positions), gl.STATIC_DRAW);

    if (pointCloudMesh.hasColor) {
        const colorBuffer = bufferInfo.colorBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointCloudMesh.colors), gl.STATIC_DRAW);
        gl.uniform1i(programInfo.u_hasColor, true);
    } else {
        gl.uniform1i(programInfo.u_hasColor, false);
        gl.uniform4fv(programInfo.u_defaultColor, pointCloudMesh.defaultColor);
    }

    if (pointCloudMesh.hasSize) {
        const sizeBuffer = bufferInfo.sizeBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointCloudMesh.sizes), gl.STATIC_DRAW);
        gl.uniform1i(programInfo.u_hasSize, true);
    } else {
        gl.uniform1i(programInfo.u_hasSize, false);
        gl.uniform1f(programInfo.u_defaultSize, pointCloudMesh.defaultSize);
    }

}

/**
 * @param {WebGLRenderingContext} gl
 * @param {object} programInfo
 * @param {object} bufferInfo 
 * @param {object} mesh   
*/
export function drawPointCloud(gl, programInfo, pointcloud) {

    if (programInfo.a_position >= 0) {
        const positionBuffer = pointcloud.bufferInfo.positionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.a_position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_position);
    }

    if (programInfo.a_color >= 0) {
        const colorBuffer = pointcloud.bufferInfo.colorBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(programInfo.a_color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_color);
    }

    if (programInfo.a_size >= 0) {
        const sizeBuffer = pointcloud.bufferInfo.sizeBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.vertexAttribPointer(programInfo.a_size, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.a_size);
    }

    gl.drawArrays(gl.POINTS, 0, pointcloud.npoints); //@TODO @FIXME mac下报错 count不对

}