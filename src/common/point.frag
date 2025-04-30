precision mediump float;

varying vec4 v_color;

void main() {

    /*
    点默认绘制为正方形
    gl_PointCoord 为当前片段在点的正方形区域内的坐标
    左下角为0,0
    右上角为1,1
    如下代码实现绘制圆形
    */
    vec2 coord = gl_PointCoord - vec2(0.5); // 中心化
    if(length(coord) > 0.5) {
        discard; // 超出半径，丢弃像素
    }

    gl_FragColor = v_color;

}