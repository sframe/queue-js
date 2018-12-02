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
const DONE_STATUSES = ['failed', 'success'];
class QueueItem extends events_1.EventEmitter {
    constructor(fn, fnParams, options = {}) {
        super();
        this.privTaskLabel = null;
        this.error = null;
        this.results = null;
        this.status = 'pending';
        const { retries = 0 } = options;
        this.fn = fn;
        this.fnParams = fnParams;
        this.retries = retries;
    }
    complete() {
        DEBUG(`${this} - complete`);
        this.emit('complete', this);
        return this;
    }
    success() {
        this.error = null;
        this.status = 'success';
        DEBUG(`${this} - success`);
        this.emit('success', this);
        return this.complete();
    }
    retry() {
        this.status = 'retry';
        this.retries = Math.max(this.retries - 1, 0);
        DEBUG(`${this} - retry: ${this.retries}`);
        this.emit('retry', this);
        return this;
    }
    fail() {
        this.status = 'failed';
        DEBUG(`${this} - fail`);
        this.emit('fail', this);
        return this.complete();
    }
    get taskLabel() {
        return this.privTaskLabel;
    }
    set taskLabel(taskLabel) {
        if (this.privTaskLabel === null) {
            this.privTaskLabel = taskLabel;
        }
    }
    toString() {
        if (this.taskLabel === null) {
            return '(anonymous)';
        }
        return `Task: ${this.taskLabel}`;
    }
    isDone() {
        return DONE_STATUSES.includes(this.status);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isDone()) {
                return this;
            }
            try {
                this.results = yield this.fn(...this.fnParams);
            }
            catch (error) {
                this.error = error;
                if (this.retries > 0) {
                    return this.retry();
                }
                return this.fail();
            }
            return this.success();
        });
    }
}
exports.QueueItem = QueueItem;
//# sourceMappingURL=queue-item.js.map