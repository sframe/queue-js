import { Queue } from './queue';

describe('Queue class', () => {
  async function fn(...params: string[]) {
    return params.join(' ');
  }

  it('Should process items pushed onto the queue and begin processing', (done) => {
    const queue = new Queue({ concurrentMax: 2, queueIntervalMS: 15 });
    const trackedQueueItems: any[] = [];

    const preStartExpected = [
      {
        results: 'hello world (1)',
        status: 'Success',
      },
      {
        results: 'hello world (2)',
        status: 'Success',
      },
      {
        results: 'hello world (3)',
        status: 'Success',
      },
      {
        results: 'hello world (4)',
        status: 'Success',
      },
      {
        results: 'hello world (5)',
        status: 'Success',
      },
    ];

    trackedQueueItems.push(queue.put(fn, ['hello', 'world', '(1)']));
    trackedQueueItems.push(queue.put(fn, ['hello', 'world', '(2)']));
    trackedQueueItems.push(queue.put(fn, ['hello', 'world', '(3)']));
    trackedQueueItems.push(queue.put(fn, ['hello', 'world', '(4)']));
    trackedQueueItems.push(queue.put(fn, ['hello', 'world', '(5)']));

    queue.once('stop', () => {
      expect(trackedQueueItems).toMatchObject(preStartExpected);
      done();
    });
  });

  it('should re-invoke function on exception if retries is set.', (done) => {
    let magicProblemCounter = 2;
    function problemFn() {
      if (magicProblemCounter > 0) {
        magicProblemCounter -= 1;
        throw new Error(`Mostly does not work! [ ${magicProblemCounter} ]`);
      }
      return 'Sometimes it works!';
    }

    const queue = new Queue({ queueIntervalMS: 15 });
    const trackedQueueItems: any[] = [];

    const expected = [
      {
        results: 'Sometimes it works!',
        retries: 1,
        status: 'Success',
      },
    ];

    trackedQueueItems.push(queue.put(problemFn, [], { retries: 4 }));

    queue.once('stop', () => {
      expect(trackedQueueItems).toMatchObject(expected);
      done();
    });
  });
});