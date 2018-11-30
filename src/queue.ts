import { EventEmitter } from 'events';
import debug from 'debug';

import { QueueItem, QueueFnType, QueueFnParamsType, QueueItemOptionsType } from './queue-item';

const DEBUG = debug('sitemap-script:queue');

const CONCURRENT_MAX = 1; // no fewer than 1
const QUEUE_INTERVAL_MS = 15; // no fewer than 15ms

export type QueueOptions = {
  concurrentMax?: number;
  queueIntervalMS?: number;
};

export class Queue extends EventEmitter {
  private concurrentMax;
  private queueIntervalMS;
  private backlog: QueueItem[] = [];
  private active: Set<QueueItem> = new Set();
  private timerID: NodeJS.Timer | undefined;

  constructor(options: QueueOptions = {}) {
    super();

    const { concurrentMax = CONCURRENT_MAX, queueIntervalMS = QUEUE_INTERVAL_MS } = options;

    this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
    this.queueIntervalMS = Math.max(queueIntervalMS, QUEUE_INTERVAL_MS);
  }

  private get isEmpty(): boolean {
    return this.backlog.length === 0 && this.active.size === 0;
  }

  private processItem(item: QueueItem): void {
    if (!item.done) {
      Promise.resolve(item.run()).then(() => {
        if (item.done) {
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
      this.stop();
    }

    return this;
  }

  private start(): this {
    if (typeof this.timerID === 'undefined') {
      this.timerID = setInterval(this.processQueue.bind(this), this.queueIntervalMS);
      this.emit('start');
      DEBUG(`queue status: start`);
      this.status();
    }
    return this;
  }

  private stop(): this {
    const reallyStop = () => {
      if (this.isEmpty) {
        clearTimeout(this.timerID as NodeJS.Timer);
        this.emit('stop');
        DEBUG('queue status: stop');
      }
    };

    // Delay a tiny bit, just in case a new item was added to the queue
    setTimeout(reallyStop, this.queueIntervalMS);

    return this;
  }

  private status(): this {
    this.emit('status');
    DEBUG(`queue status: backlog: ${this.backlog.length}, active: ${this.active.size}`);
    return this;
  }

  private addToQueue(item: QueueItem): QueueItem {
    if (!this.backlog.includes(item)) {
      this.backlog.push(item);
      this.status();
    }
    return item;
  }

  private sliceAmount(): number {
    if (this.backlog.length) {
      return Math.max(this.concurrentMax - this.active.size, 0);
    }
    return 0;
  }

  private removeFromActive(item): void {
    this.active.delete(item);
    this.status();
  }

  private moveToQueue(item): void {
    this.active.delete(item);
    this.addToQueue(item);
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

  public put(
    fn: QueueFnType,
    fnParams: QueueFnParamsType,
    options?: QueueItemOptionsType,
  ): QueueItem {
    const item = new QueueItem(fn, fnParams, options);
    this.start().addToQueue(item);
    return item;
  }
}
