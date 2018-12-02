import { EventEmitter } from 'events';

import debug from 'debug';

import { QueueItem, QueueFnType, QueueFnParamsType, QueueItemOptionsType } from './queue-item';

const DEBUG = debug('queue:queue');

// No fewer than 1 concurrent task
const CONCURRENT_MAX = 1;

// No less than 15 ms between polling the queue
const QUEUE_INTERVAL_MS = 15;

export type QueueOptions = {
  concurrentMax?: number;
  queueIntervalMS?: number;
};

export class Queue extends EventEmitter {
  private active: Set<QueueItem> = new Set();
  private backlog: QueueItem[] = [];
  private concurrentMax: number;
  private queueIntervalMS: number;
  private taskCounter = 0;
  private timerID: NodeJS.Timer | undefined;

  constructor(options: QueueOptions = {}) {
    super();

    const { concurrentMax = CONCURRENT_MAX, queueIntervalMS = QUEUE_INTERVAL_MS } = options;

    this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
    this.queueIntervalMS = Math.max(queueIntervalMS, QUEUE_INTERVAL_MS);
  }

  private get isEmpty(): boolean {
    return this.size === 0;
  }

  private addToQueue(item: QueueItem): QueueItem {
    if (!this.backlog.includes(item)) {
      this.backlog.push(item);
      this.status();
    }

    return item;
  }

  private moveToActive(): QueueItem[] {
    const avail = this.sliceAmount();
    const items = this.backlog.splice(0, avail);

    if (items.length) {
      this.active = new Set([...this.active, ...items]);
      this.status();
      return items;
    }

    return [];
  }

  private moveToQueue(item: QueueItem): void {
    this.active.delete(item);
    this.addToQueue(item);
  }

  private processItem(item: QueueItem): void {
    if (!item.isDone()) {
      Promise.resolve(item.run()).then(() => {
        if (item.isDone()) {
          this.removeFromActive(item);
        } else {
          this.moveToQueue(item);
        }
      });
    }
  }

  private processQueue(): this {
    this.moveToActive().map((item) => this.processItem(item));

    if (this.isEmpty) {
      return this.stop();
    }

    return this;
  }

  private removeFromActive(item: QueueItem): void {
    this.active.delete(item);
    this.status();
  }

  private start(): this {
    if (typeof this.timerID === 'undefined') {
      this.timerID = setInterval(this.processQueue.bind(this), this.queueIntervalMS);

      DEBUG(`queue status: start`);
      this.emit('start', this);

      return this.status();
    }

    return this;
  }

  private status(): this {
    DEBUG(`queue status: backlog: ${this.backlog.length}, active: ${this.active.size}`);
    this.emit('status', this);

    return this;
  }

  private stop(): this {
    const reallyStop = () => {
      if (this.isEmpty) {
        clearTimeout(this.timerID as NodeJS.Timer);

        DEBUG('queue status: stop');
        this.emit('stop', this);
      }
    };

    // Delay a tiny bit, just in case a new item was added to the queue
    setTimeout(reallyStop, this.queueIntervalMS);

    return this;
  }

  private sliceAmount(): number {
    if (this.backlog.length) {
      return Math.max(this.concurrentMax - this.active.size, 0);
    }

    return 0;
  }

  private getTaskNumber(): number {
    this.taskCounter += 1;
    return this.taskCounter;
  }

  public get size(): number {
    return this.backlog.length + this.active.size;
  }

  public put(
    fn: QueueFnType,
    fnParams: QueueFnParamsType,
    options: QueueItemOptionsType = {},
  ): QueueItem {
    const item = new QueueItem(fn, fnParams, options);
    item.taskLabel = this.getTaskNumber();
    this.start().addToQueue(item);
    return item;
  }
}
