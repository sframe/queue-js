import { EventEmitter } from 'events';
import debug from 'debug';

const DEBUG = debug('queue:queue-item');

const DONE_STATUSES = ['failed', 'success'];

export type QueueItemStatus = 'failed' | 'pending' | 'retry' | 'success';

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
  private privTaskLabel: string | number | null = null;

  public error: Error | null = null;
  public results: any | null = null;
  public retries: number;
  public status: QueueItemStatus = 'pending';

  constructor(fn: QueueFnType, fnParams: QueueFnParamsType, options: QueueItemOptionsType = {}) {
    super();

    const { retries = 0 } = options;

    this.fn = fn;
    this.fnParams = fnParams;
    this.retries = retries;
  }

  private complete(): this {
    DEBUG(`${this} - complete`);
    this.emit('complete', this);

    return this;
  }

  private success(): this {
    this.error = null;
    this.status = 'success';

    DEBUG(`${this} - success`);
    this.emit('success', this);

    return this.complete();
  }

  private retry(): this {
    this.status = 'retry';
    this.retries = Math.max(this.retries - 1, 0);

    DEBUG(`${this} - retry: ${this.retries}`);
    this.emit('retry', this);

    return this;
  }

  private fail(): this {
    this.status = 'failed';

    DEBUG(`${this} - fail`);
    this.emit('fail', this);

    return this.complete();
  }

  public get taskLabel(): string | number | null {
    return this.privTaskLabel;
  }

  public set taskLabel(taskLabel: string | number) {
    if (this.privTaskLabel === null) {
      this.privTaskLabel = taskLabel;
    }
  }

  public toString(): string {
    if (this.taskLabel === null) {
      return '(anonymous)';
    }

    return `Task: ${this.taskLabel}`;
  }

  public isDone(): boolean {
    return DONE_STATUSES.includes(this.status);
  }

  public async run(): Promise<this> {
    if (this.isDone()) {
      return this;
    }

    try {
      this.results = await this.fn(...this.fnParams);
    } catch (error) {
      this.error = error;

      if (this.retries > 0) {
        return this.retry();
      }

      return this.fail();
    }

    return this.success();
  }
}
