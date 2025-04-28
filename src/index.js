import './index.css'
import demolist from '../demolist.json'

const optionDiv = document.getElementById('option-div');
const frame = document.getElementById('demo-frame');

function add_demo_button(name, describe) {
    const button = document.createElement(name);
    button.innerHTML = `<button id="${name}-button">${describe}</button>`;
    button.addEventListener('click', () => {
        frame.setAttribute('src', `./${name}.html`);
    });
    optionDiv.appendChild(button);
}

if (optionDiv !== null) {
    demolist.demos.forEach(demo => {
        add_demo_button(demo.name, demo.describe);
    });
}