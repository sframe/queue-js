import { Queue } from './queue';

describe('Queue class', () => {
  describe('Basics', () => {
    it('Should process items pushed onto the queue and begin processing', (done) => {
      function fn(...params: string[]) {
        return params.join(' ');
      }

      const queue = new Queue({ concurrentMax: 3 });

      const preStartExpected = [
        {
          error: null,
          results: 'hello world (1)',
          retries: 0,
          status: 'success',
        },
        {
          error: null,
          results: 'hello world (2)',
          retries: 0,
          status: 'success',
        },
        {
          error: null,
          results: 'hello world (3)',
          retries: 0,
          status: 'success',
        },
        {
          error: null,
          results: 'hello world (4)',
          retries: 0,
          status: 'success',
        },
        {
          error: null,
          results: 'hello world (5)',
          retries: 0,
          status: 'success',
        },
      ];

      const tasks = [
        queue.put(fn, ['hello', 'world', '(1)'], { retries: 0 }),
        queue.put(fn, ['hello', 'world', '(2)'], { retries: 0 }),
        queue.put(fn, ['hello', 'world', '(3)'], { retries: 0 }),
        queue.put(fn, ['hello', 'world', '(4)'], { retries: 0 }),
        queue.put(fn, ['hello', 'world', '(5)'], { retries: 0 }),
      ];

      queue.once('empty', () => {
        expect(tasks).toMatchObject(preStartExpected);
        done();
      });
    });

    it('should fail gracefully and not raise errors outside the queue', (done) => {
      const SILLY_EXCEPTION = new Error('Bad');

      function badFunction() {
        throw SILLY_EXCEPTION;
      }

      const expected = {
        error: SILLY_EXCEPTION,
        results: null,
        retries: 0,
        status: 'failed',
      };

      const queue = new Queue({ concurrentMax: 1 });
      const task = queue.put(badFunction, [], { retries: 0 });

      queue.once('empty', () => {
        expect(task).toMatchObject(expected);
        done();
      });
    });

    it('should fail gracefully and not raise errors outside the queue, with callbacks', (done) => {
      const SILLY_EXCEPTION = new Error('Bad');

      function badFunction() {
        throw SILLY_EXCEPTION;
      }

      function goodFunction(callback: Function) {
        return callback();
      }

      const expected = {
        error: SILLY_EXCEPTION,
        results: null,
        retries: 0,
        status: 'failed',
      };

      const queue = new Queue({ concurrentMax: 1 });
      const task = queue.put(goodFunction, [badFunction], { retries: 0 });

      queue.once('empty', () => {
        expect(task).toMatchObject(expected);
        done();
      });
    });

    it('should fail gracefully and not raise errors outside the queue, with promises', (done) => {
      const SILLY_EXCEPTION = new Error('Bad');

      async function badPromise(): Promise<void> {
        throw SILLY_EXCEPTION;
      }

      async function goodPromise(promise: Function): Promise<void> {
        return promise();
      }

      const expected = {
        error: SILLY_EXCEPTION,
        results: null,
        retries: 0,
        status: 'failed',
      };

      const queue = new Queue({ concurrentMax: 1 });
      const task = queue.put(goodPromise, [badPromise], { retries: 0 });

      queue.once('empty', () => {
        expect(task).toMatchObject(expected);
        done();
      });
    });
  });

  describe('Exponential backoff', () => {
    const magicObj = {
      isReady: false,
      readyTimeMS: 5000,
      called: 0,

      // This magic object emulates a finicky "black box" scenario and will
      // stop throwing an error after a small amount of time; and the timer will
      // only start after the method `readyStatus` is first invoked.
      readyStatus(): boolean {
        this.called += 1;

        if (this.called === 1) {
          setTimeout(() => (this.isReady = true), this.readyTimeMS);
        }

        if (!this.isReady) {
          throw new Error('Needs more time!');
        }

        return true;
      },
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should honor the delay on a task when retrying', (done) => {
      const readyStatusSpy = jest.spyOn(magicObj, 'readyStatus');
      const queue = new Queue({ concurrentMax: 1 });

      const expected = {
        error: null,
        results: true,
        retries: 1,
        status: 'success',
      };

      queue.on('task', (task, taskStatus) => {
        switch (taskStatus) {
          case 'added':
          case 'ready':
          case 'running':
            break;

          case 'retry':
            jest.advanceTimersByTime(task.delayMS);
            break;

          case 'failed':
            done(task.error);
            break;

          case 'success':
            expect(task).toMatchObject(expected);
            expect(readyStatusSpy).toBeCalledTimes(4);

            jest.clearAllTimers();
            done();
            break;
        }
      });

      queue.put(() => magicObj.readyStatus(), [], { retries: 4 });
    });
  });
});
