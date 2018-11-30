import { EventEmitter } from 'events';
const DONE_STATUSES = ['Failed', 'Success'];
export class QueueItem extends EventEmitter {
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
    async exec() {
        this.setError(null).setStatus('Pending');
        try {
            this.results = await this.fn(...this.fnParams);
            return this.setStatus('Success').complete();
        }
        catch (err) {
            this.setError(err);
            if (this.retries > 0) {
                return this.setStatus('Retry');
            }
            return this.setStatus('Failed').complete();
        }
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
