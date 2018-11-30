import { EventEmitter } from 'events';
import debug from 'debug';

const DEBUG = debug('queue:queue-item');

const DONE_STATUSES = ['Failed', 'Success'];

export type QueueItemStatus = 'Pending' | 'Retry' | 'Failed' | 'Success';

export type QueueFnType = (...params: any[]) => any;

export type QueueFnParamsType = any[];

export type QueueItemOptionsType = {
  retries?: number;
};

export interface QueueItemParams {
  fn: QueueFnType;
  fnParams: QueueFnParamsType;
  options?: QueueItemOptionsType;
}

export class QueueItem extends EventEmitter {
  private fn: QueueFnType;
  private fnParams: QueueFnParamsType;

  public error: Error | null = null;
  public results: any | null = null;
  public retries: number;
  public status: QueueItemStatus = 'Pending';

  constructor(fn, fnParams, options: QueueItemOptionsType = {}) {
    super();

    const { retries = 0 } = options;
    this.fn = fn;
    this.fnParams = fnParams;
    this.retries = retries;
  }

  private complete(): this {
    this.emit('done', this);
    return this;
  }

  public get done(): boolean {
    const isDone = DONE_STATUSES.includes(this.status);
    return isDone;
  }

  private async exec(): Promise<this> {
    this.setError(null).setStatus('Pending');
    try {
      this.results = await this.fn(...this.fnParams);
      return this.setStatus('Success').complete();
    } catch (err) {
      DEBUG(`Error (retries left: ${this.retries}): ${err}`);
      this.setError(err);
      if (this.retries > 0) {
        return this.setStatus('Retry');
      }
      return this.setStatus('Failed').complete();
    }
  }

  private setError(e: Error | null): this {
    this.error = e;
    return this;
  }

  private setStatus(status: QueueItemStatus): this {
    this.status = status;
    return this;
  }

  private tick(): this {
    this.retries = Math.max(this.retries - 1, 0);
    return this;
  }

  public run(): Promise<this> {
    if (this.done) {
      return Promise.resolve(this);
    }
    return this.tick().exec();
  }
}
