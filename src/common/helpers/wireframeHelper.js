import { color01Hex2RGB, color01RGB2Hex } from "../material";

export function createWireframeInfo(wireframe, show, color) {
    return {
        wireframe: wireframe,
        show: show,
        color: color
    };
}

/**
 * @param {HTMLDivElement} root 
*/
export function addWireframeHelper(root, info) {


    const html = `
    
        <table>
            <tr>
                <th>wireframe show: </th>
                <th> <input type="checkbox" id="wireframe-show-input" checked></th>
                <th>wireframe color: </th>
                <th> <input type="color" id="wireframe-color-input"></th>
            </tr>
        </table>

    `;

    root.innerHTML = root.innerHTML + html;
    const showInput = document.getElementById("wireframe-show-input");
    const colorInput = document.getElementById("wireframe-color-input");

    colorInput.value = color01RGB2Hex(info.color.slice(0, 3));
    colorInput.addEventListener("input", (e) => {
        let hex = e.target.value
        const rgb = color01Hex2RGB(hex);
        info.color = [...rgb, 1];
    });

    showInput.checked = info.show;
    showInput.addEventListener('change', (event) => {
        if (event.target.checked) {
            info.show = true;
        } else {
            info.show = false;
        }
    });


}