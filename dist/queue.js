import { EventEmitter } from 'events';
import debug from 'debug';
import { QueueItem } from './queue-item';
const DEBUG = debug('sitemap-script:queue');
const CONCURRENT_MAX = 1; // no fewer than 1
const QUEUE_INTERVAL_MS = 15; // no fewer than 15ms
export class Queue extends EventEmitter {
    constructor(options = {}) {
        super();
        this.backlog = [];
        this.active = new Set();
        const { concurrentMax = CONCURRENT_MAX, queueIntervalMS = QUEUE_INTERVAL_MS } = options;
        this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
        this.queueIntervalMS = Math.max(queueIntervalMS, QUEUE_INTERVAL_MS);
    }
    get isEmpty() {
        return this.backlog.length === 0 && this.active.size === 0;
    }
    processItem(item) {
        if (!item.done) {
            Promise.resolve(item.run()).then(() => {
                if (item.done) {
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
            this.stop();
        }
        return this;
    }
    start() {
        if (typeof this.timerID === 'undefined') {
            this.timerID = setInterval(this.processQueue.bind(this), this.queueIntervalMS);
            this.emit('start');
            DEBUG(`queue status: start`);
            this.status();
        }
        return this;
    }
    stop() {
        const reallyStop = () => {
            if (this.isEmpty) {
                clearTimeout(this.timerID);
                this.emit('stop');
                DEBUG('queue status: stop');
            }
        };
        // Delay a tiny bit, just in case a new item was added to the queue
        setTimeout(reallyStop, this.queueIntervalMS);
        return this;
    }
    status() {
        this.emit('status');
        DEBUG(`queue status: backlog: ${this.backlog.length}, active: ${this.active.size}`);
        return this;
    }
    addToQueue(item) {
        if (!this.backlog.includes(item)) {
            this.backlog.push(item);
            this.status();
        }
        return item;
    }
    sliceAmount() {
        if (this.backlog.length) {
            return Math.max(this.concurrentMax - this.active.size, 0);
        }
        return 0;
    }
    removeFromActive(item) {
        this.active.delete(item);
        this.status();
    }
    moveToQueue(item) {
        this.active.delete(item);
        this.addToQueue(item);
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
    put(fn, fnParams, options) {
        const item = new QueueItem(fn, fnParams, options);
        this.start().addToQueue(item);
        return item;
    }
}
