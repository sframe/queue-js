/// <reference types="node" />
import { EventEmitter } from 'events';
export declare const TASK_DONE_STATUSES: string[];
export declare const TASK_TODO_STATUSES: string[];
export declare type TaskStatus = 'added' | 'failed' | 'ready' | 'retry' | 'running' | 'success';
export declare type TaskFnType = (...params: any[]) => any;
export declare type TaskFnParamsType = any[];
export interface TaskOptions {
    retries?: number;
    taskLabel?: string;
}
export declare class Task extends EventEmitter {
    private backOffCount;
    private backOffMaxMS;
    private fn;
    private fnParams;
    private taskLabel;
    delayMS: number;
    error: Error | null;
    results: any | null;
    retries: number;
    status: TaskStatus;
    constructor(fn: TaskFnType, fnParams: TaskFnParamsType, options: TaskOptions);
    private notify;
    private errors;
    private reschedule;
    setLabel(label: string): this;
    setStatus(statusValue: TaskStatus): this;
    added(): this;
    toString(): string;
    isDone(): boolean;
    run(): Promise<this>;
}
