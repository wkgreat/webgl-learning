import { loadImage } from "./imageutils.js";

/**
 * @property {Array} vertices
 * @property {boolean} hasTexture
 * @property {boolean} hasNormal
 * @property {ObjProvider} provider
 * @property {string} objname
 * @property {string} groupname
 * @property {string} material
*/
export class ObjMesh {
    vertices = [];
    hasTexture = true;
    hasNormal = true;
    provider = null;
    objname = "";
    groupname = "";
    material = "";
    /**
     * @param {ObjProvider} provider
     * @param {string} objname
     * @param {string} groupname
     * @param {string} material
    */
    constructor(provider, objname, groupname, material) {
        this.setObjName(objname);
        this.setGroupName(groupname);
        this.setMaterial(material);
        this.setProvider(provider);
    }
    isEmpty() {
        return !this.vertices.length;
    }
    setProvider(provider) {
        this.provider = provider;;
    }
    setObjName(name) {
        this.objname = name;
    }
    setGroupName(name) {
        this.groupname = name;
    }
    setMaterial(name) {
        this.material = name;
    }
    pushVertex(x, y, z) {
        this.vertices.push(x);
        this.vertices.push(y);
        this.vertices.push(z);
    }
    pushTexCoord(u, v) {
        this.vertices.push(u);
        this.vertices.push(v);
    }
    pushNormal(x, y, z) {
        this.vertices.push(x);
        this.vertices.push(y);
        this.vertices.push(z);
    }

    /**
     * @returns {Image|null}
    */
    getTexture() {
        if (this.provider.mtllib.materialMap[this.material].map_Kd) {
            return this.provider.mtllib.textureMap[this.provider.mtllib.materialMap[this.material].map_Kd].image;
        } else {
            return null;
        }
    }

    /**
     * @returns {ObjMaterial}
    */
    getMaterial() {
        return this.provider.mtllib.materialMap[this.material];
    }
}

export class ObjProvider {

    url = "";
    dir = "";
    metllib = undefined;

    /**
     * @param {string} url 
     */
    constructor(url) {
        this.url = url;
        this.dir = this.url.substring(0, this.url.lastIndexOf("/"));
        console.log(`ObjProvider url: ${this.url}`);
        console.log(`ObjProvider dir: ${this.dir}`);
    }

    async fetchObjVertex() {
        let vs = []
        let vts = []
        let vns = []

        let currentObjName = ""
        let currentGroupName = ""
        let currentMtl = ""
        let meshes = [new ObjMesh(this, currentObjName, currentGroupName, currentMtl)];

        const response = await fetch(this.url);
        const text = await response.text();
        for (let line of text.split("\n")) {
            line = line.trim();
            if (line.startsWith("mtllib ")) {
                const mtlfilename = line.split(/\s+/)[1];
                const mtlfilepath = `${this.dir}/${mtlfilename}`;
                this.mtllib = new ObjMaterialLib(mtlfilepath);
                await this.mtllib.read();
            }
            if (line.startsWith("o ")) {
                currentObjName = line.split(/\s+/)[1];
                meshes.push(new ObjMesh(this, currentObjName, currentGroupName, currentMtl));
            }
            if (line.startsWith("g")) {
                currentGroupName = line.split(/\s+/)[1];
                meshes.push(new ObjMesh(this, currentObjName, currentGroupName, currentMtl));
            }
            if (line.startsWith("usemtl")) {
                currentMtl = line.split(/\s+/)[1];
                meshes.push(new ObjMesh(this, currentObjName, currentGroupName, currentMtl));
            }
            if (line.startsWith("v ")) {
                vs.push(line.split(/\s+/).slice(1).map(v => parseFloat(v)));
            }
            if (line.startsWith("vt ")) {
                vts.push(line.split(/\s+/).slice(1).map(v => parseFloat(v)));
            }
            if (line.startsWith("vn ")) {
                vns.push(line.split(/\s+/).slice(1).map(v => parseFloat(v)));
            }
            if (line.startsWith("f ")) {
                const t = line.split(/\s+/).slice(1).map(v => v.split("/"));

                if (t.length === 3) {
                    //三角形
                    let hasTexture = !!t[0][1];
                    let hasNormal = !!t[0][2];
                    meshes[meshes.length - 1].hasTexture = hasTexture;
                    meshes[meshes.length - 1].hasNormal = hasNormal;

                    const p0 = vs[parseFloat(t[0][0]) - 1];
                    meshes[meshes.length - 1].pushVertex(p0[0], p0[1], p0[2]);
                    if (hasTexture) {
                        const t0 = vts[parseFloat(t[0][1]) - 1];
                        meshes[meshes.length - 1].pushTexCoord(t0[0], t0[1]);
                    } else {
                        meshes[meshes.length - 1].pushTexCoord(0, 0);
                    }
                    if (hasNormal) {
                        const n0 = vns[parseFloat(t[0][2]) - 1];
                        meshes[meshes.length - 1].pushNormal(n0[0], n0[1], n0[2]);
                    } else {
                        meshes[meshes.length - 1].pushNormal(0, 0, 0);
                    }

                    const p1 = vs[parseFloat(t[1][0]) - 1];
                    meshes[meshes.length - 1].pushVertex(p1[0], p1[1], p1[2]);
                    if (hasTexture) {
                        const t1 = vts[parseFloat(t[1][1]) - 1];
                        meshes[meshes.length - 1].pushTexCoord(t1[0], t1[1]);
                    } else {
                        meshes[meshes.length - 1].pushTexCoord(0, 0);
                    }
                    if (hasNormal) {
                        const n1 = vns[parseFloat(t[1][2]) - 1];
                        meshes[meshes.length - 1].pushNormal(n1[0], n1[1], n1[2]);
                    } else {
                        meshes[meshes.length - 1].pushNormal(0, 0, 0);
                    }

                    const p2 = vs[parseFloat(t[2][0]) - 1];
                    meshes[meshes.length - 1].pushVertex(p2[0], p2[1], p2[2]);
                    if (hasTexture) {
                        const t2 = vts[parseFloat(t[2][1]) - 1];
                        meshes[meshes.length - 1].pushTexCoord(t2[0], t2[1]);
                    } else {
                        meshes[meshes.length - 1].pushTexCoord(0, 0);
                    }
                    if (hasNormal) {
                        const n2 = vns[parseFloat(t[2][2]) - 1];
                        meshes[meshes.length - 1].pushNormal(n2[0], n2[1], n2[2]);
                    } else {
                        meshes[meshes.length - 1].pushNormal(0, 0, 0);
                    }

                } else if (t.length === 4) {
                    //四边形
                    //TODO
                    debugger;
                    console.log(line);
                    console.error("待实现");
                } else if (t.length > 4) {
                    console.error("面片节点太多");
                }
            }
        }

        return meshes.filter(mesh => !mesh.isEmpty());

    }
};

