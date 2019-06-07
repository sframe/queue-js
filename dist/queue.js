"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const task_1 = require("./task");
const DEBUG = debug_1.default('queue:queue');
// No fewer than 1 concurrent task
const CONCURRENT_MAX = 1;
class Queue extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.active = new Set();
        this.backlog = new Set();
        this.waiting = new Set();
        this.queueCounter = 0;
        this.taskCounter = 0;
        const { concurrentMax = CONCURRENT_MAX, queueLabel = '' } = options;
        this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
        this.queueLabel = queueLabel;
    }
    enqueue(task) {
        this.queueCounter += 1;
        task.setLabel(this.getTaskLabel());
        this.listenToTask(task);
        return task.added();
    }
    getTaskLabel() {
        if (this.queueLabel) {
            return `${this.queueLabel} - task_${this.queueCounter}`;
        }
        return `task_${this.queueCounter}`;
    }
    processQueue() {
        for (const task of this.backlog) {
            if (this.taskCounter < this.concurrentMax) {
                if (task_1.TASK_TODO_STATUSES.includes(task.status)) {
                    this.taskCounter += 1;
                    task.run();
                }
            }
            else {
                break;
            }
        }
    }
    taskEventResponse(task, taskStatus) {
        switch (taskStatus) {
            case 'added':
                // (new) -> backlog
                DEBUG(`${task} is set to added. Moving to backlog.`);
                this.backlog.add(task);
                break;
            case 'running':
                // backlog -> active
                DEBUG(`${task} is running. Moving from backlog to active.`);
                this.backlog.delete(task);
                this.active.add(task);
                break;
            case 'ready':
                // waiting -> backlog
                DEBUG(`${task} is set to ready. Moving from waiting to backlog.`);
                this.waiting.delete(task);
                this.backlog.add(task);
                break;
            case 'retry':
            case 'failed':
            case 'success':
                // active -> ...?
                if (task.status === 'retry') {
                    DEBUG(`${task} is set to retry. Moving from active to waiting.`);
                    this.waiting.add(task);
                }
                if (task.isDone()) {
                    DEBUG(`${task} is done. Removing from active.`);
                    setTimeout(() => {
                        DEBUG(`${task} was completed. Removing the task listener from ${this}.`);
                        task.removeListener('notify', this.taskEventResponse);
                    }, 500);
                }
                this.taskCounter -= 1;
                this.active.delete(task);
                if (this.taskCounter === 0) {
                    setTimeout(() => {
                        if (this.taskCounter === 0) {
                            this.emit('empty', this);
                        }
                    }, 15);
                }
                break;
        }
        this.emit('task', task, taskStatus);
        this.processQueue();
    }
    listenToTask(task) {
        task.on('notify', (task, taskEvent) => this.taskEventResponse(task, taskEvent));
        return this;
    }
    toString() {
        if (this.queueLabel) {
            return this.queueLabel;
        }
        return this.constructor.name;
    }
    get size() {
        return this.active.size + this.backlog.size + this.waiting.size;
    }
    put(fn, fnParams, options = {}) {
        const task = new task_1.Task(fn, fnParams, options);
        return this.enqueue(task);
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map