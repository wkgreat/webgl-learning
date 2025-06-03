export default class Timer {

    currentTime = null;
    multipler = 1;
    running = false;
    onTimeChange = null;

    constructor(millseconds) {
        this.currentTime = millseconds;
    }
    addTime(millseconds) {
        if (this.running) {
            this.currentTime += millseconds * this.multipler;
            this.onTimeChange && this.onTimeChange(this.currentTime);
        }

    }
    subTime(millseconds) {
        if (this.running) {
            this.currentTime -= millseconds * this.multipler;
            this.onTimeChange && this.onTimeChange(this.currentTime);
        }
    }
    getTime() {
        return this.currentTime;
    }
    getDate() {
        return new Date(this.currentTime);
    }
    setMultipler(m) {
        this.multipler = m;
    }
    getMultipler() {
        return this.multipler;
    }
    start() {
        this.running = true;
    }
    stop() {
        this.running = false;
    }
    setOnTimeChange(callback) {
        this.onTimeChange = callback;
    }

}

/**
 * @param {Timer} timer
 * @param {HTMLDivElement} root  
*/
export function addTimeHelper(timer, root) {

    root.innerHTML = `
        <div id="timer-helper-div">
            <label id="time-laber">Current Time: xxxxx</label>
            </br>
            <label>Multipler</label><input id="timer-multipler-input" type="range" value="${timer.getMultipler()}" min="1" max="100000">
            </br>
            <button id="timer-start-button">开始计时器</button>
        </div>
    `

    const timeLabel = document.getElementById("time-laber");
    const multiplerInput = document.getElementById("timer-multipler-input");
    const startButton = document.getElementById("timer-start-button");

    timer.setOnTimeChange((t) => {
        timeLabel.innerText = (new Date(t)).toISOString();
    })

    multiplerInput.value = timer.getMultipler();
    multiplerInput.addEventListener('input', () => {
        timer.setMultipler(multiplerInput.value);
    });

    if (timer.running) {
        startButton.innerText = "🟥停止计时器";
    } else {
        startButton.innerText = "▶️开始计时器";
    }

    startButton.addEventListener('click', () => {
        if (timer.running) {
            timer.stop();
            startButton.innerText = "▶️开始计时器";
        } else {
            timer.start();
            startButton.innerText = "🟥停止计时器";
        }
    });

}