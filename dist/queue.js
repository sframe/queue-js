"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const queue_item_1 = require("./queue-item");
const DEBUG = debug_1.default('queue:queue');
// No fewer than 1 concurrent task
const CONCURRENT_MAX = 1;
// No less than 15 ms between polling the queue
const QUEUE_INTERVAL_MS = 15;
class Queue extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.active = new Set();
        this.backlog = [];
        this.taskCounter = 0;
        const { concurrentMax = CONCURRENT_MAX, queueIntervalMS = QUEUE_INTERVAL_MS } = options;
        this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
        this.queueIntervalMS = Math.max(queueIntervalMS, QUEUE_INTERVAL_MS);
    }
    get isEmpty() {
        return this.size === 0;
    }
    addToQueue(item) {
        if (!this.backlog.includes(item)) {
            this.backlog.push(item);
            this.status();
        }
        return item;
    }
    moveToActive() {
        const avail = this.sliceAmount();
        const items = this.backlog.splice(0, avail);
        if (items.length) {
            this.active = new Set([...this.active, ...items]);
            this.status();
            return items;
        }
        return [];
    }
    moveToQueue(item) {
        this.active.delete(item);
        this.addToQueue(item);
    }
    processItem(item) {
        if (!item.isDone()) {
            Promise.resolve(item.run()).then(() => {
                if (item.isDone()) {
                    this.removeFromActive(item);
                }
                else {
                    this.moveToQueue(item);
                }
            });
        }
    }
    processQueue() {
        this.moveToActive().map((item) => this.processItem(item));
        if (this.isEmpty) {
            return this.stop();
        }
        return this;
    }
    removeFromActive(item) {
        this.active.delete(item);
        this.status();
    }
    start() {
        if (typeof this.timerID === 'undefined') {
            this.timerID = setInterval(this.processQueue.bind(this), this.queueIntervalMS);
            DEBUG(`queue status: start`);
            this.emit('start', this);
            return this.status();
        }
        return this;
    }
    status() {
        DEBUG(`queue status: backlog: ${this.backlog.length}, active: ${this.active.size}`);
        this.emit('status', this);
        return this;
    }
    stop() {
        const reallyStop = () => {
            if (this.isEmpty) {
                clearTimeout(this.timerID);
                DEBUG('queue status: stop');
                this.emit('stop', this);
            }
        };
        // Delay a tiny bit, just in case a new item was added to the queue
        setTimeout(reallyStop, this.queueIntervalMS);
        return this;
    }
    sliceAmount() {
        if (this.backlog.length) {
            return Math.max(this.concurrentMax - this.active.size, 0);
        }
        return 0;
    }
    getTaskNumber() {
        this.taskCounter += 1;
        return this.taskCounter;
    }
    get size() {
        return this.backlog.length + this.active.size;
    }
    put(fn, fnParams, options = {}) {
        const item = new queue_item_1.QueueItem(fn, fnParams, options);
        item.taskLabel = this.getTaskNumber();
        this.start().addToQueue(item);
        return item;
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map