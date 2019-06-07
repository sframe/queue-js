import { EventEmitter } from 'events';

import debug from 'debug';

const DEBUG = debug('queue:queue-item');

export const TASK_DONE_STATUSES = ['failed', 'success'];
export const TASK_TODO_STATUSES = ['added', 'ready'];

export type TaskStatus = 'added' | 'failed' | 'ready' | 'retry' | 'running' | 'success';

export type TaskFnType = (...params: any[]) => any;

export type TaskFnParamsType = any[];

export interface TaskOptions {
  retries?: number;
  taskLabel?: string;
}

export class Task extends EventEmitter {
  private backOffCount = 0;
  private backOffMaxMS = 64000;
  private fn: TaskFnType;
  private fnParams: TaskFnParamsType;
  private taskLabel: string;

  public delayMS = 0;
  public error: Error | null = null;
  public results: any | null = null;
  public retries: number;
  public status: TaskStatus = null;

  constructor(fn: TaskFnType, fnParams: TaskFnParamsType, options: TaskOptions) {
    super();

    const { retries = 0, taskLabel = '' } = options;

    this.fn = fn;
    this.fnParams = fnParams;
    this.retries = retries;
    this.taskLabel = taskLabel;
  }

  private notify(): this {
    this.emit('notify', this, this.status);
    return this;
  }

  private errors(error: Error): this {
    this.error = error;
    this.emit('errors', this);
    return this;
  }

  private reschedule(): void {
    const calcMS = 2 ** this.backOffCount * 1000;
    const randomMS = Math.floor(Math.random() * 1000) + 1;

    this.delayMS = Math.min(calcMS, this.backOffMaxMS) + randomMS;
    this.backOffCount += 1;

    DEBUG(`rescheduling "${this}" -> delay: ${this.delayMS}MS`);

    setTimeout(() => this.setStatus('ready'), this.delayMS);
  }

  public setLabel(label: string): this {
    if (!this.taskLabel) {
      this.taskLabel = label;
    }

    return this;
  }

  public setStatus(statusValue: TaskStatus): this {
    this.status = statusValue;
    this.notify();
    return this;
  }

  public added(): this {
    if (this.status === null) {
      this.setStatus('added');
    }

    return this;
  }

  public toString(): string {
    if (this.taskLabel) {
      return this.taskLabel;
    }

    return this.constructor.name;
  }

  public isDone(): boolean {
    return TASK_DONE_STATUSES.includes(this.status);
  }

  public async run(): Promise<this> {
    if (this.isDone()) {
      return this;
    }

    this.setStatus('running');

    try {
      this.results = await this.fn(...this.fnParams);
    } catch (error) {
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
  }
}
