"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const DEBUG = debug_1.default('queue:queue-item');
exports.TASK_DONE_STATUSES = ['failed', 'success'];
exports.TASK_TODO_STATUSES = ['added', 'ready'];
class Task extends events_1.EventEmitter {
    constructor(fn, fnParams, options) {
        super();
        this.backOffCount = 0;
        this.backOffMaxMS = 64000;
        this.delayMS = 0;
        this.error = null;
        this.results = null;
        this.status = null;
        const { retries = 0, taskLabel = '' } = options;
        this.fn = fn;
        this.fnParams = fnParams;
        this.retries = retries;
        this.taskLabel = taskLabel;
    }
    notify() {
        this.emit('notify', this, this.status);
        return this;
    }
    errors(error) {
        this.error = error;
        this.emit('errors', this);
        return this;
    }
    reschedule() {
        const calcMS = Math.pow(2, this.backOffCount) * 1000;
        const randomMS = Math.floor(Math.random() * 1000) + 1;
        this.delayMS = Math.min(calcMS, this.backOffMaxMS) + randomMS;
        this.backOffCount += 1;
        DEBUG(`rescheduling "${this}" -> delay: ${this.delayMS}MS`);
        setTimeout(() => this.setStatus('ready'), this.delayMS);
    }
    setLabel(label) {
        if (!this.taskLabel) {
            this.taskLabel = label;
        }
        return this;
    }
    setStatus(statusValue) {
        this.status = statusValue;
        this.notify();
        return this;
    }
    added() {
        if (this.status === null) {
            this.setStatus('added');
        }
        return this;
    }
    toString() {
        if (this.taskLabel) {
            return this.taskLabel;
        }
        return this.constructor.name;
    }
    isDone() {
        return exports.TASK_DONE_STATUSES.includes(this.status);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isDone()) {
                return this;
            }
            this.setStatus('running');
            try {
                this.results = yield this.fn(...this.fnParams);
            }
            catch (error) {
                this.errors(error);
                if (this.retries > 0) {
                    this.retries = Math.max(this.retries - 1, 0);
                    this.reschedule();
                    return this.setStatus('retry');
                }
                return this.setStatus('failed');
            }
            this.error = null;
            return this.setStatus('success');
        });
    }
}
exports.Task = Task;
//# sourceMappingURL=task.js.map