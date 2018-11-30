"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const DONE_STATUSES = ['Failed', 'Success'];
class QueueItem extends events_1.EventEmitter {
    constructor(fn, fnParams, options = {}) {
        super();
        this.error = null;
        this.results = null;
        this.status = 'Pending';
        const { retries = 0 } = options;
        this.fn = fn;
        this.fnParams = fnParams;
        this.retries = retries;
    }
    complete() {
        this.emit('done', this);
        return this;
    }
    get done() {
        const isDone = DONE_STATUSES.includes(this.status);
        return isDone;
    }
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setError(null).setStatus('Pending');
            try {
                this.results = yield this.fn(...this.fnParams);
                return this.setStatus('Success').complete();
            }
            catch (err) {
                this.setError(err);
                if (this.retries > 0) {
                    return this.setStatus('Retry');
                }
                return this.setStatus('Failed').complete();
            }
        });
    }
    setError(e) {
        this.error = e;
        return this;
    }
    setStatus(status) {
        this.status = status;
        return this;
    }
    tick() {
        this.retries = Math.max(this.retries - 1, 0);
        return this;
    }
    run() {
        if (this.done) {
            return Promise.resolve(this);
        }
        return this.tick().exec();
    }
}
exports.QueueItem = QueueItem;
//# sourceMappingURL=queue-item.js.map