class ObjMaterial {
    Ns = 0
    Ka = [0, 0, 0]
    Kd = [0, 0, 0]
    Ks = [0, 0, 0]
    Ke = [0, 0, 0]
    Ni = 0
    d = 0
    illum = 0
    map_refl = ""
    map_Ka = ""
    map_Kd = ""
    constructor(name) {
        this.name = name;
    }
};

export class ObjMaterialLib {
    materialMap = {}
    textureMap = {}
    #textureCnt = 0;
    constructor(url) {
        this.url = url;
        this.dir = this.url.substring(0, this.url.lastIndexOf("/"))
    }
    async read() {
        try {
            const response = await fetch(this.url);
            const text = await response.text();
            const lines = text.split("\n");
            let name = ""
            for (let line of lines) {
                if (line.startsWith("newmtl")) {
                    name = line.split(/\s+/)[1]
                    this.materialMap[name] = new ObjMaterial(name);
                }
                if (line.startsWith("Ns")) {
                    this.materialMap[name].Ns = parseFloat(line.split(/\s+/)[1]);
                }
                if (line.startsWith("Ka")) {
                    this.materialMap[name].Ka = line.split(/\s+/).slice(1).map(f => parseFloat(f));
                }
                if (line.startsWith("Kd")) {
                    this.materialMap[name].Kd = line.split(/\s+/).slice(1).map(f => parseFloat(f));
                }
                if (line.startsWith("Ks")) {
                    this.materialMap[name].Ks = line.split(/\s+/).slice(1).map(f => parseFloat(f));
                }
                if (line.startsWith("Ke")) {
                    this.materialMap[name].Ke = line.split(/\s+/).slice(1).map(f => parseFloat(f));
                }
                if (line.startsWith("Ni")) {
                    this.materialMap[name].Ni = parseFloat(line.split(/\s+/)[1]);
                }
                if (line.startsWith("d")) {
                    this.materialMap[name].d = parseFloat(line.split(/\s+/)[1]);
                }
                if (line.startsWith("illum")) {
                    this.materialMap[name].illum = parseInt(line.split(/\s+/)[1]);
                }
                if (line.startsWith("map_refl")) {
                    const textureName = line.split(/\s+/)[1];
                    this.materialMap[name].map_refl = textureName;
                    if (!(textureName in this.textureMap)) {
                        const texturePath = this.dir + "/" + textureName;
                        const image = await loadImage(texturePath);
                        this.textureMap[textureName] = {
                            id: this.#textureCnt++,
                            image: image
                        };
                    }

                }
                if (line.startsWith("map_Ka")) {
                    const textureName = line.split(/\s+/)[1];
                    this.materialMap[name].map_Ka = textureName;
                    if (!(textureName in this.textureMap)) {
                        const texturePath = this.dir + "/" + textureName;
                        const image = await loadImage(texturePath);
                        this.textureMap[textureName] = {
                            id: this.#textureCnt++,
                            image: image
                        };
                    }
                }
                if (line.startsWith("map_Kd")) {
                    const textureName = line.split(/\s+/)[1];
                    this.materialMap[name].map_Kd = textureName;
                    if (!(textureName in this.textureMap)) {
                        const texturePath = this.dir + "/" + textureName;
                        const image = await loadImage(texturePath);
                        this.textureMap[textureName] = {
                            id: this.#textureCnt++,
                            image: image
                        };
                    }
                }
            }
        } catch (err) {

            console.warn(err);
            this.materialMap = {}
            this.textureMap = {}
            this.#textureCnt = 0;

        }

    }
};