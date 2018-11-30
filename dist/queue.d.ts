/// <reference types="node" />
import { EventEmitter } from 'events';
import { QueueItem, QueueFnType, QueueFnParamsType, QueueItemOptionsType } from './queue-item';
export declare type QueueOptions = {
    concurrentMax?: number;
    queueIntervalMS?: number;
};
export declare class Queue extends EventEmitter {
    private concurrentMax;
    private queueIntervalMS;
    private backlog;
    private active;
    private timerID;
    constructor(options?: QueueOptions);
    private readonly isEmpty;
    private processItem;
    private processQueue;
    private start;
    private stop;
    private status;
    private addToQueue;
    private sliceAmount;
    private removeFromActive;
    private moveToQueue;
    private moveToActive;
    put(fn: QueueFnType, fnParams: QueueFnParamsType, options?: QueueItemOptionsType): QueueItem;
}
