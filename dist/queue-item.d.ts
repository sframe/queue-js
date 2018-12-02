/// <reference types="node" />
import { EventEmitter } from 'events';
export declare type QueueItemStatus = 'failed' | 'pending' | 'retry' | 'success';
export declare type QueueFnType = (...params: any[]) => any;
export declare type QueueFnParamsType = any[];
export declare type QueueItemOptionsType = {
    retries?: number;
};
export interface QueueItemParams {
    fn: QueueFnType;
    fnParams: QueueFnParamsType;
    options?: QueueItemOptionsType;
}
export declare class QueueItem extends EventEmitter {
    private fn;
    private fnParams;
    private privTaskLabel;
    error: Error | null;
    results: any | null;
    retries: number;
    status: QueueItemStatus;
    constructor(fn: QueueFnType, fnParams: QueueFnParamsType, options?: QueueItemOptionsType);
    private complete;
    private success;
    private retry;
    private fail;
    taskLabel: string | number | null;
    toString(): string;
    isDone(): boolean;
    run(): Promise<this>;
}
