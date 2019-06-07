import { EventEmitter } from 'events';

import debug from 'debug';

import { TaskFnParamsType, TaskFnType, Task, TaskOptions, TASK_TODO_STATUSES } from './task';

const DEBUG = debug('queue:queue');

// No fewer than 1 concurrent task
const CONCURRENT_MAX = 1;

export type QueueOptions = {
  concurrentMax?: number;
  queueLabel?: string;
  queueIntervalMS?: number;
};

export class Queue extends EventEmitter {
  private active: Set<Task> = new Set();
  private backlog: Set<Task> = new Set();
  private waiting: Set<Task> = new Set();
  private concurrentMax: number;
  private queueLabel: string;
  private queueCounter = 0;
  private taskCounter = 0;

  constructor(options: QueueOptions = {}) {
    super();

    const { concurrentMax = CONCURRENT_MAX, queueLabel = '' } = options;

    this.concurrentMax = Math.max(concurrentMax, CONCURRENT_MAX);
    this.queueLabel = queueLabel;
  }

  private enqueue(task: Task): Task {
    this.queueCounter += 1;
    task.setLabel(this.getTaskLabel());
    this.listenToTask(task);
    return task.added();
  }

  private getTaskLabel(): string {
    if (this.queueLabel) {
      return `${this.queueLabel} - task_${this.queueCounter}`;
    }

    return `task_${this.queueCounter}`;
  }

  private processQueue(): void {
    for (const task of this.backlog) {
      if (this.taskCounter < this.concurrentMax) {
        if (TASK_TODO_STATUSES.includes(task.status)) {
          this.taskCounter += 1;
          task.run();
        }
      } else {
        break;
      }
    }
  }

  private taskEventResponse(task: Task, taskStatus: string): void {
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

  private listenToTask(task: Task): this {
    task.on('notify', (task, taskEvent) => this.taskEventResponse(task, taskEvent));
    return this;
  }

  public toString() {
    if (this.queueLabel) {
      return this.queueLabel;
    }

    return this.constructor.name;
  }

  public get size(): number {
    return this.active.size + this.backlog.size + this.waiting.size;
  }

  public put(fn: TaskFnType, fnParams: TaskFnParamsType, options: TaskOptions = {}): Task {
    const task = new Task(fn, fnParams, options);
    return this.enqueue(task);
  }
}
