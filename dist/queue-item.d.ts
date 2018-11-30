/// <reference types="node" />
import { EventEmitter } from 'events';
export declare type QueueItemStatus = 'Pending' | 'Retry' | 'Failed' | 'Success';
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
    error: Error | null;
    results: any | null;
    retries: number;
    status: QueueItemStatus;
    constructor(fn: any, fnParams: any, options?: QueueItemOptionsType);
    private complete;
    readonly done: boolean;
    private exec;
    private setError;
    private setStatus;
    private tick;
    run(): Promise<this>;
}
