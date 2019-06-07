/// <reference types="node" />
import { EventEmitter } from 'events';
import { TaskFnParamsType, TaskFnType, Task, TaskOptions } from './task';
export declare type QueueOptions = {
    concurrentMax?: number;
    queueLabel?: string;
    queueIntervalMS?: number;
};
export declare class Queue extends EventEmitter {
    private active;
    private backlog;
    private waiting;
    private concurrentMax;
    private queueLabel;
    private queueCounter;
    private taskCounter;
    constructor(options?: QueueOptions);
    private enqueue;
    private getTaskLabel;
    private processQueue;
    private taskEventResponse;
    private listenToTask;
    toString(): string;
    readonly size: number;
    put(fn: TaskFnType, fnParams: TaskFnParamsType, options?: TaskOptions): Task;
}
