import { Task } from './task';

describe('Task', () => {
  it('should have state before the run method is called', () => {
    function fn(): void {}

    const task = new Task(fn, [], { retries: 0 });

    const expected = {
      error: null,
      results: null,
      retries: 0,
      status: null,
    };

    expect(task).toMatchObject(expected);
  });

  it('should update its own state when successful.', (done) => {
    function fn(p1: string, p2: string): string {
      return `${p1} ${p2}`;
    }

    const task = new Task(fn, ['hello', 'world'], { retries: 0 });

    const expected = {
      error: null,
      results: 'hello world',
      retries: 0,
      status: 'success',
    };

    task.on('notify', (task, taskName) => {
      switch (taskName) {
        case 'success':
          expect(task).toMatchObject(expected);
          done();
          break;

        case 'failed':
          done(`${task} should have been a success`);
          break;
      }
    });

    task.run();
  });

  it('should update its own state when it has failed.', (done) => {
    const SILLY_EXCEPTION = new Error('Never works!');

    function fn(): void {
      throw SILLY_EXCEPTION;
    }

    const expected = {
      error: SILLY_EXCEPTION,
      results: null,
      retries: 0,
      status: 'failed',
    };

    const task = new Task(fn, [], { retries: 0 });

    task.on('notify', (task, taskName) => {
      switch (taskName) {
        case 'failed':
          expect(task).toMatchObject(expected);
          done();
          break;

        case 'retry':
        case 'success':
          done(`${task} should have failed!`);
          break;
      }
    });

    task.run();
  });

  it('should update its own state when it has failed, and should retry.', (done) => {
    const SILLY_EXCEPTION = new Error('Never works!');

    function fn(): void {
      throw SILLY_EXCEPTION;
    }

    const expected = {
      error: SILLY_EXCEPTION,
      results: null,
      retries: 1,
      status: 'retry',
    };

    const task = new Task(fn, [], { retries: 2 });

    task.on('notify', (task, taskName) => {
      switch (taskName) {
        case 'retry':
          expect(task).toMatchObject(expected);
          done();
          break;

        case 'failed':
        case 'success':
          done(`${task} should have failed and been set to retry!`);
          break;
      }
    });

    task.run();
  });
});
