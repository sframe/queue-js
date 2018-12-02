import { QueueItem } from './queue-item';

describe('Queue-Item', () => {
  it('should create a task as a queue item instance.', () => {
    const fn = (): undefined => undefined;
    const queueItem = new QueueItem(fn, [], { retries: 0 });

    const expected = {
      error: null,
      results: null,
      retries: 0,
      status: 'pending',
    };

    expect(queueItem).toMatchObject(expected);
  });

  it('should update its own properties when the run method is called.', (done) => {
    const fn = (p1: string, p2: string): string => `${p1} ${p2}`;
    const queueItem = new QueueItem(fn, ['hello', 'world'], { retries: 0 });

    const expected = {
      error: null,
      results: 'hello world',
      retries: 0,
      status: 'success',
    };

    queueItem.once('complete', (task) => {
      expect(task).toMatchObject(expected);
      done();
    });

    queueItem.run();
  });

  it('should update its own properties when an exception is thrown.', (done) => {
    const SILLY_EXCEPTION = new Error('Never works!');

    const fn = (): void => {
      throw SILLY_EXCEPTION;
    };

    const queueItem = new QueueItem(fn, [], { retries: 0 });

    const expected = {
      error: SILLY_EXCEPTION,
      results: null,
      retries: 0,
      status: 'failed',
    };

    queueItem.once('complete', (task) => {
      expect(task).toMatchObject(expected);
      done();
    });

    queueItem.run();
  });
});
