import "./helper.css"

export function createHelperDiv(id, innerHtml = "") {
    const container = document.createElement('div');
    container.id = id;
    container.className = "cls-helper-div";
    container.style = "border: 1px solid black; padding: 10px;"
    container.innerHTML = innerHtml;
    return container;
}