/// <reference types="node" />
import { EventEmitter } from 'events';
import { QueueItem, QueueFnType, QueueFnParamsType, QueueItemOptionsType } from './queue-item';
export declare type QueueOptions = {
    concurrentMax?: number;
    queueIntervalMS?: number;
};
export declare class Queue extends EventEmitter {
    private active;
    private backlog;
    private concurrentMax;
    private queueIntervalMS;
    private taskCounter;
    private timerID;
    constructor(options?: QueueOptions);
    private readonly isEmpty;
    private addToQueue;
    private moveToActive;
    private moveToQueue;
    private processItem;
    private processQueue;
    private removeFromActive;
    private start;
    private status;
    private stop;
    private sliceAmount;
    private getTaskNumber;
    readonly size: number;
    put(fn: QueueFnType, fnParams: QueueFnParamsType, options?: QueueItemOptionsType): QueueItem;
}
