export const EVENT_TIMER_TICK = "timer:tick";

export default class Timer {

    currentTime = null;
    multipler = 1;
    running = false;
    onTimeChange = null;
    lastFrameTime = 0;
    currentFrameTime = 0;

    /**@type {EventBus|null}*/
    eventBus = null;

    constructor(millseconds) {
        this.currentTime = millseconds;
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    tick(frameTime) {
        if (this.running) {
            this.#setCurrentFrameTime(frameTime);
            let dt = Math.trunc((frameTime - this.getLastFrameTime()));
            this.#addTime(dt);
            if (this.eventBus) {
                this.eventBus.fire(EVENT_TIMER_TICK, this);
            } else {
                console.warn("Time eventBus is NULL!");
            }
            this.#setLastFrameTime(this.getCurrentFrameTime());
        }
    }

    #addTime(millseconds) {
        this.currentTime += millseconds * this.multipler;
    }
    #subTime(millseconds) {
        this.currentTime -= millseconds * this.multipler;
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
    #setLastFrameTime(t) {
        this.lastFrameTime = t;
    }
    #setCurrentFrameTime(t) {
        this.currentFrameTime = t;
    }
    getLastFrameTime() {
        return this.lastFrameTime;
    }
    getCurrentFrameTime() {
        return this.currentFrameTime;
    }

}

/**
 * @param {Timer} timer
 * @param {HTMLDivElement} root  
*/
export function addTimeHelper(timer, root) {

    const html = `
        <div id="timer-helper-div">
            <label id="time-laber">Current Time: xxxxx</label>
            </br>
            <label>Multipler</label><input id="timer-multipler-input" type="range" value="${timer.getMultipler()}" min="1" max="100000">
            </br>
            <button id="timer-start-button">开始计时器</button>
        </div>
    `

    root.innerHTML = root.innerHTML + html;

    const timeLabel = document.getElementById("time-laber");
    const multiplerInput = document.getElementById("timer-multipler-input");
    const startButton = document.getElementById("timer-start-button");

    if (timer.eventBus) {
        timer.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (_timer) => {
                timeLabel.innerText = _timer.getDate().toISOString();
            }
        })
    }


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