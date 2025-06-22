import { createHelperDiv } from "./helper.js";

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

    const id = "timer-helper-div";
    const multiplierLabelId = `multiplier-${crypto.randomUUID()}`;
    const innerHTML = `
        <div>
        <label>计时器:</lable><button id="timer-start-button">开始计时器</button> 
        </br>
        <label>倍速:</label>
        <input id="timer-multipler-input" type="range" value="${timer.getMultipler()}" min="1" max="100000">
        <label id="${multiplierLabelId}"></label></br>
        <label id="time-laber">时间</label>      
        </div>
    `

    const container = createHelperDiv(id, innerHTML);

    root.appendChild(container);

    const multiplierLabel = document.getElementById(multiplierLabelId);
    multiplierLabel.innerHTML = `x${timer.getMultipler()}`;

    const timeLabel = document.getElementById("time-laber");
    const multiplerInput = document.getElementById("timer-multipler-input");
    const startButton = document.getElementById("timer-start-button");

    if (timer.eventBus) {
        timer.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (_timer) => {
                timeLabel.innerText = _timer.getDate().toLocaleString();
            }
        })
    }


    multiplerInput.value = timer.getMultipler();
    multiplerInput.addEventListener('input', () => {
        timer.setMultipler(multiplerInput.value);
        multiplierLabel.innerHTML = `x${multiplerInput.value}`;
    });

    if (timer.running) {
        startButton.innerText = "🟥暂停";
    } else {
        startButton.innerText = "▶️继续";
    }

    startButton.addEventListener('click', () => {
        if (timer.running) {
            timer.stop();
            startButton.innerText = "▶️继续";
        } else {
            timer.start();
            startButton.innerText = "🟥暂停";
        }
    });

}