export function color01Hex2RGB(hex) {
    // 去掉开头的 #
    hex = hex.replace(/^#/, '');

    // 解析出 r、g、b
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r / 255.0, g / 255.0, b / 255.0];
}
export function color01RGB2Hex(rgb) {
    return (
        '#' +
        rgb.map(value => {
            const hex = (parseInt(value * 255)).toString(16);  // 转成16进制
            return hex.length === 1 ? '0' + hex : hex; // 补0，比如 'a' 变成 '0a'
        }).join('')
    );
}

export class BlinnPhongMaterial {
    ambient = [];
    diffuse = [];
    specular = [];
    emission = [];
    shininess = [];
};